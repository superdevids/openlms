# README.attendance.md — Modul Attendance (apps/api/src/modules/attendance)

## Fungsi Folder

Absensi sekolah: manual bulk oleh guru, sesi QR/geofencing, scan QR idempotent,
pengajuan izin/sakit online + verifikasi, rekap kehadiran, dan dashboard
kedisiplinan. Identitas aktor selalu dari `request.requestContext` (AuthGuard),
bukan header klien.

## Daftar Fitur

- Absensi manual bulk (idempotent per student+class_subject+date; batch transaksi).
- Sesi absensi + generate token QR sekali pakai (TTL).
- Scan QR: `Idempotency-Key` (header/body) → replay 200 idempotent, reuse 409.
- Izin/sakit online + verifikasi oleh homeroom/GURU_BK.
- Rekap per siswa/mapel/periode + kedisiplinan (ALPA + risiko).

## Endpoint (prefix global `/api/v1`)

| Method | Path                              | Permission                                                | Deskripsi                |
| ------ | --------------------------------- | --------------------------------------------------------- | ------------------------ |
| POST   | `/attendance/manual`              | `attendance:record:class`                                 | Absensi manual bulk      |
| POST   | `/attendance/sessions`            | `attendance:session:write:class`                          | Buat sesi absensi        |
| GET    | `/attendance/sessions/:id`        | `attendance:session:write:class`/`attendance:rekap:class` | Detail sesi + hasil scan |
| POST   | `/attendance/sessions/:id/tokens` | `attendance:session:write:class`                          | Generate token QR        |
| POST   | `/attendance/records/scan`        | `attendance:scan:self`                                    | Scan QR (idempotent)     |
| POST   | `/attendance/permits`             | `permit:request:self`                                     | Ajukan izin/sakit        |
| POST   | `/attendance/permits/:id/verify`  | `permit:verify:class`                                     | Verifikasi izin          |
| GET    | `/attendance/rekap`               | `attendance:rekap:self`/`class`/`school`                  | Rekap kehadiran          |
| GET    | `/attendance/discipline`          | `discipline:read:school`                                  | Dashboard kedisiplinan   |

## Struktur File

| File                                              | Isi                                              |
| ------------------------------------------------- | ------------------------------------------------ |
| `attendance.controller.ts`                        | REST endpoint                                    |
| `attendance.service.ts`                           | Manual, sesi, token, scan, izin, rekap, disiplin |
| `attendance-rekap.service.ts`                     | Perhitungan rekap & persentase                   |
| `attendance.utils.ts` / `attendance.constants.ts` | Geofence, token hash, konstanta                  |
| `dto/`                                            | DTO per endpoint                                 |
