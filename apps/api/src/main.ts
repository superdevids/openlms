import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import compression from "compression";
import helmet from "helmet";
import { Logger } from "nestjs-pino";
import type { NextFunction, Request, Response } from "express";
import { AppModule } from "./app.module";
import { AllExceptionsFilter } from "./common/filters/all-exceptions.filter";
import { GLOBAL_PREFIX } from "./common/constants";
import { allowedOrigins } from "./common/cors.util";

const isProduction = process.env.NODE_ENV === "production";

async function bootstrap(): Promise<void> {
  if (isProduction) {
    allowedOrigins(); // fail-fast saat boot bila CORS_ORIGINS kosong di production
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });

  // Trust proxy: Nginx di depan (X-Forwarded-*) — req.ip akurat untuk rate limit.
  if (process.env.TRUST_PROXY === "true") {
    app.set("trust proxy", true);
  }

  // CORS whitelist dari env CORS_ORIGINS (REST); Socket.IO CORS sudah di gateway.
  app.enableCors({
    origin: (
      requestOrigin: string | undefined,
      callback: (
        err: Error | null,
        origin?: string | boolean | RegExp | (string | RegExp)[]
      ) => void
    ) => {
      const allowed = allowedOrigins();
      if (!requestOrigin || allowed.includes(requestOrigin)) {
        callback(null, true);
      } else {
        callback(new Error("Origin not allowed by CORS"));
      }
    },
    credentials: true
  });

  // F0-T8 security: header keamanan (helmet v8 — Permissions-Policy tidak lagi disediakan
  // helmet, dipasang manual di bawah). CSP ketat: self + inline style (branding CSS vars)
  // + data: image; HSTS hanya saat HTTPS (NODE_ENV=production + Nginx TLS).
  const isHttps = process.env.NODE_ENV === "production";
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          "style-src": ["'self'", "'unsafe-inline'"],
          "img-src": ["'self'", "data:"],
          "upgrade-insecure-requests": isHttps ? [] : null
        }
      },
      hsts: isHttps ? { maxAge: 31536000, includeSubDomains: true, preload: false } : false,
      frameguard: { action: "deny" },
      referrerPolicy: { policy: "strict-origin-when-cross-origin" },
      crossOriginEmbedderPolicy: false
    })
  );

  // Permissions-Policy: matikan kamera, mikrofon, geolokasi (helmet v8 tidak menyediakan).
  app.use((_req: Request, res: Response, next: NextFunction): void => {
    res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    next();
  });

  // Kompresi respons (gzip/br) — "lebih banyak middleware" (F0 hardening).
  // Dipasang sebelum global prefix; respon JSON besar (rapor, rekap) terkompresi.
  app.use(compression());

  // docs/04 §1.2 — semua endpoint di bawah prefix /api/v1
  app.setGlobalPrefix(GLOBAL_PREFIX);

  // Structured logging (pino) sebagai logger default
  app.useLogger(app.get(Logger));

  // Format error standar { error: { code, message, details, requestId } }
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  app.get(Logger).log(`opensis API listening on :${port}/${GLOBAL_PREFIX}`, "Bootstrap");
}

void bootstrap();
