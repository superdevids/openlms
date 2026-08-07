# README.academic.md — Modul Academic (apps/api/src/modules/academic)

## Fungsi Folder

Data akademik: **prodi** (jurusan/kompetensi keahlian — SMK), **kurikulum**
(referensi CP/ATP), dan **jadwal pelajaran** akademik (CRUD + cek bentrok via
`schedule-validator`).

## Daftar Fitur

- Prodi: CRUD + nonaktifkan (soft) + filter.
- Kurikulum: list/filter phase & subjectCode, detail, upsert, hapus.
- Jadwal: CRUD + list filter classId/teacherId/academicYear + deteksi bentrok.

## Endpoint (prefix global `/api/v1`)

| Method | Path                       | Permission              | Deskripsi                                   |
| ------ | -------------------------- | ----------------------- | ------------------------------------------- |
| GET    | `/academic/prodi`          | `academic:prodi:read`   | Daftar prodi                                |
| GET    | `/academic/prodi/:id`      | `academic:prodi:read`   | Detail prodi                                |
| POST   | `/academic/prodi`          | `academic:prodi:write`  | Buat prodi                                  |
| PATCH  | `/academic/prodi/:id`      | `academic:prodi:write`  | Update prodi                                |
| DELETE | `/academic/prodi/:id`      | `academic:prodi:write`  | Nonaktifkan prodi                           |
| GET    | `/academic/curriculum`     | `subject:read:school`   | Daftar kurikulum (filter phase/subjectCode) |
| GET    | `/academic/curriculum/:id` | `subject:read:school`   | Detail kurikulum                            |
| POST   | `/academic/curriculum`     | `subject:write:school`  | Upsert kurikulum                            |
| DELETE | `/academic/curriculum/:id` | `subject:write:school`  | Hapus kurikulum                             |
| POST   | `/academic/schedules`      | `schedule:write:school` | Buat jadwal                                 |
| GET    | `/academic/schedules`      | `schedule:read:school`  | Daftar jadwal                               |
| PATCH  | `/academic/schedules/:id`  | `schedule:write:school` | Update jadwal                               |
| DELETE | `/academic/schedules/:id`  | `schedule:write:school` | Hapus jadwal                                |

## Struktur File

| File                                                 | Isi              |
| ---------------------------------------------------- | ---------------- |
| `prodi.controller.ts` / `prodi.service.ts`           | CRUD prodi       |
| `curriculum.controller.ts` / `curriculum.service.ts` | Kurikulum CP/ATP |
| `schedule.controller.ts` / `schedule.service.ts`     | Jadwal akademik  |
| `dto/`                                               | DTO              |
