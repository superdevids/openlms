# Registrasi Modul — Komunikasi (pengumuman & surat)

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
- Unit test: `test/unit/communication.service.spec.ts`.
