# README.asset.md — Modul Asset (apps/api/src/modules/asset)

## Fungsi Folder

Manajemen aset sekolah: inventaris, depresiasi (dihitung saat laporan), booking
peminjaman (approval), maintenance, dan audit/opname (termasuk usulan
penghapusan aset). Aktor selalu dari `@CurrentUser` (AuthGuard).

## Daftar Fitur

- Inventaris: CRUD aset (BOS/APBD/SWADANA), filter, detail.
- Depresiasi: laporan + rekap per kategori.
- Booking: peminjaman, list, approve, cancel, complete.
- Maintenance: jadwal + biaya, update status.
- Audit/opname: catat hasil, list, detail, approve retired.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                 | Permission                               | Deskripsi                 |
| ------ | ------------------------------------ | ---------------------------------------- | ------------------------- |
| POST   | `/assets`                            | `asset:write:school`                     | Buat aset                 |
| GET    | `/assets`                            | `asset:read:school`                      | Daftar aset               |
| GET    | `/assets/:id`                        | `asset:read:school`                      | Detail aset               |
| POST   | `/assets/:id`                        | `asset:write:school`                     | Update aset               |
| GET    | `/assets/reports/depreciation`       | `asset:read:school`                      | Laporan depresiasi        |
| GET    | `/assets/reports/depreciation/rekap` | `asset:read:school`                      | Rekap depresiasi          |
| POST   | `/assets/bookings`                   | `asset:book:self`/`asset:write:school`   | Booking aset              |
| GET    | `/assets/bookings`                   | `asset:read:school`                      | Daftar booking            |
| POST   | `/assets/bookings/:id/approve`       | `asset:write:school`                     | Approve booking           |
| POST   | `/assets/bookings/:id/cancel`        | `asset:book:self`/`asset:write:school`   | Batalkan booking          |
| POST   | `/assets/bookings/:id/complete`      | `asset:write:school`                     | Selesaikan booking        |
| POST   | `/assets/maintenance`                | `asset:maintenance:write:school`         | Buat maintenance          |
| GET    | `/assets/maintenance`                | `asset:read:school`                      | Daftar maintenance        |
| POST   | `/assets/maintenance/:id/status`     | `asset:maintenance:write:school`         | Update status maintenance |
| POST   | `/assets/audits`                     | `asset:audit:school`                     | Catat hasil audit/opname  |
| GET    | `/assets/audits`                     | `asset:audit:school`/`asset:read:school` | Daftar audit              |
| GET    | `/assets/audits/:id`                 | `asset:audit:school`/`asset:read:school` | Detail audit              |
| POST   | `/assets/audits/:id/approve-retired` | `asset:audit:school`                     | Approve penghapusan aset  |

## Struktur File

| Path                                          | Isi                 |
| --------------------------------------------- | ------------------- |
| `asset.controller.ts`                         | REST endpoint       |
| `services/asset.service.ts`                   | Inventaris          |
| `services/depreciation.service.ts`            | Depresiasi          |
| `services/asset-booking.service.ts`           | Peminjaman          |
| `services/asset-maintenance-audit.service.ts` | Maintenance + audit |
| `dto/asset.dto.ts`                            | DTO                 |
