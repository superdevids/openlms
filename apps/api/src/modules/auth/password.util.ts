import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

/**
 * Password hashing — prd04 §5.P (Argon2id rekomendasi OWASP).
 *
 * Prioritas: package `argon2` bila terpasang (Argon2id). Karena penambahan
 * dependency ke apps/api/package.json berada di luar scope task ini, dipakai
 * fallback `scrypt` (node:crypto, NIST) agar build/lint/test tetap hijau tanpa
 * dependency baru. Saat `argon2` ditambahkan ke dependencies, otomatis dipakai.
 * Format tersimpan: `$argon2id$...` (argon2) atau `scrypt$<salt>$<key>`.
 */

const scrypt = promisify(scryptCallback);

interface Argon2Module {
  hash: (plain: string) => Promise<string>;
  verify: (hashed: string, plain: string) => Promise<boolean>;
}

let argon2Module: Argon2Module | undefined;
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  argon2Module = require("argon2") as Argon2Module;
} catch {
  argon2Module = undefined;
}

const SCRYPT_PREFIX = "scrypt$";
const SCRYPT_KEYLEN = 64;

export async function hashPassword(plain: string): Promise<string> {
  if (argon2Module) {
    return argon2Module.hash(plain);
  }
  const salt = randomBytes(16);
  const key = (await scrypt(plain, salt, SCRYPT_KEYLEN)) as Buffer;
  return `${SCRYPT_PREFIX}${salt.toString("base64")}$${key.toString("base64")}`;
}

export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  if (hashed.startsWith("$argon2")) {
    // Hash Argon2id tapi modul tak tersedia → fail-closed (jangan terima password)
    if (argon2Module) {
      return argon2Module.verify(hashed, plain);
    }
    return false;
  }
  if (hashed.startsWith(SCRYPT_PREFIX)) {
    const [, saltB64, keyB64] = hashed.split("$");
    if (!saltB64 || !keyB64) {
      return false;
    }
    let salt: Buffer;
    let expected: Buffer;
    try {
      salt = Buffer.from(saltB64, "base64");
      expected = Buffer.from(keyB64, "base64");
    } catch {
      return false;
    }
    const key = (await scrypt(plain, salt, SCRYPT_KEYLEN)) as Buffer;
    if (key.length !== expected.length) {
      return false;
    }
    return timingSafeEqual(key, expected);
  }
  return false;
}

/** Password sementara sekali pakai (F1-T8) — tanpa karakter ambigu 0/O/1/I/l. */
export function generateTemporaryPassword(length = 12): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) {
    const b = bytes[i];
    if (b === undefined) {
      break;
    }
    out += alphabet[b % alphabet.length];
  }
  return out;
}
