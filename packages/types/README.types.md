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
| `RequestContext`   | userId, roles, classIds, homeroomClassId, requestId                                                                                                                                                            |
| `ApiErrorBody`     | Format error API (`code`, `message`, `details`, `requestId`)                                                                                                                                                   |

## Catatan

- Skema Prisma tetap sumber kebenaran database; paket ini menyediakan enum/DTO
  runtime untuk lapisan aplikasi.
- API error code terpusat (`ErrorCode`) — dipakai `apps/web/src/lib/api-client.ts`.
