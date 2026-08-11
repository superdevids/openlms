import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response } from "express";
import type { ApiErrorBody, ErrorCode } from "@opensis/types";
import { REQUEST_ID_HEADER } from "../constants";
import { RequestWithId } from "../middleware/request-id.middleware";

function statusToCode(status: number, fallback: ErrorCode): ErrorCode {
  switch (status) {
    case HttpStatus.BAD_REQUEST:
      return "VALIDATION_ERROR";
    case HttpStatus.UNAUTHORIZED:
      return "UNAUTHORIZED";
    case HttpStatus.FORBIDDEN:
      return "FORBIDDEN";
    case HttpStatus.NOT_FOUND:
      return "NOT_FOUND";
    case HttpStatus.CONFLICT:
      return "CONFLICT";
    case HttpStatus.TOO_MANY_REQUESTS:
      return "RATE_LIMITED";
    default:
      return fallback;
  }
}

/** Kode error yang dibawa eksplisit di body exception (FEATURE_DISABLED, ARCHIVED_YEAR, SERVICE_DEGRADED, dst.). */
const EXPLICIT_CODES = new Set<ErrorCode>([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "FEATURE_DISABLED",
  "ARCHIVED_YEAR",
  "SERVICE_DEGRADED",
  "NOT_FOUND",
  "CONFLICT",
  "RATE_LIMITED",
  "INTERNAL"
]);

/**
 * Filter exception global — format error standar (docs/04 §1.6):
 * { error: { code, message, details, requestId } }
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RequestWithId>();

    const requestId =
      request.requestId ??
      (typeof request.headers?.[REQUEST_ID_HEADER] === "string"
        ? request.headers[REQUEST_ID_HEADER]
        : "req_unknown");

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: ErrorCode = "INTERNAL";
    let message = "Terjadi kesalahan internal";
    let details: ApiErrorBody["error"]["details"];

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === "string") {
        message = body;
        code = statusToCode(status, code);
      } else if (body && typeof body === "object") {
        const b = body as Record<string, unknown>;
        // Kode eksplisit yang dibawa modul (FEATURE_DISABLED, ARCHIVED_YEAR, dsb.)
        // MENERUSKAN kode asli — jangan ratakan 403 → FORBIDDEN (prd04 §1.6).
        // Beberapa guard melempar { error: { code } } — baca keduanya.
        const nested = (b.error as Record<string, unknown> | undefined)?.code;
        const explicitCode = typeof nested === "string" ? nested : b.code;
        if (typeof explicitCode === "string" && EXPLICIT_CODES.has(explicitCode as ErrorCode)) {
          code = explicitCode as ErrorCode;
        } else {
          code = statusToCode(status, code);
        }
        const explicitMessage = (b.error as Record<string, unknown> | undefined)?.message;
        if (typeof explicitMessage === "string") {
          message = explicitMessage;
        } else if (typeof b.message === "string") {
          message = b.message;
        } else if (Array.isArray(b.message)) {
          // BadRequestException dari ValidationPipe
          code = "VALIDATION_ERROR";
          message = "Validasi gagal";
          details = (b.message as unknown[]).map((item) => {
            const text = typeof item === "string" ? item : String(item);
            const sep = text.indexOf(" ");
            return {
              field: sep > 0 ? text.slice(0, sep) : undefined,
              reason: text
            };
          });
        }
      }
    }

    // Error Prisma: mapping ke HTTP yang tepat (sebelumnya race create →
    // P2002 → 500 generik). Pesan GENERIK ke klien — detail query/constraint
    // tidak pernah dibocorkan; detail lengkap dicatat server-side (pino).
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case "P2002":
          status = HttpStatus.CONFLICT;
          code = "CONFLICT";
          message = "Data yang sama sudah tercatat";
          break;
        case "P2025":
          status = HttpStatus.NOT_FOUND;
          code = "NOT_FOUND";
          message = "Data tidak ditemukan";
          break;
        case "P2003":
          status = HttpStatus.CONFLICT;
          code = "CONFLICT";
          message = "Operasi ditolak karena data masih dipakai entitas lain";
          break;
        default:
          // Kode Prisma lain (koneksi, timeout, dst.) → fallback INTERNAL.
          break;
      }
      this.logger.error(
        { requestId, prismaCode: exception.code },
        exception.stack ?? exception.message,
        AllExceptionsFilter.name
      );
    } else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      code = "VALIDATION_ERROR";
      message = "Data yang dikirim tidak valid";
      this.logger.error(
        { requestId, prismaError: "PrismaClientValidationError" },
        exception.stack ?? exception.message,
        AllExceptionsFilter.name
      );
    }

    // Tanpa PII: hanya userId/module via logging, bukan di body error
    const errorBody: ApiErrorBody = {
      error: { code, message, details, requestId }
    };

    response.status(status).json(errorBody);
  }
}
