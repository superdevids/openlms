import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from "@nestjs/common";
import { Response } from "express";
import type { ApiErrorBody, ErrorCode } from "@openlms/types";
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

/** Kode error yang dibawa eksplisit di body exception (FEATURE_DISABLED, ARCHIVED_YEAR, dst.). */
const EXPLICIT_CODES = new Set<ErrorCode>([
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "FEATURE_DISABLED",
  "ARCHIVED_YEAR",
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

    // Tanpa PII: hanya userId/module via logging, bukan di body error
    const errorBody: ApiErrorBody = {
      error: { code, message, details, requestId }
    };

    response.status(status).json(errorBody);
  }
}
