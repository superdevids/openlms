# README.pdp.md — Modul PDP (apps/api/src/modules/pdp)

## Fungsi Folder

Kepatuhan **UU PDP** (Undang-Undang Pelindungan Data Pribadi, G12/G13 —
dibangun 2026-08-16, Wave 2): akses data pribadi sendiri, perbaikan profil,
ekspor data pribadi (`DataExportLog` `ExportType.PERSONAL`), permintaan hapus
data + review admin, consent data anak, dan retensi data. **Anti-impersonation:
semua scope self memakai `userId` dari RequestContext (JWT via AuthGuard) —
TIDAK PERNAH parameter klien.** Permintaan hapus dieksekusi lewat anonimisasi
PII (`PdpAnonymizeService`, placeholder `[dihapus]`); retensi dijalankan manual
atau cron bulanan (`PdpRetentionProcessor`).

## Daftar Fitur

- Akses data pribadi sendiri (`GET /pdp/me/data`) — profil, role, kelas,
  consent, jejak audit data pribadi; tercatat di `AuditLog` entity
  `pdp_data_access` (VIEW).
- Perbaikan profil (`PUT /pdp/me`) — allowlist ketat; email/username DITOLAK;
  tercatat `AuditLog` UPDATE.
- Ekspor data pribadi (`POST /pdp/me/export`) — bundle CSV section/field/value
  ke `DataExportLog` `ExportType.PERSONAL`; daftar/unduh hanya milik sendiri
  (user lain → 403).
- Permintaan hapus data (`POST /pdp/me/delete-request`) — dedupe 1 PENDING per
  user → 409; admin `approve`/`reject` (`pdp:review:school`); approve
  mengeksekusi **anonimisasi PII** (placeholder `[dihapus]`, data
  legal/akademik dipertahankan) + status `EXECUTED`.
- Consent data anak (`GET /pdp/consents`) — `ParentalConsent`.
- Retensi data (`DataRetentionPolicy`) — lihat §Kebijakan Retensi di bawah.

## Endpoint (prefix global `/api/v1`)

| Method | Path                           | Permission                          | Deskripsi                                                                        |
| ------ | ------------------------------ | ----------------------------------- | -------------------------------------------------------------------------------- |
| GET    | `/pdp/me/data`                 | `pdp:data:self`                     | Kumpulkan data pribadi sendiri (profil, role, kelas, consent, audit)             |
| PUT    | `/pdp/me`                      | `pdp:data:self` + `user:write:self` | Perbaiki profil (allowlist ketat; email/username DITOLAK)                        |
| POST   | `/pdp/me/export`               | `pdp:export:self`                   | Ekspor data pribadi → `DataExportLog` `ExportType.PERSONAL`                      |
| GET    | `/pdp/me/exports`              | `pdp:export:self`                   | Daftar ekspor data pribadi (hanya milik sendiri)                                 |
| GET    | `/pdp/me/exports/:id/download` | `pdp:export:self`                   | Unduh hasil ekspor (hanya milik sendiri; user lain → 403)                        |
| POST   | `/pdp/me/delete-request`       | `pdp:delete-request:self`           | Ajukan permintaan hapus data (dedupe 1 PENDING/user → 409)                       |
| GET    | `/pdp/me/requests`             | `pdp:delete-request:self`           | Daftar permintaan sendiri                                                        |
| GET    | `/pdp/consents`                | `pdp:data:self`                     | Daftar consent data anak (`ParentalConsent`)                                     |
| GET    | `/pdp/requests`                | `pdp:review:school`                 | Daftar permintaan admin (query `status` opsional)                                |
| POST   | `/pdp/requests/:id/approve`    | `pdp:review:school`                 | Approve → eksekusi anonimisasi/ekspor → `EXECUTED`                               |
| POST   | `/pdp/requests/:id/reject`     | `pdp:review:school`                 | Tolak permintaan                                                                 |
| GET    | `/pdp/retention`               | `retention:configure:school`        | Daftar kebijakan retensi (`DataRetentionPolicy`)                                 |
| PUT    | `/pdp/retention/:entity`       | `retention:configure:school`        | Upsert kebijakan retensi (entity dari path param; validasi `RETENTION_ENTITIES`) |
| POST   | `/pdp/retention/run`           | `retention:run:school`              | Jalankan job retensi manual                                                      |

