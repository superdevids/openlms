# REGISTRATION — Modul Asset (Gelombang 2, prd04 §5.G)

Status: **SIAP DIIMPLEMENTASI / PERSISTENCE W2 MENYUSUL** (lih. ISSUES).

## 1. Tujuan

Inventaris aset (kode unik, kategori, merk, tahun perolehan, harga perolehan,
masa manfaat, sumber dana), depresiasi garis lurus dihitung saat laporan,
booking dengan cek bentrok, maintenance, dan audit/opname berkala dengan
reklasifikasi RETIRED (prd04 §5.G.1–§5.G.3; 05 W2-ASSET).

## 2. Kontrak API (prefix `/api/v1/assets`)

| Method | Path                        | Permission                          | Deskripsi                                     |
| ------ | --------------------------- | ----------------------------------- | --------------------------------------------- |
| POST   | /                           | asset:write:school                  | Buat aset                                     |
| GET    | /                           | asset:read:school                   | Daftar aset (filter category/status/location) |
| GET    | /:id                        | asset:read:school                   | Detail aset                                   |
| POST   | /:id                        | asset:write:school                  | Ubah aset                                     |
| GET    | /reports/depreciation       | asset:read:school                   | Laporan nilai buku (dihitung saat laporan)    |
| GET    | /reports/depreciation/rekap | asset:read:school                   | Rekap depresiasi per kategori                 |
| POST   | /bookings                   | asset:book:self, asset:write:school | Booking ruang/alat (cek bentrok)              |
| GET    | /bookings                   | asset:read:school                   | Daftar booking                                |
| POST   | /bookings/:id/approve       | asset:write:school                  | Approve/Reject booking                        |
| POST   | /bookings/:id/cancel        | asset:book:self                     | Batalkan booking                              |
| POST   | /bookings/:id/complete      | asset:write:school                  | Selesaikan booking                            |
| POST   | /maintenance                | asset:maintenance:write:school      | Jadwal maintenance                            |
| GET    | /maintenance                | asset:read:school                   | Daftar maintenance                            |
| POST   | /maintenance/:id/status     | asset:maintenance:write:school      | Ubah status maintenance                       |
| POST   | /audits                     | asset:audit:school                  | Catat opname (selisih fisik vs buku)          |
| GET    | /audits                     | asset:audit:school                  | Daftar audit                                  |
| GET    | /audits/:id                 | asset:audit:school                  | Detail audit                                  |
| POST   | /audits/:id/approve-retired | asset:audit:school                  | Approval KEPSEK reklasifikasi RETIRED         |

RBAC aktif: guard global `AuthGuard` → `PermissionsGuard` (fail-closed).
Aktor dibaca dari `@CurrentUser` (AuthGuard); handler non-publik melempar
`UnauthorizedException` bila konteks autentikasi tidak ditemukan (tidak ada
fallback "system"). Header dev `x-user-id` / `x-user-roles` sudah dihapus.

## 3. Keputusan desain

- **Uang = Decimal (Prisma.Decimal, 12,2)**; DTO string desimal.
- **Depresiasi GARIS LURUS dihitung SAAT LAPORAN** (prd04 §5.G.2, keputusan
  B-3): `nilai_buku = harga − (harga/masa_manfaat × bulan)`; fungsi MURNI di
  `calculator/depreciation.ts` (teruji). Tidak disimpan per bulan — bebas drift.
- **Umur manfaat default per kategori** (konfigurasi, seed-data/assets.ts);
  bisa ditimpa `masaManfaatBulan` per aset.
- **Cek bentrok booking** (prd04 §5.G.3): overlap terhadap booking
  PENDING/APPROVED lain pada aset sama -> ditolak; dicek ulang saat approve.
- **Audit/opname**: catat selisih fisik vs buku; usulan reklasifikasi RETIRED
  wajib approval KEPSEK; saat disetujui status aset -> RETIRED (AuditLog).

## 4. Field/entitas yang BELUM ada di schema.prisma (butuh skema)

| Field/Entitas                                                                                   | Penggunaan saat ini                 | Proposal                                                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Asset.merk, tahun_perolehan, harga_perolehan, masa_manfaat_bulan, penanggung_jawab, sumber_dana | InMemoryAssetStore (AssetExtension) | tambah kolom di model `Asset` (merk String?, tahun_perolehan Int?, harga_perolehan Decimal?, masa_manfaat_bulan Int?, penanggung_jawab String?, sumber_dana enum?)                                        |
| enum AssetCategory KENDARAAN, PERALATAN_IT                                                      | — (DTO menerima; DB enum belum)     | perluasan enum `AssetCategory`                                                                                                                                                                            |
| AssetMaintenance                                                                                | InMemoryAssetStore                  | `model AssetMaintenance { id, asset_id FK, scheduled_at, completed_at?, cost Decimal, description, status, created_by, timestamps }`                                                                      |
| AssetAudit                                                                                      | InMemoryAssetStore                  | `model AssetAudit { id, asset_id FK, audit_date, audit_type, physical_qty?, book_qty, difference Int, note, propose_retired Boolean, status, approved_by_kepsek?, approved_at?, created_by, timestamps }` |

## 5. Unit test

- `calculator/depreciation.spec.ts` — nilai buku garis lurus, akumulasi,
  aset habis disusutkan, bulan berjalan sejak perolehan.
- `services/asset-booking.spec.ts` — bentrok jadwal (isTimeOverlap).
- `services/asset-audit.spec.ts` — opname selisih, status SELISIH/MATCH,
  approval RETIRED.

## 6. Hand-off

- Integration coder: `AssetModule` sudah terdaftar di `app.module.ts`; yang tersisa:
  tambah kolom/entitas skema + `PrismaAssetStore` (adapter AssetStore).
- Reviewer: periksa alur approval RETIRED & integritas cek bentrok.
