# LMS Inti — Registrasi Modul (F2)

Modul LMS inti (kelas, mapel, enrollment, jadwal, materi, tugas, submission,
penilaian, rekap) hidup di `apps/api/src/modules/lms/`. Modul ini **sudah
terdaftar** di `apps/api/src/app.module.ts` (imports: `LmsModule`, yang juga
memasang `APP_PIPE` ValidationPipe global).

## Module class yang tersedia

| Module              | Isi                                                                                  | Endpoint (docs/04 §2.2)                                                  |
| ------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `LmsModule`         | Agregator semua submodul + `APP_PIPE` (ValidationPipe whitelist+transform)           | —                                                                        |
| `ClassesModule`     | Class CRUD, Subject CRUD, ClassSubject, Enrollment (bulk), ScheduleEntry + bentrok   | `/classes`, `/subjects`, `/class-subjects`, `/schedules`, `/enrollments` |
| `MaterialsModule`   | Material CRUD + publish/unpublish + signed URL                                       | `/materials`                                                             |
| `AssignmentsModule` | Assignment CRUD + publish/close, Submission (idempotent, late, grade)                | `/assignments`, `/submissions`                                           |
| `GradesModule`      | Grade, rekap siswa/kelas/mapel, ekspor CSV/PDF (`DataExportLog`)                     | `/grades`                                                                |
| `StorageModule`     | Penyimpanan file LOKAL (`STORAGE_LOCAL_DIR`, tanpa S3/MinIO) — lihat modul `storage` | —                                                                        |

## Import yang dibutuhkan (oleh integration)

```ts
// apps/api/src/app.module.ts
import { LmsModule } from "./modules/lms/lms.module";

@Module({
  imports: [
    // ...module existing,
    LmsModule
  ]
})
```

Cukup import `LmsModule`; submodul di-import internal. `APP_PIPE` yang dipasang
`LmsModule` bersifat global sehingga DTO class-validator semua controller LMS
berfungsi tanpa menyentuh `main.ts`.

## Prasyarat / dependensi yang belum ada (lihat ISSUES task)

1. **Guard RBAC (`@RequirePermission`)** belum ada di `common` saat modul ini
   ditulis. Service sudah menegakkan scope dasar (SENDIRI/KELAS/SEKOLAH) lewat
   `lms-scope.ts`; controller membaca konteks sementara dari header internal
   `x-user-id`, `x-user-role`, `x-user-classes`, `x-user-homeroom`
   (`lms-context.ts`) — semuanya bertanda `TODO RBAC(F1-T4)`.
   Integration: ganti header parsing dengan guard/auth guard resmi, header
   `Idempotency-Key` tetap dibaca dari request.
2. **Auth (F1)** harus mengisi header/konteks di atas; tanpa itu, role default
   kosong → endpoint tulis menolak (Forbidden), list dikembalikan kosong
   (default-secure).
3. **Storage nyata (F2-T4)** — `StorageService` menulis file ke filesystem lokal
   (`STORAGE_LOCAL_DIR`) dan URL akses via `GET /api/v1/storage/files/*`
   (tanpa S3/MinIO).
4. **Idempotensi distributed** — `SubmissionsService` memakai store in-process
   (`Map`) + unique `(assignment_id, student_id)`. Untuk multi-instance, schema
   Submission perlu kolom `idempotency_key` (migrasi oleh pemilik schema).
5. **Ekspor file** — ditulis ke `STORAGE_EXPORT_DIR` (default
   `./storage/exports`) + `DataExportLog`; integration pindahkan ke bucket
   `exports` bila perlu.

## Catatan perilaku

- Hapus Class = soft (is_active=false); hapus Subject/ClassSubject/ScheduleEntry
  = hard dengan guard FK (409 bila masih dipakai).
- Unenroll = status `DROPPED` (histori terjaga), bukan delete.
- Submit: `Idempotency-Key` wajib (400 tanpa); replay key sama tidak menulis
  ulang; ganti jawaban hanya sebelum deadline & belum dinilai; late
  (after due_at) → status `LATE`, dan ditolak bila `allow_late=false`.
- Grading menulis `Grade` (type TUGAS, `source_id` = submission id) via upsert
  - `AuditLog`; regrade aman.
- Rekap: rata-rata terbobot `sum(score*weight)/sum(weight)` per tipe & total.
