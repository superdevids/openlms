# README.notifications.md — Modul Notifications (apps/api/src/modules/notifications)

## Fungsi Folder

Pusat notifikasi: inbox per user (paginated), jumlah belum dibaca, tandai dibaca.
Service diekspor agar modul lain membuat notifikasi (`createForRoles`,
`createForUser`, `createForAll`, dsb.). Identitas user dari
`request.requestContext` — hanya data milik user sendiri.

## Daftar Fitur

- Inbox paginated + filter belum dibaca.
- Hitung unread count.
- Tandai satu / semua sebagai dibaca (idempotent).

## Endpoint (prefix global `/api/v1`)

| Method | Path                          | Permission                    | Deskripsi           |
| ------ | ----------------------------- | ----------------------------- | ------------------- |
| GET    | `/notifications`              | `notification:read:self`      | Inbox paginated     |
| GET    | `/notifications/unread-count` | `notification:read:self`      | Jumlah belum dibaca |
| POST   | `/notifications/:id/read`     | `notification:mark-read:self` | Tandai dibaca       |
| POST   | `/notifications/read-all`     | `notification:mark-read:self` | Tandai semua dibaca |

## Struktur File

| File                          | Isi                                    |
| ----------------------------- | -------------------------------------- |
| `notifications.controller.ts` | REST endpoint                          |
| `notifications.service.ts`    | Inbox/unread/mark-read + helper create |
| `notifications.types.ts`      | Tipe (InboxResult, NotificationDto)    |
| `notification-events.ts`      | Registry nama event realtime           |
| `dto/inbox-query.dto.ts`      | DTO query                              |
