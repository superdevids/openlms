# Attendance Module — Registration Guide

Modul absensi (manual + QR + izin/sakit + rekap & kedisiplinan) implementasi
prd04 §5.A.7 dan tek-05 M-ABSQR-T1..T9. **Modul ini sudah didaftarkan** di
`app.module.ts` (imports: `AttendanceModule`); bagian registrasi di bawah adalah
dokumentasi kontrak.

## 1. Registrasi (SUDAH TERPASANG di app.module.ts)

Referensi bentuk registrasi yang sudah aktif di `apps/api/src/app.module.ts`:

```ts
import { AttendanceModule } from "./modules/attendance/attendance.module";

@Module({
  imports: [
    // ...modul lain
    AttendanceModule,
  ],
})
```

`AttendanceModule` menyediakan `PrismaClient` via singleton `prisma`
(`@openlms/database`), jadi tidak butuh provider tambahan.

## 2. Kontrak endpoint (prefix global `/api/v1`)

| Method | Path                              | Fungsi                                                   |
| ------ | --------------------------------- | -------------------------------------------------------- |
| POST   | `/attendance/manual`              | Absensi manual bulk oleh guru (MVP)                      |
| POST   | `/attendance/sessions`            | Buat sesi absensi (QR_CODE / GEOFENCING / MANUAL)        |
| GET    | `/attendance/sessions/:id`        | Detail sesi + hasil scan                                 |
| POST   | `/attendance/sessions/:id/tokens` | Generate token QR sekali pakai (TTL 5-10 mnt, default 7) |
| POST   | `/attendance/records/scan`        | Scan QR (idempotent via `Idempotency-Key`; reuse -> 409) |
| POST   | `/attendance/permits`             | Pengajuan izin/sakit + path surat                        |
| POST   | `/attendance/permits/:id/verify`  | Verifikasi homeroom/GURU_BK (approve/reject)             |
| GET    | `/attendance/rekap`               | Rekap kehadiran per siswa/mapel/periode                  |
| GET    | `/attendance/discipline`          | Dashboard kedisiplinan (ambang alpa default 3/bulan)     |

DTO divalidasi lokal dengan `class-validator` + `ValidationPipe` di controller
(`transform: true, whitelist: true`).

## 3. Auth (RBAC aktif — F1)

Auth sudah terpasang (`AuthGuard` global + `PermissionsGuard` fail-closed).
Aktor dibaca dari `request.requestContext` (JWT + UserRole), BUKAN dari header
klien (anti-impersonation). Setiap endpoint wajib `@RequirePermission`:

- `attendance:record:class` / `attendance:session:write:class` — GURU, scope
  KELAS (`actor.classIds`) diverifikasi di service.
- `attendance:scan:self` — SISWA: `student_id` SELALU `actor.userId`
  (anti-IDOR); GURU/staff boleh scan atas nama siswa hanya untuk sesi kelas
  dalam scope.
- `permit:request:self` — SISWA: `student_id` = `actor.userId`.
- `permit:verify:class` / `attendance:rekap:*` / `discipline:read:school` —
  sesuai matrix role (prd04 §4.3).
- Rekap: SISWA hanya melihat data sendiri; GURU dibatasi kelas yang diampu
  (`classIds`); role sekolah bebas.

Titik enforce terletak di `attendance.service.ts` (`isSelfScope`,
`isSchoolScope`, `assertClassSubjectInScope`).

## 4. Idempotensi & offline queue (M-ABSQR-T8)

Endpoint `POST /attendance/records/scan` menerima `Idempotency-Key` dari header
atau body (`idempotency_key`). Aturan:

- Duplikat key -> **200** dengan record lama (tanpa membuat record baru).
- Token dipakai siswa lain -> **409** (anti-titip).
- Token dipakai siswa sama (retry) -> **200** idempotent.
- Token kedaluwarsa -> **410**; sesi belum aktif/berakhir -> **409**.
- Sudah check-in sesi -> **200** idempotent.
- Validasi waktu **selalu di server**; `scanned_at` dari device hanya sinyal.

Client offline (IndexedDB) cukup mengirim scan yang sama dengan `Idempotency-Key`
yang stabil per aksi — server menjamin tidak dobel.

## 5. Geofencing (opsional, sinyal)

Native (tanpa map API). Berlaku untuk sesi `GEOFENCING`:

- Env: `SCHOOL_LATITUDE`, `SCHOOL_LONGITUDE`, `GEOFENCE_RADIUS_M` (default 100 m).
- Tanpa koordinat -> 403 (wajib untuk metode GEOFENCING).
- Tanpa pusat sekolah terkonfigurasi -> dibolehkan (sinyal lemah, bisa di-spoof).

## 6. Izin/sakit online — keterbatasan schema (ISSUES)

**Schema TIDAK memiliki entitas Permit.** Solusi saat ini: record disimpan di
tabel `attendance` dengan `status` = IZIN/SAKIT, `method` = MANUAL, dan kolom
`note` berisi JSON `PermitNotePayload`:

```json
{
  "kind": "permit",
  "type": "IZIN",
  "reason": "Acara keluarga",
  "attachmentPath": "permits/surat.jpg",
  "status": "PENDING",
  "verifiedBy": null,
  "verifiedAt": null
}
```

Verifikasi (homeroom/GURU_BK) mengubah status record: approve -> IZIN/SAKIT,
reject -> ALPA. Upload file surat (bucket `permits`) adalah endpoint terpisah
yang belum dibuat — endpoint ini hanya menerima `attachment_path` (path).
Migrasi schema (`Permit` proper + kolom `attachment_url`/`verified_*`) disarankan
sebagai follow-up (lihat ISSUES pada RESULT CONTRACT).

## 7. Catatan rekap & kedisiplinan

- `kehadiranPercent = (hadir + terlambat + izin + sakit) / total` (non-alpa).
- Dashboard kedisiplinan menghitung ALPA per bulan (UTC), ambang default 3/bulan,
  `atRisk = alpaCount >= threshold` (konfigurabel via query `threshold`).
- Rekap per periode memakai rentang tanggal UTC; pertimbangkan timezone sekolah
  (`SchoolProfile.timezone`, default Asia/Jakarta) saat filter UI dibangun.

## 8. Unit test

```
npm run test:unit --workspace=@openlms/api  (atau jest dengan testPathPattern non-integration)
```

File:

- `attendance-qr.service.spec.ts` — single-use, reuse 409, expiry 410, idempotency, sesi.
- `attendance-permit.service.spec.ts` — alur izin/sakit + verifikasi.
- `attendance-rekap.service.spec.ts` — perhitungan persentase & kedisiplinan.
- `attendance.utils.spec.ts` — hash token, TTL clamp, haversine/geofence, batas bulan.
