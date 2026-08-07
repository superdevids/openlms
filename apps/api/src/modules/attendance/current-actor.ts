/**
 * Konteks aktor request — dibaca dari RequestContext yang dibangun AuthGuard.
 * Identitas SELALU dari `request.requestContext` (JWT + UserRole), bukan dari
 * header klien (anti-impersonation). Controller memakai helper `actor(req)`
 * di AttendanceController untuk mengambil ActorContext dari requestContext.
 * classIds = kelas yang diampu GURU (scope KELAS); kosong untuk role lain.
 */
export interface ActorContext {
  userId: string;
  roles: string[];
  classIds: string[];
}
