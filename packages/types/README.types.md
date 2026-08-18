# README.types.md — Paket Types (packages/types)

## Fungsi Folder

Kontrak tipe bersama (**single source of truth**) untuk enum, DTO, dan tipe
lintas aplikasi. Dipakai `apps/api`, `apps/web`, dan `packages/database` agar
tidak terjadi drift antara backend dan frontend.

## Struktur Folder

| Path           | Isi                                                           |
| -------------- | ------------------------------------------------------------- |
| `src/index.ts` | Enum + tipe (Role, status, kontrak RequestContext, error API) |
| `package.json` | Workspace `@opensis/types` (build tsc)                        |

## Ekspor Utama

| Tipe               | Nilai                                                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`             | SISWA, GURU, BK, KAPRODI, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL (perubahan 2026-08-08: role BK, tambah KAPRODI & AUDITOR) |
| `MembershipStatus` | INVITED, ACTIVE, DISABLED                                                                                                                                                                                      |
| `SchoolType`       | SMA, SMK                                                                                                                                                                                                       |
| `EnrollmentStatus` | ACTIVE, TRANSFERRED, GRADUATED, DROPPED, PROMOTED, REPEATED                                                                                                                                                    |
| `AssessmentStatus` | DRAFT, PUBLISHED, ONGOING, CLOSED, ARCHIVED                                                                                                                                                                    |
| `AttendanceStatus` | HADIR, IZIN, SAKIT, ALPA, TERLAMBAT                                                                                                                                                                            |
| `AttendanceMethod` | MANUAL, QR_CODE, GEOFENCING, RFID                                                                                                                                                                              |
| `PaymentStatus`    | PENDING, PAID, PARTIAL, OVERDUE, CANCELLED, REFUNDED, CARRIED_OVER                                                                                                                                             |
| `InvoiceType`      | SPP, UANG_KEGIATAN, UANG_DAFTAR, UANG_SERAGAM, UANG_OSIS, DENDA, LAINNYA                                                                                                                                       |
| `GradeType`        | TUGAS, KUIS, UJIAN, PRAKTIK, SIKAP, SUMATIF                                                                                                                                                                    |
| `ErrorCode`        | VALIDATION_ERROR, UNAUTHORIZED, FORBIDDEN, FEATURE_DISABLED, ARCHIVED_YEAR, SERVICE_DEGRADED, NOT_FOUND, CONFLICT, RATE_LIMITED, INTERNAL (10 nilai, `ERROR_CODE_VALUES` — `src/index.ts:176-187`)             |
| `RequestContext`   | userId, roles, classIds, homeroomClassId, requestId                                                                                                                                                            |
| `ApiErrorBody`     | Format error API (`code`, `message`, `details`, `requestId`)                                                                                                                                                   |

## Catatan

- **Skema Prisma adalah sumber resmi enum database.** Paket ini HANYA menyediakan
  subset **21 dari 65 enum** Prisma (`packages/database/prisma/schema.prisma`,
  verifikasi 2026-08-16) yang dipakai runtime lapisan aplikasi (api, web) agar
  tidak drift. Bila enum baru ditambahkan di Prisma, daftar di atas TIDAK otomatis
  lengkap — lihat `schema.prisma` untuk daftar lengkap 65 enum (termasuk
  `ParentLinkStatus`, `PdpRequestType`, `PdpRequestStatus`, `PermissionEffect`,
  `PermissionScope`, dst.).
- API error code terpusat (`ErrorCode` — 10 nilai, termasuk `SERVICE_DEGRADED`) —
  dipakai `apps/web/src/lib/api-client.ts`.
