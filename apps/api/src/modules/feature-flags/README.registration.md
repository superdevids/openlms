# FeatureFlagsModule — Registrasi (F1-T13, prd04 §5.N)

## Class yang tersedia

| Class                    | Tipe       | Peran                                                                                    |
| ------------------------ | ---------- | ---------------------------------------------------------------------------------------- |
| `FeatureFlagsModule`     | Module     | Registrasi controller + service                                                          |
| `FeatureFlagsController` | Controller | `GET/PATCH /app/feature-flags` (SUPERADMIN + permission `featureflag:read/write:school`) |
| `FeatureFlagsService`    | Provider   | List flag + nilai efektif; update (locked/is_system guard); AuditLog                     |
| `UpdateFeatureFlagDto`   | DTO        | `{ enabled?, config? }`                                                                  |

Guard `FeatureFlagGuard` (global, di `common/feature-flag.guard.ts`) didaftarkan
di AuthModule — modul fitur cukup memakai dekorator `@Feature('KEY')`.

## Import yang dibutuhkan di app.module.ts

```ts
import { FeatureFlagsModule } from "./modules/feature-flags/feature-flags.module";
// di imports: FeatureFlagsModule
```

## Catatan

- Nilai efektif: `AppFeatureSetting.enabled`, fallback `FeatureFlag.default_enabled`.
- Flag `locked` tidak bisa diubah; `is_system` (LMS_BASE) tidak bisa dimatikan.
- Kode error `FEATURE_DISABLED` dibawa di body exception; `AllExceptionsFilter`
  saat ini memetakan 403 → `FORBIDDEN` (perlu penyesuaian filter agar kode
  FEATURE_DISABLED muncul di respons — di luar scope file yang diizinkan, lihat ISSUES).

## Verifikasi

- Unit: `apps/api/src/modules/feature-flags/feature-flag.guard.spec.ts`
- Manual: `PATCH /api/v1/app/feature-flags/PPDB { "enabled": false }` → akses route
  ber-`@Feature('PPDB')` ditolak 403.
