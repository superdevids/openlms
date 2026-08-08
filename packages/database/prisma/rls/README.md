# RLS Opsional — opensis (F0-T5)

RLS PostgreSQL adalah **lapisan kedua (defense-in-depth)**. Lapisan utama tetaplah
guard RBAC NestJS (`@RequirePermission` + scope SENDIRI/KELAS/SEKOLAH) — docs/03 §7,
docs/02 §2 P1.

Prinsip (docs/03-database-erd.md §7):

- **Tanpa dimensi tenant / tanpa `school_id`** — single-school.
- Satu session variable: `app.user_id` (bukan tenant).
- Prisma memakai `$transaction` dengan `SET LOCAL` di awal:
  ```sql
  SELECT set_config('app.user_id', $1, true); -- scope transaksi
  ```

## Cara mengaktifkan (opsional)

RLS **tidak diaktifkan otomatis oleh migrasi**. Untuk mengaktifkan:

```bash
psql "$DATABASE_URL" -f packages/database/prisma/rls/01_enable_rls.sql
psql "$DATABASE_URL" -f packages/database/prisma/rls/02_session_variable.sql
psql "$DATABASE_URL" -f packages/database/prisma/rls/03_policies.sql
```

Catatan: `01_enable_rls.sql` bersifat non-destruktif (idempotent, `IF NOT EXISTS`).
Saat RLS aktif, **migrasi Prisma dan seed harus memakai role yang bisa bypass RLS**
(owner/superuser), atau migrasi gagal — lihat docs/03 §7.3.

## Catatan test scope RBAC

Test **isolasi scope RBAC (SENDIRI/KELAS/SEKOLAH)** adalah bagian wajib G6
(docs/03 §7, docs/02 §14). Skeleton test: `apps/api/test/rbac-scope.skeleton.spec.ts`
(skip default di CI sampai guard RBAC F1-T4 terpasang).

Asersi yang harus dipenuhi saat guard aktif (F1):

1. User scope SENDIRI hanya bisa membaca/menulis data miliknya.
2. User scope KELAS hanya bisa membaca/menulis data kelasnya (termasuk homeroom override).
3. Role dengan scope SEKOLAH bisa mengakses seluruh data sekolah.
4. Akses lintas scope selalu gagal (403) — baik lewat API maupun repository.
