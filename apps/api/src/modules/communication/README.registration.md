# Registrasi Modul — Komunikasi (pengumuman & surat)

> ## STATUS: IMPLEMENTED — catatan historis (2026-08-16)
>
> Dokumen ini adalah **catatan historis** saat modul masih berbentuk registrasi
> awal. Implementasi aktual: RBAC global aktif — seluruh route memakai
> `@RequirePermission` (`announcement:*`, `letter:request:self`,
> `letter:approve:school`, `letter:read:school`). Klaim "TODO RBAC" di bawah
> sudah usang. Tanda tangan digital tetap DITUNDA (`sign()` → 403 FEATURE_DISABLED).

**Status:** Sudah terdaftar di `app.module.ts` (imports: `CommunicationModule`).

## Registrasi

```ts
import { CommunicationModule } from "./modules/communication/communication.module";
// imports: [ ..., CommunicationModule ]
```

## Endpoint

- Announcement: `POST/GET /communication/announcements`, `PATCH/DELETE :id`, `PATCH :id/publish|unpublish`.
  - Status diwakili `published_at` (null = draft); read broadcast difilter `target_role` + sudah terbit.
- OfficialLetter: `POST /communication/letters`, `POST :id/submit|approve|reject|sign`, `GET /communication/letters`.
  - Alur: DRAFT → SUBMITTED → APPROVED/REJECTED; `letter_no` dibuat saat approve.
  - **Tanda tangan digital DITUNDA** → `sign()` selalu 403 FEATURE_DISABLED (prd04).

## Catatan

- TODO RBAC: tulis pengumuman OPERATOR/WAKEPSEK/KEPSEK; approval surat KEPSEK/WAKEPSEK; pemohon hanya surat miliknya (SENDIRI).
  > **Pembaruan 2026-08-16:** RBAC global aktif — seluruh route memakai
  > `@RequirePermission` (`announcement:*`, `letter:request:self`,
  > `letter:approve:school`, `letter:read:school` — `communication.controller.ts:40-130`).
- Unit test: `test/unit/communication.service.spec.ts`.
