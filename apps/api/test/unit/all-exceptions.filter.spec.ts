import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { Response, Request } from "express";
import { AllExceptionsFilter } from "../../src/common/filters/all-exceptions.filter";

describe("AllExceptionsFilter", () => {
  let filter: AllExceptionsFilter;
  let mockResponse: { status: jest.Mock; json: jest.Mock };

  const makeHost = (requestId?: string): ArgumentsHost => {
    const req = {
      requestId: requestId ?? "req_test123",
      headers: { "x-request-id": requestId ?? "req_test123" }
    } as unknown as Request;
    const res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    } as unknown as Response;
    mockResponse = res as never as { status: jest.Mock; json: jest.Mock };
    const host = {
      switchToHttp: () => ({
        getResponse: () => res,
        getRequest: () => req
      })
    } as unknown as ArgumentsHost;
    return host;
  };

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it("mengembalikan format error standar dengan requestId", () => {
    filter.catch(new NotFoundException("Data tidak ditemukan"), makeHost("req_abc"));
    expect(mockResponse.status).toHaveBeenCalledWith(404);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body).toEqual({
      error: {
        code: "NOT_FOUND",
        message: "Data tidak ditemukan",
        requestId: "req_abc"
      }
    });
  });

  it("memetakan 403 -> FORBIDDEN", () => {
    filter.catch(new ForbiddenException("Akses ditolak"), makeHost());
    expect(mockResponse.status).toHaveBeenCalledWith(403);
    expect(mockResponse.json.mock.calls[0][0].error.code).toBe("FORBIDDEN");
  });

  it("memetakan BadRequestException dengan array message -> VALIDATION_ERROR + details", () => {
    const ex = new BadRequestException(["email harus email valid", "password minimal 8 karakter"]);
    filter.catch(ex, makeHost());
    expect(mockResponse.status).toHaveBeenCalledWith(400);
    const body = mockResponse.json.mock.calls[0][0];
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toHaveLength(2);
    expect(body.error.details[0].field).toBe("email");
  });

  it("error tak dikenal -> 500 INTERNAL", () => {
    filter.catch(new Error("boom"), makeHost());
    expect(mockResponse.status).toHaveBeenCalledWith(500);
    expect(mockResponse.json.mock.calls[0][0].error.code).toBe("INTERNAL");
  });

  it("error non-HTTP tetap menyertakan requestId", () => {
    filter.catch(new Error("boom"), makeHost("req_xyz"));
    expect(mockResponse.json.mock.calls[0][0].error.requestId).toBe("req_xyz");
  });

  describe("mapping Prisma (REL-006)", () => {
    it("P2002 -> 409 CONFLICT dengan pesan generik (tanpa bocor detail query)", () => {
      const ex = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint failed on the fields: (`invoice_no`)",
        { code: "P2002", clientVersion: "6.19.3" }
      );
      filter.catch(ex, makeHost("req_prisma"));
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      const body = mockResponse.json.mock.calls[0][0];
      expect(body.error.code).toBe("CONFLICT");
      expect(body.error.message).not.toContain("invoice_no");
      expect(body.error.requestId).toBe("req_prisma");
    });

    it("P2025 -> 404 NOT_FOUND", () => {
      const ex = new Prisma.PrismaClientKnownRequestError("Record not found", {
        code: "P2025",
        clientVersion: "6.19.3"
      });
      filter.catch(ex, makeHost());
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json.mock.calls[0][0].error.code).toBe("NOT_FOUND");
    });

    it("P2003 -> 409 CONFLICT", () => {
      const ex = new Prisma.PrismaClientKnownRequestError(
        "Foreign key constraint failed on the field: `class_id`",
        { code: "P2003", clientVersion: "6.19.3" }
      );
      filter.catch(ex, makeHost());
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json.mock.calls[0][0].error.code).toBe("CONFLICT");
      expect(mockResponse.json.mock.calls[0][0].error.message).not.toContain("class_id");
    });

    it("kode Prisma lain (P1001) -> tetap 500 INTERNAL", () => {
      const ex = new Prisma.PrismaClientKnownRequestError("Connection timed out", {
        code: "P1001",
        clientVersion: "6.19.3"
      });
      filter.catch(ex, makeHost());
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json.mock.calls[0][0].error.code).toBe("INTERNAL");
    });

    it("PrismaClientValidationError -> 400 VALIDATION_ERROR", () => {
      const ex = new Prisma.PrismaClientValidationError(
        "Invalid value for argument `status`. Expected PaymentStatus.",
        { clientVersion: "6.19.3" }
      );
      filter.catch(ex, makeHost());
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json.mock.calls[0][0].error.code).toBe("VALIDATION_ERROR");
    });
  });
});
