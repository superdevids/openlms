# QuizModule — Registrasi & Keputusan Desain

Modul **Kuis & Bank Soal** (prd04 §5.A.5; docs/05 `M-EXAM-T1`). Modul **sudah
terdaftar** di `app.module.ts` (imports: `QuizModule`); bagian registrasi di bawah
adalah dokumentasi kontrak.

## Cara registrasi (referensi — SUDAH TERPASANG)

`QuizModule` sudah ada di imports `app.module.ts`. Kode berikut bentuk registrasinya:

```ts
import { QuizModule } from "./modules/quiz/quiz.module";
// imports: [ ..., HealthModule, AuthModule, QuizModule, ExamModule ]
```

- Provider `@opensis/database` (`prisma` singleton) sudah tersedia — modul ini
  memakai `prisma` langsung dari `@opensis/database` (tanpa PrismaService lokal).
- `ExamModule` (ujian) mengimpor util dari folder `quiz/` (`gradeAnswer`,
  `seededShuffle`, `computeAutoScore`, `latestAnswersByQuestion`, dll.) — jangan
  menghapus `quiz.util.ts` bila hanya ingin memakai ExamModule.

## Endpoint (prefix global `api/v1`)

| Method | Path                               | Fungsi                                                                                              |
| ------ | ---------------------------------- | --------------------------------------------------------------------------------------------------- |
| POST   | `quiz/questions`                   | Buat soal bank (PG/ESAI/ISIAN/MENJODOHKAN)                                                          |
| GET    | `quiz/questions`                   | Daftar soal (filter subject_id/type/difficulty/tag/q, paginasi)                                     |
| GET    | `quiz/questions/:id`               | Detail soal                                                                                         |
| PATCH  | `quiz/questions/:id`               | Update soal                                                                                         |
| DELETE | `quiz/questions/:id`               | Hapus soal                                                                                          |
| POST   | `quiz/questions/import`            | Import massal CSV (header: type,text,options,correct_answer,explanation,difficulty,tags,subject_id) |
| POST   | `quiz`                             | Buat kuis (durasi, jadwal buka/tutup, shuffle_questions)                                            |
| GET    | `quiz`                             | Daftar kuis                                                                                         |
| GET    | `quiz/:id`                         | Detail kuis + soal                                                                                  |
| PATCH  | `quiz/:id`                         | Update kuis                                                                                         |
| POST   | `quiz/:id/publish` / `close`       | Transisi status DRAFT→PUBLISHED / →CLOSED                                                           |
| POST   | `quiz/:id/questions/:questionId`   | Lampirkan soal bank ke kuis                                                                         |
| DELETE | `quiz/:id/questions/:questionId`   | Lepas soal dari kuis                                                                                |
| POST   | `quiz/:id/attempts`                | Start attempt (status jadi ONGOING otomatis)                                                        |
| GET    | `quiz/attempts/:attemptId`         | Detail attempt + soal + sisa waktu                                                                  |
| POST   | `quiz/attempts/:attemptId/answers` | Simpan jawaban satu soal                                                                            |
| POST   | `quiz/attempts/:attemptId/submit`  | Submit (auto-grade; EXPIRED→AUTO_SUBMITTED)                                                         |
| POST   | `quiz/attempts/auto-submit`        | Pemicu auto-submit server-side (scheduler)                                                          |

## Keputusan & catatan penting

- **Auto-grade**: PG/isian dibandingkan ternormalisasi (trim, lowercase, ratakan spasi).
  MENJODOHKAN = JSON mapping kiri→kanan, dibandingkan tanpa urutan. ESAI tidak dinilai
  otomatis (perlu manual-grade di iterasi berikutnya).
- **Skor**: 0–100 = persentase soal benar; ditulis ke `Grade` (type `KUIS`,
  `source_id` = attempt id, `semester` diambil dari `ClassSubject.semester` bila ada).
- **Timer server-side**: `remaining_seconds` dihitung dari `started_at` + `duration_min`.
  Saat waktu habis, submit/autosave mengubah attempt menjadi `AUTO_SUBMITTED` secara
  otomatis; `autoSubmitExpired()` untuk job berkala.
- **Randomisasi soal**: deterministik per attempt (`seed = attempt.id`) via
  `seededShuffle` (Fisher–Yates seeded) — urutan stabil untuk attempt yang sama.
- **Import CSV**: parser RFC-4180 sederhana TANPA vendor (mendukung quoted field,
  escaped double-quote, CRLF). Batas 500 baris (`MAX_IMPORT_ROWS`). Lihat ISSUES.
- **RBAC**: enforced di controller (`quiz:write:class`, `question:write:class`,
  `quiz:attempt:self`/`quiz:attempt:school`). `created_by` tidak lagi diterima dari
  DTO — di-bind dari @CurrentUser; `student_id` attempt dari client hanya dipakai
  untuk staff scope (`quiz:attempt:school`).

## Unit test

- `src/modules/quiz/__tests__/quiz.util.spec.ts` — grading, state machine, CSV, seeded shuffle.
- `src/modules/quiz/__tests__/quiz-attempt.service.spec.ts` — submit→skor→Grade, auto-submit, start.
