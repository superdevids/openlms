# Registrasi Modul — Notifications & Realtime (apps/api)

Dokumen ini menjelaskan modul **Notifications** dan **Realtime** (Socket.IO) di
`apps/api`. Kedua modul **sudah terdaftar** di `app.module.ts` (sejak integrasi
Fase 1); bagian registrasi di bawah hanya dokumentasi kontrak, bukan langkah
yang harus dikerjakan ulang.

---

## 1. Dependensi (sudah ditambahkan ke `apps/api/package.json`)

| Paket                        | Versi    | Fungsi                                  |
| ---------------------------- | -------- | --------------------------------------- |
| `@nestjs/websockets`         | ^11.1.28 | Dekorator gateway (`@WebSocketGateway`) |
| `@nestjs/platform-socket.io` | ^11.1.28 | Adapter Socket.IO untuk NestJS          |
| `socket.io`                  | ^4.8.3   | Runtime Socket.IO                       |

`@nestjs/platform-socket.io` dipakai otomatis oleh NestJS saat terpasang
(adaptor `IoAdapter` default) — tidak perlu import manual.

## 2. Registrasi di `app.module.ts` (SUDAH TERPASANG)

Kode berikut adalah referensi bentuk registrasi yang sudah aktif di
`app.module.ts` (imports: `RealtimeModule`, `NotificationsModule`):

```ts
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { RealtimeModule } from "./modules/realtime/realtime.module";

@Module({
  imports: [
    // ... modul existing
    RealtimeModule, // gateway Socket.IO namespace /ws
    NotificationsModule // pusat notifikasi (import RealtimeModule internal)
  ]
})
export class AppModule {}
```

Catatan:

- `RealtimeModule` boleh di-import modul domain lain langsung (mis. ExamModule)
  agar bisa `emitToClass` / `emitToExam` — export `RealtimeGateway`.
- `NotificationsModule` mengekspor `NotificationService` untuk dipakai modul lain
  (tugas → `createForRoles([GURU])`, ujian → `createForUser`, pengumuman → `createForAll`, dsb.).
- Socket.IO ikut jalan di server HTTP yang sama (tidak perlu port terpisah);
  namespace tunggal `/ws` (docs/02 §7.1).

## 3. REST endpoints (prefix global `/api/v1`)

| Method | Path                                         | Deskripsi                      |
| ------ | -------------------------------------------- | ------------------------------ |
| GET    | `/notifications?page=&pageSize=&unreadOnly=` | Inbox paginated (terbaru dulu) |
| GET    | `/notifications/unread-count`                | Jumlah belum dibaca            |
| POST   | `/notifications/:id/read`                    | Tandai dibaca (idempotent)     |
| POST   | `/notifications/read-all`                    | Tandai semua dibaca            |

> **Auth (F1 aktif):** guard global `AuthGuard` (JWT access in-house, cookie
> httpOnly/Bearer) → `PermissionsGuard` fail-closed (@RequirePermission).
> Aktor dibaca dari `request.requestContext`, bukan header klien. Header dev
> `x-user-id` sudah dihapus.

## 4. Socket.IO — namespace `/ws`

- **Handshake auth:** `auth.token` (JWT Bearer in-house, HS256) **atau** cookie
  httpOnly `opensis_access`. Ditolak → `connection_error` + disconnect `UNAUTHORIZED`.
  Validasi tambahan: user harus punya ≥1 `UserRole` berstatus `ACTIVE`
  (role di-resolve dari DB, JWT hanya identitas — P2).
- **Room:** `user:{userId}` (auto-join saat koneksi), `class:{classId}`,
  `exam:{examSessionId}` (join via event `room:join`).
- **Reconnect:** klien emit `room:join` lagi untuk room konteks; room `user:*`
  di-join ulang otomatis oleh server. Event yang terlewat diambil ulang via REST
  (event best-effort — docs/02 §7.2).
- **Emit helper (server):** `emitToUser(userId, event, payload)`,
  `emitToClass(classId, event, payload)`, `emitToExam(examSessionId, event, payload)`.

Daftar event standar (registry: `notifications/notification-events.ts`):
`notification:new`, `assignment:new`, `assignment:graded`, `exam:start`,
`exam:time-warning`, `exam:autosave-ok`, `exam:force-submit`, `attendance:alpa`,
`attendance:session-closed`, `invoice:due`, `payment:confirmed`,
`announcement:new`, `letter:status`, `library:due`, `discipline:recorded`,
`ppdb:status`, `asset:approved`, `bk:reminder`, `export:ready`.
Client → server: `exam:answer:save`, `room:join`, `room:leave`.

## 5. Siap multi-instance — Redis adapter (saat scale-out)

Namespace tunggal sudah siap adapter Redis; aktifkan dengan:

```bash
npm install @socket.io/redis-adapter ioredis --workspace=@opensis/api
```

Lalu di `main.ts` (atau `onModuleInit` gateway) setelah `app.listen`:

```ts
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "ioredis";

const pub = new Redis(process.env.REDIS_URL);
const sub = pub.duplicate();
io.adapter(createAdapter(pub, sub));
```

> `io` = instance Socket.IO (`app.getHttpServer()` → `io(server, { namespace: "/ws" })`
> atau akses `RealtimeGateway.server`). Tanpa `REDIS_URL`, adapter default in-memory
> dipakai (single-instance, MVP).

## 6. Yang belum dikerjakan (TODO lintas fase)

- [ ] F1: ganti placeholder auth controller (`x-user-id`) dengan middleware JWT + guard RBAC global.
- [ ] F1: whitelist origin CORS Socket.IO dari env (saat `apps/web` live).
- [ ] F2: validasi akses room `class:*` / `exam:*` (keanggotaan kelas, sesi ujian) saat scope resolver RBAC tersedia.
- [ ] F1: dukung RS256 di `realtime.auth.ts` bila kunci publik disediakan.
- [ ] Rate limit WebSocket 60/mnt (prd04 §8.3, Q4) saat throttler terpasang.
