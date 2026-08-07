import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
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
});
