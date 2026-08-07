# AppSettingsModule — Registrasi (prd04 §5.D/§9.1, /app/settings)

## Class yang tersedia

| Class                   | Tipe       | Peran                                                                                                          |
| ----------------------- | ---------- | -------------------------------------------------------------------------------------------------------------- |
| `AppSettingsModule`     | Module     | Registrasi controller + service                                                                                |
| `AppSettingsController` | Controller | `GET /app/settings` (`app:read:school`), `PATCH /app/settings` (`app:write:school`)                            |
| `AppSettingsService`    | Provider   | Baca/ubah SchoolProfile (profil sekolah, ambang, current_academic_year_id, settings Json) + AuditLog           |
| `UpdateAppSettingsDto`  | DTO        | `name/npsn/school_type/address/phone/email/timezone/current_academic_year_id/settings` (validasi NPSN 8 digit) |

## Import yang dibutuhkan di app.module.ts

```ts
import { AppSettingsModule } from "./modules/app-settings/app-settings.module";
// di imports: AppSettingsModule
```

## Catatan

- Data disimpan di tabel `SchoolProfile` (single-school, tanpa school_id).
- `settings` di-merge shallow-deep (objek bersarang digabung, mis. `attendance`).
- Provider DB lokal: `{ provide: PrismaClient, useValue: prisma }`.

## Verifikasi

- `GET /api/v1/app/settings` → profil + settings; `PATCH` dengan NPSN salah → 400
  VALIDATION_ERROR.
