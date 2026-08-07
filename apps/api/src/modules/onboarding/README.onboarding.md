# README.onboarding.md — Modul Onboarding (apps/api/src/modules/onboarding)

## Fungsi Folder

Wizard **onboarding sekolah** 5 langkah (SUPERADMIN/OPERATOR) dan **impor data
massal** (siswa, guru, dsb.) dengan preview + batch + AuditLog. Status tiap
langkah direkam di `settings.onboarding`.

## Daftar Fitur

- Status onboarding + progress 5 langkah.
- Langkah 1: profil sekolah; langkah 2: tahun ajaran/kelas; langkah 3: impor data;
  langkah 4: undangan pengguna; langkah 5: selesai.
- Impor data: template, preview validasi, eksekusi, riwayat batch.

## Endpoint (prefix global `/api/v1`)

| Method | Path                         | Permission               | Deskripsi                 |
| ------ | ---------------------------- | ------------------------ | ------------------------- |
| GET    | `/app/onboarding`            | `app:read:school`        | Status onboarding         |
| PATCH  | `/app/onboarding/step-1`     | `app:write:school`       | Profil sekolah            |
| PATCH  | `/app/onboarding/step-2`     | `app:write:school`       | Tahun ajaran / kelas      |
| POST   | `/app/onboarding/step-3`     | `import:run:school`      | Impor data massal         |
| POST   | `/app/onboarding/step-4`     | `invitation:send:school` | Kirim undangan            |
| POST   | `/app/onboarding/step-5`     | `app:write:school`       | Tandai onboarding selesai |
| GET    | `/app/import/templates`      | `import:preview:school`  | Daftar template impor     |
| POST   | `/app/import/preview`        | `import:preview:school`  | Preview validasi baris    |
| POST   | `/app/import/run`            | `import:run:school`      | Eksekusi impor            |
| GET    | `/app/import/batches?limit=` | `import:run:school`      | Riwayat batch impor       |

## Struktur File

| File                       | Isi                                           |
| -------------------------- | --------------------------------------------- |
| `onboarding.controller.ts` | Endpoint wizard 5 langkah                     |
| `onboarding.service.ts`    | Logika langkah + status                       |
| `import.controller.ts`     | Endpoint impor (template/preview/run/batches) |
| `import.service.ts`        | Validasi + eksekusi impor + ImportBatch       |
| `dto/`                     | DTO onboarding & impor                        |
