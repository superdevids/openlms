# OnboardingModule — Registrasi (F1-T5/T6, prd04 §9.1/9.2)

## Class yang tersedia

| Class                                           | Tipe       | Peran                                                                                                      |
| ----------------------------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------- |
| `OnboardingModule`                              | Module     | Registrasi controller + service; impor `AuthModule` (InvitationsService)                                   |
| `OnboardingController`                          | Controller | `GET/PATCH /app/onboarding` + `step-1..step-5`                                                             |
| `OnboardingService`                             | Provider   | Wizard 5 langkah; progres di `SchoolProfile.settings.onboarding`                                           |
| `ImportController`                              | Controller | `GET /app/import/templates`, `POST /app/import/preview`, `POST /app/import/run`, `GET /app/import/batches` |
| `ImportService`                                 | Provider   | Validasi NISN (10 digit)/NUPTK (16 digit), preview, commit `ImportBatch`/`ImportError`, buat data dasar    |
| `OnboardingStep1Dto/2Dto/4Dto`, `ImportRowsDto` | DTO        | Validasi class-validator                                                                                   |

## Import yang dibutuhkan di app.module.ts

```ts
import { OnboardingModule } from "./modules/onboarding/onboarding.module";
// di imports: OnboardingModule
```

## Catatan

- Langkah: 1 Profil sekolah → 2 Data dasar → 3 Impor → 4 Undang → 5 Selesai & tur.
- Progres sementara di `SchoolProfile.settings.onboarding` — usulan tabel Onboarding
  khusus di ISSUES.
- Import mendukung STUDENT/TEACHER/CLASS; ASSIGNMENT → 400 (belum didukung).
- Permission: `app:read/write:school`, `import:preview/run:school`, `invitation:send:school`.

## Verifikasi

- Unit: `ImportService.preview` validasi NISN/NUPTK (via test auth/service bila diuji),
  wizard status via unit/onboarding.
- Manual: `POST /api/v1/app/import/preview` dengan baris NISN salah → `errorCount > 0`.
