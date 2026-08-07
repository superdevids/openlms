# README.feature-flags.md — Modul Feature Flags (apps/api/src/modules/feature-flags)

## Fungsi Folder

Konsol **feature flags** global (`FeatureFlag` + `AppFeatureSetting`), dikendalikan
SUPERADMIN. Nilai efektif: `AppFeatureSetting.enabled`, fallback
`FeatureFlag.default_enabled`; flag sistem (`is_system`) selalu ON dan tidak bisa
dimatikan; flag `locked` tidak bisa diubah. Perubahan tercatat di `AuditLog`.

## Daftar Fitur

- Daftar flag + nilai efektif (di-cache in-memory, TTL `CACHE_TTL_MS` default 30s).
- Update flag; invalidasi cache `list()` **dan** cache `FeatureFlagGuard`
  agar gating `@Feature` langsung berlaku.
- Guard global `FeatureFlagGuard` (common) menolak endpoint ber-`@Feature('KEY')`
  dengan 403 `FEATURE_DISABLED` saat flag OFF (fail-closed).

## Endpoint (prefix global `/api/v1`)

| Method | Path                      | Permission                              | Deskripsi                                             |
| ------ | ------------------------- | --------------------------------------- | ----------------------------------------------------- |
| GET    | `/app/feature-flags`      | `featureflag:read:school` (SUPERADMIN)  | Daftar flag + nilai efektif                           |
| PATCH  | `/app/feature-flags/:key` | `featureflag:write:school` (SUPERADMIN) | Ubah `enabled`/`config` + AuditLog + invalidasi cache |

## Struktur File

| File                             | Isi                     |
| -------------------------------- | ----------------------- |
| `feature-flags.controller.ts`    | REST endpoint           |
| `feature-flags.service.ts`       | List/update + cache TTL |
| `feature-flag.guard.spec.ts`     | Unit test guard         |
| `dto/update-feature-flag.dto.ts` | DTO update              |
