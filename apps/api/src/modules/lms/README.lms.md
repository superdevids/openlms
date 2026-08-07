# README.lms.md — Modul LMS Inti (apps/api/src/modules/lms)

## Fungsi Folder

Modul LMS inti: kelas, mapel, guru pengampu, enrollment, jadwal, materi, tugas,
submission, dan penilaian. `LmsModule` juga memasang `APP_PIPE` global
(ValidationPipe whitelist+transform). Submodul: `classes/`, `materials/`,
`assignments/`, `grades/`, `storage/` (penyimpanan file lokal).

## Daftar Fitur

- CRUD Class, Subject, ClassSubject, Enrollment (bulk), ScheduleEntry + cek bentrok.
- Materi: CRUD + publish/unpublish + signed URL upload (storage lokal).
- Tugas: CRUD + publish/close; submission idempotent (Idempotency-Key), deteksi late.
- Nilai: rekam nilai, rekap per siswa/kelas/mapel, ekspor CSV/PDF (DataExportLog).
- Scope dasar ditegakkan di service (`lms-scope.ts`).

## Endpoint (prefix global `/api/v1`)

| Method           | Path                                          | Permission                                       | Deskripsi                 |
| ---------------- | --------------------------------------------- | ------------------------------------------------ | ------------------------- |
| GET              | `/classes`                                    | `class:read:class`/`class:read:school`           | Daftar kelas              |
| POST             | `/classes`                                    | `class:write:school`                             | Buat kelas                |
| GET              | `/classes/:id`                                | `class:read:class`/`class:read:school`           | Detail kelas              |
| PATCH            | `/classes/:id`                                | `class:write:school`                             | Update kelas              |
| DELETE           | `/classes/:id`                                | `class:write:school`                             | Nonaktifkan kelas (soft)  |
| POST             | `/classes/:id/enroll`                         | `enrollment:manage:school`                       | Enroll bulk siswa         |
| POST             | `/classes/:id/unenroll`                       | `enrollment:manage:school`                       | Unenroll (status DROPPED) |
| GET              | `/classes/:id/students`                       | `class:read:class`/`class:read:school`           | Daftar siswa kelas        |
| GET/POST         | `/subjects`                                   | `subject:read:school` / `subject:write:school`   | Daftar/buat mapel         |
| GET/PATCH/DELETE | `/subjects/:id`                               | `subject:*`                                      | CRUD mapel                |
| GET/POST         | `/class-subjects`                             | `class:read:*` / `classsubject:write:school`     | Guru pengampu             |
| GET/PATCH/DELETE | `/class-subjects/:id`                         | `classsubject:write:school`                      | CRUD guru pengampu        |
| GET/POST         | `/schedules`                                  | `schedule:read:school` / `schedule:write:school` | Jadwal                    |
| GET/PATCH/DELETE | `/schedules/:id`                              | `schedule:*`                                     | CRUD jadwal               |
| PATCH            | `/enrollments/status?classId=`                | `enrollment:manage:school`                       | Ubah status enrollment    |
| GET              | `/materials`                                  | `material:read:class`                            | Daftar materi             |
| POST             | `/materials`                                  | `material:write:class`                           | Buat materi               |
| POST             | `/materials/signed-url`                       | `material:write:class`                           | Minta signed URL upload   |
| GET/PATCH/DELETE | `/materials/:id`                              | `material:*`                                     | CRUD materi               |
| PATCH            | `/materials/:id/publish` / `unpublish`        | `material:write:class`                           | Publikasi materi          |
| GET              | `/assignments`                                | `assignment:read:class`                          | Daftar tugas              |
| POST             | `/assignments`                                | `assignment:write:class`                         | Buat tugas                |
| GET/PATCH/DELETE | `/assignments/:id`                            | `assignment:*`                                   | CRUD tugas                |
| POST             | `/assignments/:id/publish` / `close`          | `assignment:publish:class`                       | Publikasi/tutup           |
| POST             | `/assignments/:id/submissions/upload-url`     | `submission:submit:self`                         | Upload URL submission     |
| POST             | `/assignments/:id/submissions`                | `submission:submit:self`                         | Submit (Idempotency-Key)  |
| GET              | `/assignments/:id/submissions`                | `submission:read:self`/`class`                   | Daftar submission         |
| PATCH            | `/submissions/:id/grade`                      | `submission:grade:class`                         | Nilai submission          |
| DELETE           | `/submissions/:id`                            | `submission:submit:self`/`grade:class`           | Batalkan submission       |
| GET/POST         | `/grades`                                     | `submission:grade:class`/`report:read:*`         | Nilai                     |
| GET              | `/grades/recap/student/:studentId`            | `report:read:self`/`class`/`school`              | Rekap siswa               |
| GET              | `/grades/recap/class/:classId`                | `report:read:class`/`school`                     | Rekap kelas               |
| GET              | `/grades/recap/class-subject/:classSubjectId` | `report:read:class`/`school`                     | Rekap mapel               |
| POST             | `/grades/export/csv` / `export/pdf`           | `report:export:class`/`school`                   | Ekspor nilai              |

## Struktur File

| Folder/File                                        | Isi                                                                                                             |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `classes/`                                         | ClassesService, SubjectsService, ClassSubjectsService, EnrollmentsService, SchedulesService, schedule-validator |
| `materials/`                                       | MaterialsService (CRUD + signed URL)                                                                            |
| `assignments/`                                     | AssignmentsService + SubmissionsService                                                                         |
| `grades/`                                          | GradesService + GradeExportService                                                                              |
| `storage/`                                         | StorageService lokal (`STORAGE_LOCAL_DIR`)                                                                      |
| `lms-scope.ts` / `lms-context.ts` / `lms-audit.ts` | Scope, konteks, audit                                                                                           |
