/**
 * Sanitasi URL yang berasal dari CMS/landing untuk dipakai di href/src.
 * Menerima protokol http/https dan path relatif (diawali "/"); menolak
 * protokol berbahaya (javascript:, data:, vbscript:, dll) dengan return "".
 */
export function safeUrl(raw: string | null | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("/")) return trimmed;
  try {
    const parsed = new URL(trimmed, "https://opensis.local");
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.href;
    }
  } catch {
    return "";
  }
  return "";
}
