# E2E Playwright — apps/web

Smoke E2E untuk memverifikasi aplikasi web opensis bisa dimuat oleh browser nyata
(Chromium). Saat ini hanya menguji **render publik** — bukan autentikasi/DB.

## Prasyarat

Stack harus berjalan sebelum menjalankan test (test TIDAK auto-start server):

```bash
# Opsi 1 — Docker (recommended): DB + API + web, web di http://localhost
docker compose up -d

# Opsi 2 — dev lokal (dua terminal)
npm run db:migrate && npm run db:seed        # sekali saja, dari root repo
npm run dev --workspace=@opensis/api         # http://localhost:3001
npm run dev --workspace=@opensis/web         # http://localhost:3000
```

Base URL default test: `http://localhost:3000`. Bila memakai Nginx (`:80`) atau
port lain, set env:

```bash
$env:E2E_BASE_URL = "http://localhost"   # PowerShell
E2E_BASE_URL=http://localhost npm run test:e2e   # bash/zsh
```

## Menjalankan

```bash
# 1. Install browser Chromium (sekali saja, setelah npm install)
npx playwright install chromium

# 2. Jalankan test (dari apps/web atau root repo)
npm run test:e2e --workspace=@opensis/web
```

Report HTML tersedia di `playwright-report/` setelah test selesai
(`npx playwright show-report` untuk membukanya).

## Cakupan & roadmap

| Status     | Coverage                                                           |
| ---------- | ------------------------------------------------------------------ |
| ✅ Selesai | Smoke render: landing (`/`) + login (`/login`)                     |
| ⏭️ Roadmap | Login nyata (SUPERADMIN/operator dari seed) → dashboard siswa/guru |
| ⏭️ Roadmap | Alur ujian siswa (ambil ujian → kerjakan → submit)                 |
| ⏭️ Roadmap | Alur guru: bank soal → buat ujian → penilaian                      |
| ⏭️ Roadmap | Alur superadmin: onboarding/branding → admin-sistem → RBAC         |

Test login nyata akan butuh kredensial via env (`E2E_ADMIN_USERNAME`,
`E2E_ADMIN_PASSWORD`) — jangan hardcode rahasia seed di spec.
