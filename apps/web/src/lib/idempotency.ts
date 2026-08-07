/**
 * Idempotency-Key generator — wajib untuk aksi idempoten (04-api-contract §1.7):
 * autosave ujian, scan QR absensi, pembayaran, create submission.
 */

export function newIdempotencyKey(prefix = "op"): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  return `${prefix}_${rand}`;
}
