# README.realtime.md — Modul Realtime (apps/api/src/modules/realtime)

## Fungsi Folder

Gateway **Socket.IO** dengan namespace tunggal `/ws` untuk push real-time:
notifikasi, event kelas, event ujian, dsb. Handshake memakai JWT Bearer atau
cookie httpOnly; akses room divalidasi (keanggotaan kelas / sesi ujian) via
`ScopeResolver`. Semua event bersifat best-effort — sumber kebenaran tetap REST.

## Daftar Fitur

- Namespace tunggal `/ws` dengan CORS whitelist (`CORS_ORIGINS`).
- Auth handshake: `auth.token` (JWT Bearer) atau cookie; butuh ≥1 `UserRole` ACTIVE.
- Room: `user:{userId}` (auto-join), `class:{classId}`, `exam:{examSessionId}`
  (join via event `room:join`; divalidasi).
- Emit helper: `emitToUser`, `emitToClass`, `emitToExam`, `emitToAll`.
- Siap multi-instance via Redis adapter (opsional).

## Event Socket.IO

| Arah            | Event                                                                               | Deskripsi                                                         |
| --------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Client → Server | `room:join`                                                                         | Join room class/exam (validasi keanggotaan)                       |
| Client → Server | `room:leave`                                                                        | Leave room                                                        |
| Server → Client | `connected`                                                                         | Handshake sukses (userId, roles, rooms)                           |
| Server → Client | `room:joined`                                                                       | Konfirmasi join room                                              |
| Server → Client | `error`                                                                             | `UNAUTHORIZED` / `FORBIDDEN` / `INVALID_ROOM`                     |
| Server → Client | `notification:new`, `assignment:new`, `exam:force-submit`, `branding:changed`, dsb. | Event domain (registry di `notifications/notification-events.ts`) |

## Struktur File

| File                  | Isi                                           |
| --------------------- | --------------------------------------------- |
| `realtime.gateway.ts` | Gateway + room + auth + emit helper           |
| `realtime.auth.ts`    | AuthService handshake (JWT/cookie + UserRole) |
| `realtime.module.ts`  | Registrasi gateway + provider auth            |
