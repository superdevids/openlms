# Registrasi Modul — PPDB (prd04 §5.J)

> ## STATUS: IMPLEMENTED — catatan historis (2026-08-16)
>
> Dokumen ini adalah **catatan historis** saat modul masih berbentuk registrasi
> awal. Implementasi aktual: RBAC global aktif — seluruh route memakai
> `@RequirePermission` (`ppdb:read:self`, `ppdb:verify:school`,
> `ppdb:select:school`, `ppdb:enroll:school`); register/track tetap `@Public`.
> Klaim "TODO RBAC" di bawah sudah usang.

**Status:** Sudah terdaftar di `app.module.ts` (imports: `PpdbModule`).

## Registrasi

```ts
import { PpdbModule } from "./modules/ppdb/ppdb.module";
// imports: [ ..., PpdbModule ]
```

## Endpoint

- `POST /ppdb/register` — form publik (@Public); **wajib consent** (ParentalConsent GRANTED + timestamp + bukti documentUrl). Menghasilkan `registration_no` sebagai token tracking.
- `GET /ppdb/track?registrationNo=` — tracking publik.
- `PATCH /ppdb/:id/verify` — OPERATOR → VERIFIED/REJECTED.
- `PATCH /ppdb/:id/select` / `waitlist` — seleksi skor 0-100 (status SELECTED/WAITLIST).
- `GET /ppdb/selection` — pengumuman (daftar lolos).
- `POST /ppdb/:id/enroll?academicYearId=&classId=` — UserRole SISWA + Enrollment; consent ditautkan ke siswa aktif; guard tahun CLOSED (ARCHIVED_YEAR).

## Catatan

- Pendaftar tanpa `user_id` tidak bisa enroll (perlu tautan akun oleh OPERATOR).
- TODO RBAC: register @Public; lainnya OPERATOR/WAKEPSEK.
  > **Pembaruan 2026-08-16:** RBAC global aktif — seluruh route memakai
  > `@RequirePermission` (`ppdb:read:self`, `ppdb:verify:school`, `ppdb:select:school`,
  > `ppdb:enroll:school` — `ppdb.controller.ts:49-99`); register/track tetap `@Public`.
- Unit test: `test/unit/ppdb.service.spec.ts` (konsentrasi: consent wajib).
