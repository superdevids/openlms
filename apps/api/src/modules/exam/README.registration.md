# ExamModule — Registrasi & Keputusan Desain

Modul **Ujian Online** (prd04 §5.A.6; docs/05 `M-EXAM-T1..T12`). Modul **sudah
terdaftar** di `app.module.ts` (imports: `ExamModule`); bagian registrasi di bawah
adalah dokumentasi kontrak.

## Cara registrasi (referensi — SUDAH TERPASANG)

`ExamModule` sudah ada di imports `app.module.ts`. Kode berikut bentuk registrasinya:

```ts
import { ExamModule } from "./modules/exam/exam.module";
// imports: [ ..., QuizModule, ExamModule ]
```

- `ExamModule` bergantung pada `quiz.util.ts` (auto-grade, seeded shuffle, label
  semester, latest-answer). Folder `quiz/` harus tetap ada (file-level import, bukan
  DI — tidak wajib meregistrasi QuizModule).
- Scheduler auto-submit (Cron/Socket) memanggil:
  - `POST exam/attempts/auto-submit`
  - `POST quiz/attempts/auto-submit`

## Endpoint (prefix global `api/v1`)

| Method          | Path                                      | Fungsi                                                       |
| --------------- | ----------------------------------------- | ------------------------------------------------------------ |
| POST/GET        | `exam`                                    | Buat/daftar ujian (PTS/PAS/PAT/UJIAN_SEKOLAH)                |
| GET/PATCH       | `exam/:id`                                | Detail/update ujian                                          |
| POST            | `exam/:id/publish` / `close`              | Transisi status                                              |
| POST/GET        | `exam/:id/packages`                       | Buat/daftar paket A/B/C                                      |
| PATCH           | `exam/packages/:packageId`                | Update paket                                                 |
| POST/GET/DELETE | `exam/packages/:packageId/questions[...]` | Kelola soal paket                                            |
| POST/GET        | `exam/:id/sessions`                       | Buat/daftar sesi (jadwal buka/tutup, sesi ganda)             |
| POST            | `exam/sessions/:sessionId/token/generate` | Generate token 6 char (hash SHA-256); plaintext hanya sekali |
| GET             | `exam/sessions/:sessionId/token/status`   | Status token aktif/kedaluwarsa                               |
| POST            | `exam/sessions/:sessionId/attempts`       | Start attempt (token sekali pakai, satu akun satu sesi)      |
| GET             | `exam/attempts/:attemptId`                | Detail attempt + jawaban terbaru + score side-by-side        |
| GET             | `exam/attempts/:attemptId/logs`           | Log jawaban append-only + log aktivitas                      |
| POST            | `exam/attempts/:attemptId/answers`        | Autosave idempotent (header `Idempotency-Key`)               |
| POST            | `exam/attempts/:attemptId/submit`         | Submit manual (auto-grade)                                   |
| POST            | `exam/attempts/:attemptId/grade`          | Manual-grade esai (`score_manual`)                           |
| POST            | `exam/attempts/:attemptId/log`            | Log aktivitas (TAB_SWITCH/visibility, IP, device)            |
| POST            | `exam/attempts/:attemptId/expire`         | Tandai EXPIRED (proctor)                                     |
| POST            | `exam/attempts/auto-submit`               | Auto-submit server-side (scheduler)                          |
| GET             | `exam/:id/item-analysis`                  | Analisis butir soal (persentase benar per soal)              |

## Keputusan & catatan penting

- **Token sesi** (M-EXAM-T3): 6 karakter dari alfabet `23456789ABCDEFGHJKLMNPQRSTUVWXYZ
abcdefghjkmnpqrstuvwxyz` (tanpa 0/O/1/I plus l/o ambigu), dihasilkan `crypto.randomBytes`.
  Yang disimpan di DB hanya hash SHA-256 (`access_token`). Plaintext hanya dikembalikan
  sekali saat generate. TTL default 30 menit.
- **Token sekali pakai**: hash token dicatat di `ExamAttempt.token_used`; token yang sama
  tidak bisa membuka attempt lain (cek `findFirst` by token_used). Implikasi alur kelas:
  bila 1 token dipakai bersama, hanya siswa pertama yang lolos — untuk ujian serentak
  perlu generate token per siswa (endpoint generate bisa dipanggil berulang) atau
  kebijakan relax (lihat ISSUES).
- **Satu akun satu sesi**: `@@unique([exam_session_id, student_id])` + cek eksplisit;
  login ganda ditolak 409.
- **Randomisasi deterministik per attempt**: seed = `attempt.id`; urutan soal selalu
  diacak; urutan opsi diacak bila `ExamPackage.shuffle_options = true`.
- **Autosave idempotent** (M-EXAM-T5): wajib header `Idempotency-Key`; `ExamAnswerLog`
  append-only dengan `saved_at` server time; key sama → kembalikan log lama tanpa
  duplikat. Catatan: schema belum punya unique index `(attempt_id, idempotency_key)` —
  lihat ISSUES.
- **Auto-submit** (M-EXAM-T6): server-side; attempt lewat `started_at + duration_min`
  menjadi `AUTO_SUBMITTED`; push `exam:force-submit` ke room `exam:{sessionId}` +
  `exam:tick` (ambang 60/30/10/0) via Socket.IO (R-29).
- **State machine attempt**: `IN_PROGRESS → SUBMITTED | AUTO_SUBMITTED | EXPIRED`
  (`assertAttemptTransition` di quiz.util); status terminal tidak bisa berpindah.
- **Grading** (M-EXAM-T7): `score_auto` (PG/isian/menjodohkan, 0–100), `score_manual`
  (esai, 0–100). Tampilan side-by-side di GET attempt. Hasil ditulis ke `Grade`
  type `SUMATIF` (`source_id` = attempt id).
- **Gap schema Grade**: `Grade.class_subject_id` di-resolve dari kelas aktif siswa +
  subject ujian; bila tidak ditemukan, grade dilewati dan warning dicatat di
  `device_info` (lihat ISSUES).
- **Log aktivitas** (M-EXAM-T9): schema tidak punya kolom log terpisah → disimpan di
  `ExamAttempt.device_info.activities` (append-only) dengan IP + device.
- **RBAC**: enforced di controller (`exam:write:school`, `exam:attempt:self`/
  `exam:attempt:school`, `exam:token:*`, `exam:grade-esai:class`,
  `exam:analysis:read:school`). `created_by` tidak lagi diterima dari DTO — di-bind
  dari @CurrentUser; `student_id` attempt dari client hanya dipakai untuk staff scope.

## Unit test

- `src/modules/exam/__tests__/exam.util.spec.ts` — token 6 char valid & tanpa karakter
  ambigu, hash SHA-256, format token, auto-score.
- `src/modules/exam/__tests__/exam-attempt.service.spec.ts` — autosave idempotent,
  auto-grade, auto-submit, start (token reuse / login ganda / token salah).