## Permission (4 `pdp:*` + 2 `retention:*`)

| Permission                   | Pemegang (seed)                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------- |
| `pdp:data:self`              | SISWA, WALI_MURID, CALON_SISWA, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL, SUPERADMIN |
| `pdp:export:self`            | sama dengan `pdp:data:self`                                                        |
| `pdp:delete-request:self`    | sama dengan `pdp:data:self`                                                        |
| `pdp:review:school`          | SUPERADMIN / OPERATOR                                                              |
| `retention:configure:school` | OPERATOR                                                                           |
| `retention:run:school`       | OPERATOR                                                                           |

## Kebijakan Retensi (UU PDP, G12)

- Entity yang didukung (`RETENTION_ENTITIES`, `pdp.constants.ts:25-31`):
  `Notification`, `ExamAnswerLog`, `Attendance`, `AttendanceRecord`,
  `CounselingNote` — **5 entity**.
- **Kebijakan default 5 × 60 bulan** (`packages/database/prisma/seed-data/retention-policies.ts`):
  `Notification` DELETE, `ExamAnswerLog` DELETE, `Attendance` DELETE,
  `AttendanceRecord` DELETE, `CounselingNote` **ANONYMIZE** (catatan BK TIDAK
  di-hard-delete — keputusan desain: riwayat konseling dipertahankan demi
  kepentingan anak, hanya kolom teks yang dianonimisasi).
- **Cron bulanan** `pdp-retention-monthly` (`0 3 1 * *`,
  `jobs/processors/pdp-retention.processor.ts:17`) — tanggal 1 pukul 03:00;
  plus trigger manual `POST /pdp/retention/run`.
- `ARCHIVE` belum diimplementasikan → log warning + 0 (tidak senyap).
- Ringkasan run dicatat ke `AuditLog` entity `retention_job` (aktor sistem).

## Model & Enum (schema.prisma)

| Model/Enum              | Detail                                                                                                                                                                            |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PdpRequest` (model)    | `id`, `user_id`, `type`, `status`, `reason?`, `requested_at`, `processed_by?`, `processed_at?`, `processed_note?`; index `(user_id, status)` + `(status)`; `@@map("pdp_request")` |
| `PdpRequestType` (enum) | `DELETE`, `EXPORT`                                                                                                                                                                |
| `PdpRequestStatus`      | `PENDING`, `APPROVED`, `REJECTED`, `EXECUTED`                                                                                                                                     |
| `ExportType` (+nilai)   | nilai `PERSONAL` ditambahkan untuk ekspor data pribadi                                                                                                                            |
| `DataRetentionPolicy`   | `entity`, `retention_months`, `action` (`RetentionAction`: ARCHIVE/DELETE/ANONYMIZE), `enabled`                                                                                   |

## Audit Trail

- `pdp_data_access` (VIEW) — akses data pribadi.
- `pdp_data_export` (EXPORT) — ekspor data pribadi.
- `pdp_request` (CREATE/DELETE) — permintaan dibuat / dieksekusi.
- `retention_job` (CREATE) — run retensi (ringkasan count).

## Struktur File

| Path                       | Isi                                                                                                               |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `pdp.controller.ts`        | REST endpoint (14) + dekorator RBAC                                                                               |
| `pdp.service.ts`           | Orchestrasi akses/ekspor/permintaan/retensi                                                                       |
| `pdp-anonymize.service.ts` | Anonimisasi PII saat DELETE di-approve (placeholder `[dihapus]`)                                                  |
| `pdp-retention.service.ts` | Eksekusi kebijakan retensi per entity (case eksplisit)                                                            |
| `pdp.constants.ts`         | `RETENTION_ENTITIES`, konstanta audit, placeholder                                                                |
| `dto/`                     | `update-my-profile`, `export-personal-data`, `create-delete-request`, `review-request`, `upsert-retention-policy` |
| `pdp.module.ts`            | Registrasi modul; service diekspor untuk JobsModule (cron retensi)                                                |
| `pdp.controller.spec.ts`   | Test RBAC endpoint + validasi entity retensi                                                                      |
| `pdp.service.spec.ts`      | Test service + retensi                                                                                            |
