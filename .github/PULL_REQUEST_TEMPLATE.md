## Deskripsi

Jelaskan tujuan perubahan ini, masalah yang diselesaikan, dan pendekatan yang dipakai.

## Issue Terkait

Tulis nomor issue yang ditutup/direferensikan, misalnya: `Closes #123`, `Refs #456`. Kosongkan bila tidak ada.

## Tipe Perubahan

Centang yang sesuai:

- [ ] **feat** — fitur baru
- [ ] **fix** — perbaikan bug
- [ ] **docs** — dokumentasi saja
- [ ] **refactor** — refactor tanpa mengubah perilaku
- [ ] **perf** — peningkatan performa
- [ ] **test** — test
- [ ] **chore** / **build** / **ci** — pemeliharaan

## Cara Menguji

1. Langkah persiapan (env, seed, migrasi).
2. Langkah reproduksi/verifikasi.
3. Hasil yang diharapkan.

## Checklist

Sebelum mengirim, pastikan:

- [ ] `npm run lint` lolos
- [ ] `npm run typecheck` lolos
- [ ] `npm run build` lolos
- [ ] `npm run test:unit` lolos
- [ ] `npm run test:integration` lolos (bila terdampak, butuh PostgreSQL)
- [ ] E2E terverifikasi (bila terdampak: `apps/api/test/app.e2e-spec.ts` butuh PostgreSQL; jalankan di CI job `integration`)
- [ ] Test relevan ditambahkan/diperbarui
- [ ] Kontrak API / `README.<modul>.md` diperbarui bila terdampak
- [ ] Migrasi Prisma baru disertakan bila skema berubah
- [ ] Tidak ada secret/token yang ter-commit
- [ ] Tidak ada referensi `eclass` yang tersisa (rebrand opensis)
- [ ] Perilaku yang diklaim terverifikasi terhadap implementasi nyata

## Screenshot (bila ada perubahan UI)

Lampirkan screenshot/video sebelum-sesudah (atau catatan "tidak ada perubahan UI").

## Catatan untuk Reviewer

Hal-hal yang perlu perhatian khusus saat review (contoh: perubahan keamanan, breaking change, area berisiko).
