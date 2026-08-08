# README.smk.md — Modul SMK (apps/api/src/modules/smk)

## Fungsi Folder

Fitur khas SMK: **PKL** (magang + jurnal + verifikasi), **UKK** (uji kompetensi
dengan rubrik + penilaian), dan **direktori DUDI** (dunia usaha/dunia industri

- pembimbing industri). Identitas user dari `request.requestContext`.

## Daftar Fitur

- PKL: buat, list by mentor/student, jurnal, verifikasi jurnal, complete.
- UKK: buat uji kompetensi, tambah rubrik, nilai.
- DUDI: CRUD partner + mentor industri.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                      | Permission                                            | Deskripsi                  |
| ------ | ----------------------------------------- | ----------------------------------------------------- | -------------------------- |
| POST   | `/smk/internships`                        | `internship:write:school`                             | Buat PKL                   |
| GET    | `/smk/internships/by-mentor`              | `internship:write:school`/`journal:self`/`grade:self` | PKL by pembimbing          |
| GET    | `/smk/internships/by-student`             | `internship:write:school`/`journal:self`              | PKL by siswa               |
| POST   | `/smk/internships/:internshipId/journals` | `internship:journal:self`/`write:school`              | Tambah jurnal              |
| GET    | `/smk/internships/:internshipId/journals` | `internship:journal:self`/`write:school`/`grade:self` | Daftar jurnal              |
| PATCH  | `/smk/journals/:journalId/verify`         | `internship:journal:self`/`write:school`              | Verifikasi jurnal          |
| PATCH  | `/smk/internships/:internshipId/complete` | `internship:write:school`                             | Selesaikan PKL             |
| POST   | `/smk/competency-tests`                   | `competency:grade:school`                             | Buat UKK                   |
| POST   | `/smk/competency-tests/:testId/rubric`    | `competency:grade:school`                             | Tambah rubrik              |
| GET    | `/smk/competency-tests/by-examiner`       | `competency:grade:self`/`school`                      | Jadwal UKK by penguji      |
| POST   | `/smk/competency-tests/:testId/grade`     | `competency:grade:self`/`school`                      | Nilai UKK                  |
| GET    | `/smk/partners`                           | `partner:write:school`/`internship:write:school`      | Daftar DUDI                |
| POST   | `/smk/partners`                           | `partner:write:school`                                | Buat DUDI                  |
| PATCH  | `/smk/partners/:id`                       | `partner:write:school`                                | Update DUDI                |
| POST   | `/smk/partners/:partnerId/mentors`        | `partner:write:school`                                | Tambah pembimbing industri |
| GET    | `/smk/partners/:partnerId/mentors`        | `partner:write:school`                                | Daftar pembimbing          |

## Struktur File

| File                         | Isi           |
| ---------------------------- | ------------- |
| `smk.controller.ts`          | REST endpoint |
| `internship.service.ts`      | PKL + jurnal  |
| `competency-test.service.ts` | UKK + rubrik  |
| `partner.service.ts`         | DUDI + mentor |
| `dto/smk.dto.ts`             | DTO           |
