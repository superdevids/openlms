import { Injectable, NestMiddleware } from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { randomUUID } from "node:crypto";
import { REQUEST_ID_HEADER, REQUEST_ID_PREFIX } from "../constants";

export interface RequestWithId extends Request {
  requestId: string;
}

/**
 * Middleware request ID (F0-T6):
 * - generate `req_<random>` bila header X-Request-Id tidak ada
 * - echo header ke response (docs/02 §11: request ID per transaksi)
 */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(req: RequestWithId, res: Response, next: NextFunction): void {
    const incoming = req.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof incoming === "string" && incoming.length > 0
        ? incoming
        : `${REQUEST_ID_PREFIX}${randomUUID().replace(/-/g, "")}`;

    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);
    next();
  }
}
