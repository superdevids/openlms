# Panduan Kontribusi — opensis

Terima kasih atas minat Anda untuk berkontribusi ke **opensis** (repository GitHub: `superdevids/openlms`). Dokumen ini menjelaskan cara berkontribusi secara konsisten: setup pengembangan, alur kerja git, konvensi commit, standar kode, persyaratan pengujian, proses pull request, checklist review, dan konvensi dokumentasi.

## Daftar Isi

- [Kode Etik](#kode-etik)
- [Mulai Berkontribusi](#mulai-berkontribusi)
- [Setup Pengembangan](#setup-pengembangan)
- [Alur Kerja Git & Branching](#alur-kerja-git--branching)
- [Konvensi Commit (Conventional Commits)](#konvensi-commit-conventional-commits)
- [Standar Kode](#standar-kode)
- [Persyaratan Pengujian](#persyaratan-pengujian)
- [Proses Pull Request](#proses-pull-request)
- [Checklist Code Review](#checklist-code-review)
- [Konvensi Dokumentasi](#konvensi-dokumentasi)
- [Definisi Selesai (Definition of Done)](#definisi-selesai-definition-of-done)

## Kode Etik

Dengan berpartisipasi dalam proyek ini, Anda setuju untuk mematuhi [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Semua kontributor wajib menciptakan lingkungan yang ramah, profesional, dan inklusif.

## Mulai Berkontribusi

1. **Fork & clone** repository: `git clone git@github.com:superdevids/openlms.git`
2. **Cari pekerjaan yang sesuai**:
   - Issue berlabel `good first issue` — cocok untuk kontributor baru.
   - Issue berlabel `bug` — laporan bug yang sudah dikonfirmasi.
   - Diskusikan ide besar (fitur baru, perubahan arsitektur) di issue terlebih dahulu sebelum menulis kode.
3. **Jangan pernah mengerjakan issue tanpa koordinasi** di komentar issue terlebih dahulu, agar tidak terjadi pekerjaan ganda.
4. **Baca dulu dokumen acuan** sebelum menyentuh area baru: [docs/02-technical-architecture.md](docs/02-technical-architecture.md) (arsitektur & ADR), [docs/03-database-erd.md](docs/03-database-erd.md) (data), [docs/04-api-contract.md](docs/04-api-contract.md) (kontrak API), [docs/knowledge-base.md](docs/knowledge-base.md) (peta proyek), dan untuk pekerjaan UI: [docs/app-design-system-v3.md](docs/app-design-system-v3.md) (design system) + [docs/landing-design-v2.md](docs/landing-design-v2.md) (desain landing).

## Setup Pengembangan

Prasyarat: Node.js ≥ 20 (rekomendasi 22), PostgreSQL ≥ 16. Redis opsional (hanya untuk antrean BullMQ).

```bash
npm install
cp .env.example .env   # isi nilai DATABASE_URL, JWT_* secret, dll.
npm run db:generate
npm run db:migrate
npm run db:seed        # seed data dev (idempotent); SUPERADMIN dev: admin / password
npm run dev
```

Login SUPERADMIN dev: username `admin`, password `password` (khusus development lokal). Detail di [README.md — Quick Start](README.md#quick-start-pengembangan).

## Alur Kerja Git & Branching

Kami memakai **trunk-based development dengan feature branch**:

- Branch utama: `main` (selalu dalam kondisi dapat dirilis).
- Setiap pekerjaan dibuat di branch terpisah dari `main`, lalu digabung via pull request.

**Konvensi nama branch:**

| Prefix      | Untuk                                                     |
| ----------- | --------------------------------------------------------- |
| `feat/`     | Fitur baru (`feat/lms-quiz`)                              |
| `fix/`      | Perbaikan bug (`fix/exam-autosave-400`)                   |
| `docs/`     | Perubahan dokumentasi (`docs/readme-update`)              |
| `refactor/` | Refactor tanpa perubahan perilaku (`refactor/rbac-guard`) |
| `test/`     | Penambahan/perbaikan test (`test/exam-e2e`)               |
| `chore/`    | Tugas pemeliharaan (`chore/deps-update`)                  |
| `perf/`     | Peningkatan performa (`perf/autosave-batching`)           |
| `ci/`       | Perubahan pipeline CI (`ci/add-coverage-gate`)            |

**Aturan:**

- Branch diambil dari `main` terbaru: `git checkout main && git pull && git checkout -b feat/nama-fitur`.
- Push branch ke fork/remote Anda, lalu buka pull request ke `main`.
- Jaga commit kecil, fokus, dan mudah direview.
- `main` hanya diubah melalui pull request — jangan push langsung (kecuali maintainer).
- Satu PR untuk satu tujuan; pisahkan perubahan dokumentasi, refactor, dan fitur ke PR yang berbeda bila memungkinkan.

## Konvensi Commit (Conventional Commits)

Semua commit wajib mengikuti [Conventional Commits](https://www.conventionalcommits.org/) agar changelog dapat di-generate secara otomatis dan riwayat mudah dibaca.

Format: `<type>(<scope>): <deskripsi>`

| Type       | Arti                                       |
| ---------- | ------------------------------------------ |
| `feat`     | Fitur baru                                 |
| `fix`      | Perbaikan bug                              |
| `docs`     | Perubahan dokumentasi saja                 |
| `style`    | Format, whitespace, tanpa perubahan logika |
| `refactor` | Refactor tanpa mengubah perilaku           |
| `perf`     | Peningkatan performa                       |
| `test`     | Menambah/memperbaiki test                  |
| `build`    | Perubahan build system/dependencies        |
| `ci`       | Perubahan konfigurasi CI                   |
| `chore`    | Lainnya (maintenance)                      |

**Contoh:**

```
feat(exam): terima batch answers pada autosave ujian
fix(auth): buat cookie sesi saat login
docs(readme): tambahkan tabel env RATE_LIMIT
refactor(rbac): cache resolusi scope permission
test(finance): tambah matrix IDOR invoice
```

**Catatan:**

- Deskripsi commit dalam Bahasa Indonesia (konsisten dengan dokumentasi proyek).
- Boleh menambahkan `BREAKING CHANGE:` di body untuk perubahan yang memutus kompatibilitas.
- Referensikan issue bila relevan: `fix(ppdb): perbaiki rollback #123`.

## Standar Kode

Proyek memakai **ESLint** + **Prettier** + **TypeScript strict**, dengan aturan dependensi monorepo yang ditegakkan ESLint `import/no-restricted-paths` dan Turborepo [docs/02-technical-architecture.md §3](docs/02-technical-architecture.md):

- `web → api` hanya via HTTP; `web → packages/{ui,types}`.
- `api → packages/{database,types}`.
- `packages/database → packages/types` (enum).

**Sebelum push, pastikan lolos:**

```bash
npm run lint          # ESLint semua workspace
npm run typecheck     # TypeScript --noEmit semua workspace
npx prettier --check .
```

**Aturan implementasi:**

- Ikuti pola arsitektur yang ada: **Controller → Service → Repository** di `apps/api`; Server Components untuk data-fetching di `apps/web`; Client Components hanya untuk interaktivitas.
- **UI wajib memakai komponen shared dari `packages/ui`** — jangan membuat komponen duplikat; ikuti [docs/app-design-system-v3.md](docs/app-design-system-v3.md) (token, warna, tipografi, komponen) dan [docs/landing-design-v2.md](docs/landing-design-v2.md) untuk halaman landing.
- Setiap query Prisma di repository **wajib memfilter scope RBAC** (SENDIRI/KELAS/SEKOLAH) — jangan query tanpa scope kecuali modul global (User, SchoolProfile).
- Alur kritis (autosave ujian, scan QR, pembayaran) **wajib idempotent** — pakai `Idempotency-Key`; perubahan data sensitif tulis `AuditLog`.
- Gunakan satu sumber `PrismaClient` (singleton dari `DatabaseModule`) — **jangan** membuat `new PrismaClient()` baru.
- Semua jumlah uang memakai kalkulator sen (`calculator/money.ts`) — hindari floating point.
- Jangan menambahkan dependensi API pihak ketiga untuk fitur (keputusan no-third-party, [docs/prd/prd04.md §5.O](docs/prd/prd04.md)).
- Jangan menambahkan object storage S3/MinIO — storage aplikasi adalah lokal (`STORAGE_LOCAL_DIR`).
- Path alias resmi: `@opensis/*` → `./packages/*/src` (lihat `tsconfig.base.json`).
- Konten user-facing (UI, README, pesan error) ditulis dalam **Bahasa Indonesia baku**.

## Persyaratan Pengujian

Setiap perubahan **wajib disertai test** yang relevan:

| Lapisan     | Framework        | Cakupan                                                                                         |
| ----------- | ---------------- | ----------------------------------------------------------------------------------------------- |
| Unit        | Jest             | Logika murni: auto-grade, guard RBAC (matrix role×aksi), perhitungan tagihan, validasi token QR |
| Integration | Jest + Supertest | Alur lintas layer dengan PostgreSQL: ujian E2E alur, scan QR absensi, isolasi scope RBAC        |
| Web         | Vitest           | Utilitas frontend, komponen & halaman (berjalan tanpa server)                                   |
| E2E         | Playwright       | Alur pengguna lintas UI (roadmap, lihat [prd05 G-60](docs/prd/prd05.md))                        |

**Aturan:**

- `npm run test:unit` — tanpa database, harus selalu hijau.
- `npm run test:integration` — butuh PostgreSQL (CI menyediakan service postgres; lokal dapat memakai `docker compose up -d`).
- Jangan menurunkan coverage modul kritis (auth, RBAC, exam, finance) — target coverage **≥ 80%** bertahap ([prd05 G-60/G-61](docs/prd/prd05.md), [prd06 §4](docs/prd/prd06.md)).
- Perubahan yang menyentuh kontrak API wajib menyinkronkan: DTO/service di API, klien di web, dan `README.<modul>.md`.
- Perubahan skema Prisma wajib disertai file migrasi baru (jangan mengedit migrasi yang sudah diterapkan).

## Proses Pull Request

1. Isi [template pull request](.github/PULL_REQUEST_TEMPLATE.md) dengan lengkap: deskripsi, tipe perubahan, cara test, dan checklist.
2. Pastikan branch Anda up-to-date dengan `main`.
3. CI (`.github/workflows/ci.yml`) akan menjalankan **7 gate**: lint → typecheck → unit → integration → build → npm audit → secret scan. **PR hanya bisa digabung bila semua job hijau.**
4. Tag reviewer yang relevan; maintainer akan me-review dalam 1–2 hari kerja.

**Tipe PR yang tidak akan diterima:**

- Perubahan tanpa test yang relevan.
- Perubahan yang menurunkan kualitas (lint/typecheck gagal).
- Referensi `eclass` yang tersisa (proyek telah di-rebrand; target nol referensi lama).
- Commit yang menggabungkan banyak tujuan berbeda dalam satu PR.
- Perubahan yang menambah dependensi API fitur pihak ketiga atau object storage.

## Checklist Code Review

Review dilakukan oleh minimal satu maintainer; perubahan sensitif (auth, keamanan, keuangan, payroll) memerlukan review maintainer inti. Reviewer memeriksa:

- [ ] **Kebenaran fungsional** — perilaku sesuai deskripsi dan terverifikasi terhadap implementasi nyata.
- [ ] **Keamanan** — IDOR (uji scope SENDIRI/KELAS/SEKOLAH), XSS (sanitasi konten), CSRF (mutasi cookie), secrets tidak bocor, rate limit tidak dilewati.
- [ ] **Otorisasi** — endpoint memakai `@RequirePermission` yang benar; endpoint publik ditandai `@Public()` secara eksplisit.
- [ ] **Idempotensi & audit** — alur kritis idempotent; perubahan data sensitif menulis `AuditLog`.
- [ ] **Kualitas kode** — mengikuti pola Controller → Service → Repository; tanpa `any` yang tidak perlu; tidak ada duplikasi.
- [ ] **Cakupan test** — test relevan ada, hijau, dan menguji kasus negatif (403/404/409) selain kasus sukses.
- [ ] **Dokumentasi** — `README.<modul>.md` diperbarui bila kontrak API berubah; dokumentasi user-facing dalam Bahasa Indonesia.
- [ ] **Skema & migrasi** — perubahan Prisma disertai migrasi baru; tidak mengedit migrasi terterapkan.

Semua komentar review wajib dijawab; diskusi diselesaikan di dalam PR (bukan via chat pribadi) agar jejak keputusan terekam. Setelah disetujui, maintainer menggabungkan (squash merge) dengan pesan commit sesuai Conventional Commits.

## Konvensi Dokumentasi

Dokumentasi adalah bagian dari produk, bukan pelengkap. Aturan wajib:

- **Bahasa**: Bahasa Indonesia baku untuk semua konten user-facing; Inggris untuk file konvensi OSS (LICENSE, CODE_OF_CONDUCT).
- **Akurasi**: setiap klaim teknis wajib sesuai implementasi nyata; bagian yang belum terverifikasi ditandai eksplisit — jangan menulis dokumentasi fitur yang belum ada.
- **Modul baru wajib README**: setiap modul di `apps/api/src/modules/` wajib memiliki `README.<modul>.md` yang memuat daftar endpoint, permission, dan deskripsi, plus `README.registration.md` untuk kontrak registrasi modul (contoh: [README.auth.md](apps/api/src/modules/auth/README.auth.md)).
- **Sinkronisasi kontrak**: saat endpoint/permission berubah, perbarui `README.<modul>.md` dan [docs/04-api-contract.md](docs/04-api-contract.md) pada PR yang sama.
- **Keputusan arsitektur**: keputusan yang mengubah desain dicatat sebagai ADR di [docs/02-technical-architecture.md §16](docs/02-technical-architecture.md).
- **Indeks**: daftarkan dokumen baru di [docs/README.docs.md](docs/README.docs.md).
- **Gaya**: BLUF (kesimpulan di awal), tabel untuk data terstruktur, blok kode diberi bahasa, tidak ada tautan rusak.

## Definisi Selesai (Definition of Done)

Sebuah PR dianggap selesai bila:

- [ ] Kode memenuhi standar proyek (lint + typecheck hijau).
- [ ] Test unit & integration relevan ditambahkan/diperbarui dan hijau.
- [ ] Kontrak API dan dokumentasi modul diperbarui bila terdampak.
- [ ] Tidak ada secret/`token` yang bocor (cek `.gitleaks.toml`).
- [ ] Tidak ada referensi `eclass` yang tersisa.
- [ ] Perilaku yang diklaim terverifikasi terhadap implementasi nyata (bukan asumsi).
