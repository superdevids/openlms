import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * JWT in-house (HS256) — F1-T1/T3, prd04 §5.P.
 * Tanpa dependency @nestjs/jwt/jsonwebtoken: sign & verify memakai node:crypto
 * (HMAC-SHA256). JWT hanya identitas ({ sub, typ }); otoritas role dari UserRole.
 *
 * Secret WAJIB dikonfigurasi. Di production, bila JWT_ACCESS_SECRET /
 * JWT_REFRESH_SECRET / JWT_INVITATION_SECRET tidak diset → fail-fast saat
 * modul dimuat (jangan pernah memakai fallback dev di production). Di dev,
 * fallback dev-only dipakai dengan peringatan jelas.
 */

export interface JwtPayload {
  sub: string;
  typ?: string;
  role?: string;
  jti?: string;
  iat?: number;
  exp?: number;
}

const isProduction = process.env.NODE_ENV === "production";

function resolveSecret(envName: string, devFallback: string): string {
  const value = process.env[envName];
  if (value && value.length > 0) {
    return value;
  }
  if (isProduction) {
    throw new Error(
      `[jwt.util] ${envName} wajib dikonfigurasi di production (fail-fast). ` +
        `Jangan memakai secret default di lingkungan production.`
    );
  }
  console.warn(
    `[jwt.util] ${envName} tidak diset — memakai dev fallback "${devFallback}". ` +
      `WAJIB set secret kuat di production.`
  );
  return devFallback;
}

const ACCESS_SECRET = resolveSecret("JWT_ACCESS_SECRET", "dev-only-access-secret");
const REFRESH_SECRET = resolveSecret("JWT_REFRESH_SECRET", "dev-only-refresh-secret");
const INVITATION_SECRET = resolveSecret(
  "JWT_INVITATION_SECRET",
  process.env.JWT_ACCESS_SECRET ?? "dev-only-invite-secret"
);

const HEADER = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");

function base64url(input: Buffer | string): string {
  return Buffer.isBuffer(input)
    ? input.toString("base64url")
    : Buffer.from(input).toString("base64url");
}

function createToken(payload: JwtPayload, secret: string, ttlSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
    jti: randomBytes(8).toString("hex")
  };
  const bodyB64 = base64url(JSON.stringify(body));
  const signature = createHmac("sha256", secret).update(`${HEADER}.${bodyB64}`).digest("base64url");
  return `${HEADER}.${bodyB64}.${signature}`;
}

function verifyToken(token: string, secret: string, expectedTyp?: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [headerB64, bodyB64, signature] = parts;
  if (!headerB64 || !bodyB64 || !signature) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(`${headerB64}.${bodyB64}`).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  let body: JwtPayload;
  try {
    body = JSON.parse(Buffer.from(bodyB64, "base64url").toString("utf8")) as JwtPayload;
  } catch {
    return null;
  }
  if (typeof body.sub !== "string" || body.sub.length === 0) {
    return null;
  }
  if (expectedTyp && body.typ !== expectedTyp) {
    return null;
  }
  if (typeof body.exp === "number" && body.exp * 1000 <= Date.now()) {
    return null;
  }
  return body;
}

/** TTL dari env (menit/hari) dengan fallback aman bila nilai tidak valid (NaN/<=0). */
function ttlFromEnv(envName: string, fallback: number): number {
  const raw = Number(process.env[envName] ?? fallback);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/** Access token — 15–60 menit (konfigurasi JWT_ACCESS_TTL_MINUTES). */
export function signAccessToken(payload: Pick<JwtPayload, "sub">): string {
  const ttlMinutes = ttlFromEnv("JWT_ACCESS_TTL_MINUTES", 30);
  return createToken({ ...payload, typ: "access" }, ACCESS_SECRET, ttlMinutes * 60);
}

export function verifyAccessToken(token: string): JwtPayload | null {
  return verifyToken(token, ACCESS_SECRET, "access");
}

/**
 * Refresh token — JWT terpisah; rotasi + revoke berbasis DB (tabel RefreshToken).
 */
export function signRefreshToken(payload: Pick<JwtPayload, "sub">): string {
  const ttlDays = ttlFromEnv("JWT_REFRESH_TTL_DAYS", 30);
  return createToken({ ...payload, typ: "refresh" }, REFRESH_SECRET, ttlDays * 86400);
}

export function verifyRefreshToken(token: string): JwtPayload | null {
  return verifyToken(token, REFRESH_SECRET, "refresh");
}

/** Token undangan (F1-T6) — berisi userId + role yang diundang. */
export function signInvitationToken(payload: { sub: string; role: string }): string {
  const ttlDays = ttlFromEnv("JWT_INVITATION_TTL_DAYS", 60);
  return createToken({ ...payload, typ: "invite" }, INVITATION_SECRET, ttlDays * 86400);
}

export function verifyInvitationToken(token: string): JwtPayload | null {
  return verifyToken(token, INVITATION_SECRET, "invite");
}
