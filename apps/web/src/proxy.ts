import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (Next 16 menggantikan middleware.ts) — auth UX-level.
 * Otorisasi FINAL tetap di API (backend). Cookie session httpOnly di-set oleh backend.
 * Saat NEXT_PUBLIC_DEMO=1, semua route bebas diakses untuk preview tanpa backend.
 */
const SESSION_COOKIE = "opensis_session";
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO === "1";
const PROTECTED_PREFIXES = [
  "/siswa",
  "/guru",
  "/admin",
  "/superadmin",
  "/ortu",
  "/calonsiswa",
  "/pembimbing",
  "/penguji"
];

export function proxy(req: NextRequest): NextResponse {
  if (DEMO_MODE) return NextResponse.next();

  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE);
  const isProtected = PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/login" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/siswa/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/login",
    "/siswa/:path*",
    "/guru/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
    "/ortu/:path*",
    "/calonsiswa/:path*",
    "/pembimbing/:path*",
    "/penguji/:path*"
  ]
};
