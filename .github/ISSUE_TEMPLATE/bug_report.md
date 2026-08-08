---
name: Laporan Bug
about: Laporkan perilaku yang tidak sesuai agar dapat diperbaiki
title: "[Bug]: "
labels: ["bug"]
assignees: ""
---

## Deskripsi Bug

Jelaskan secara singkat dan jelas apa yang terjadi. Sertakan konteks: halaman/endpoint apa, peran apa yang dipakai, dan langkah apa yang dilakukan.

## Langkah Reproduksi

1. Buka halaman `...` / panggil endpoint `...`
2. Login sebagai role `...`
3. Lakukan `...`
4. Lihat error pada `...`

## Perilaku yang Diharapkan

Apa yang seharusnya terjadi?

## Perilaku Aktual

Apa yang benar-benar terjadi? Sertakan pesan error lengkap bila ada.

## Bukti (opsional)

- [ ] Screenshot
- [ ] Log / output terminal
- [ ] Request/response API

## Lingkungan

- OS: (contoh: Windows 11, Ubuntu 24.04)
- Browser & versi: (contoh: Chrome 126)
- Versi Node.js: (contoh: 22.12.0 — lihat `engines` di `package.json`)
- Mode: Development / Production / Staging
- Versi opensis / branch: (contoh: `0.5.0` / `main`)
- Database: PostgreSQL versi `...` (Redis: ya/tidak)

## Severity

Pilih level dampak (perkiraan; keputusan final di triage pengembang):

- [ ] **Critical** — data hilang/corrupt, akses tidak sah, layanan down total
- [ ] **High** — fitur utama tidak berfungsi tanpa workaround
- [ ] **Medium** — fitur terganggu, ada workaround
- [ ] **Low** — kosmetik/UX minor

## Klasifikasi (diisi pengembang saat triage)

- [ ] Bug fungsional
- [ ] Bug keamanan — **jangan** isi detail di sini; gunakan [Private Vulnerability Reporting](https://github.com/superdevids/openlms/security/advisories) (lihat SECURITY.md)
- [ ] Bug performa
- [ ] Bug aksesibilitas / UI

## Informasi Tambahan

Catatan lain yang relevan, pekerjaan yang sudah dicoba, atau dugaan penyebab.
