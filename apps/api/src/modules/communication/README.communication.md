# README.communication.md — Modul Communication (apps/api/src/modules/communication)

## Fungsi Folder

Komunikasi sekolah: **pengumuman** (dengan target role, pinned, publish/unpublish)
dan **surat resmi** (pengajuan → submit → approve/reject → sign). Identitas user
dari `request.requestContext` (AuthGuard), bukan header klien.

## Daftar Fitur

- Pengumuman: CRUD + publish/unpublish + daftar per role.
- Pengumuman terbit mengirim notifikasi ke seluruh user role target + emit WS
  `announcement:new` (best-effort; REST tetap sumber kebenaran).
- Surat: ajukan, submit, approve, reject, sign; pemohon hanya melihat surat miliknya.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                         | Permission                                    | Deskripsi                    |
| ------ | -------------------------------------------- | --------------------------------------------- | ---------------------------- |
| POST   | `/communication/announcements`               | `announcement:write:school`                   | Buat pengumuman              |
| GET    | `/communication/announcements`               | `announcement:read`                           | Daftar pengumuman (per role) |
| PATCH  | `/communication/announcements/:id/publish`   | `announcement:write:school`                   | Publikasi                    |
| PATCH  | `/communication/announcements/:id/unpublish` | `announcement:write:school`                   | Batalkan publikasi           |
| PATCH  | `/communication/announcements/:id`           | `announcement:write:school`                   | Update pengumuman            |
| DELETE | `/communication/announcements/:id`           | `announcement:write:school`                   | Hapus pengumuman             |
| POST   | `/communication/letters`                     | `letter:request:self`                         | Ajukan surat resmi           |
| POST   | `/communication/letters/:id/submit`          | `letter:request:self`/`letter:approve:school` | Submit surat                 |
| POST   | `/communication/letters/:id/approve`         | `letter:approve:school`                       | Approve surat                |
| POST   | `/communication/letters/:id/reject`          | `letter:approve:school`                       | Tolak surat                  |
| POST   | `/communication/letters/:id/sign`            | `letter:approve:school`                       | Tanda tangan surat           |
| GET    | `/communication/letters`                     | `letter:request:self`/`letter:read:school`    | Daftar surat (pemohon)       |

## Struktur File

| File                          | Isi           |
| ----------------------------- | ------------- |
| `communication.controller.ts` | REST endpoint |
| `announcement.service.ts`     | Pengumuman    |
| `official-letter.service.ts`  | Surat resmi   |
| `dto/communication.dto.ts`    | DTO           |
