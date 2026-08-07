# README.ppdb.md — Modul PPDB (apps/api/src/modules/ppdb)

## Fungsi Folder

Penerimaan Peserta Didik Baru: pendaftaran **publik** (tanpa login), tracking
status pendaftar, verifikasi berkas, seleksi, waitlist, dan enroll ke kelas +
tahun ajaran (membuat akun siswa).

## Daftar Fitur

- Registrasi publik dengan consent + dokumen.
- Tracking status via nomor pendaftaran.
- Seleksi: list, verify, select, waitlist.
- Enroll: buat akun siswa + enrollment ke kelas + AcademicYear.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                                 | Permission                                | Deskripsi                 |
| ------ | ---------------------------------------------------- | ----------------------------------------- | ------------------------- |
| POST   | `/ppdb/register`                                     | Publik                                    | Daftar PPDB baru          |
| GET    | `/ppdb/track?registrationNo=`                        | `ppdb:read:self`                          | Tracking status pendaftar |
| GET    | `/ppdb/selection`                                    | `ppdb:verify:school`/`ppdb:select:school` | Daftar seleksi            |
| PATCH  | `/ppdb/:applicantId/verify`                          | `ppdb:verify:school`                      | Verifikasi berkas         |
| PATCH  | `/ppdb/:applicantId/select`                          | `ppdb:select:school`                      | Pilih diterima            |
| PATCH  | `/ppdb/:applicantId/waitlist`                        | `ppdb:select:school`                      | Masukkan waitlist         |
| POST   | `/ppdb/:applicantId/enroll?academicYearId=&classId=` | `ppdb:enroll:school`                      | Enroll ke kelas           |

## Struktur File

| File                 | Isi                             |
| -------------------- | ------------------------------- |
| `ppdb.controller.ts` | REST endpoint                   |
| `ppdb.service.ts`    | Registrasi/verify/select/enroll |
| `dto/ppdb.dto.ts`    | DTO                             |
