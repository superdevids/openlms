# README.exam.md — Modul Exam (apps/api/src/modules/exam)

## Fungsi Folder

Ujian online: CRUD ujian, paket soal, sesi ujian, token akses, attempt siswa
(start/autosave/submit), log aktivitas (anti-kecurangan), nilai manual esai,
dan analisis butir soal. Hot path saat ujian berlangsung (target peak
1500–2000 request/detik) — autosave jawaban memakai Idempotency-Key.

## Daftar Fitur

- Ujian: CRUD, publish/close, paket soal, lampirkan soal.
- Sesi & token: buat sesi, generate token, status token.
- Attempt: start (validasi token), get, autosave jawaban (idempotent), submit,
  manual grade esai, log aktivitas, mark expired, auto-submit.
- Analisis butir per ujian/paket.

## Endpoint (prefix global `/api/v1`)

| Method | Path                                              | Permission                                      | Deskripsi                      |
| ------ | ------------------------------------------------- | ----------------------------------------------- | ------------------------------ |
| POST   | `/exam`                                           | `exam:write:school`                             | Buat ujian                     |
| GET    | `/exam`                                           | `exam:attempt:self`/`exam:read:school`          | Daftar ujian                   |
| GET    | `/exam/:examId`                                   | `exam:attempt:self`/`exam:read:school`          | Detail ujian                   |
| PATCH  | `/exam/:examId`                                   | `exam:write:school`                             | Update ujian                   |
| POST   | `/exam/:examId/publish` / `close`                 | `exam:write:school`                             | Publish/close                  |
| POST   | `/exam/:examId/packages`                          | `exam:write:school`                             | Buat paket soal                |
| GET    | `/exam/:examId/packages`                          | `exam:attempt:self`/`exam:read:school`          | Daftar paket                   |
| PATCH  | `/exam/packages/:packageId`                       | `exam:write:school`                             | Update paket                   |
| POST   | `/exam/packages/:packageId/questions`             | `exam:write:school`                             | Tambah soal ke paket           |
| GET    | `/exam/packages/:packageId/questions`             | `exam:attempt:self`/`exam:read:school`          | Soal paket                     |
| DELETE | `/exam/packages/:packageId/questions/:questionId` | `exam:write:school`                             | Hapus soal paket               |
| POST   | `/exam/:examId/sessions`                          | `exam:session:write:school`                     | Buat sesi                      |
| GET    | `/exam/:examId/sessions`                          | `exam:session:write:school`/`exam:attempt:self` | Daftar sesi                    |
| POST   | `/exam/sessions/:sessionId/token/generate`        | `exam:token:class`/`school`                     | Generate token                 |
| GET    | `/exam/sessions/:sessionId/token/status`          | `exam:token:class`/`school`                     | Status token                   |
| POST   | `/exam/sessions/:sessionId/attempts`              | `exam:attempt:self`/`school`                    | Start attempt                  |
| GET    | `/exam/attempts/:attemptId`                       | `exam:attempt:self`/`exam:read:school`          | Detail attempt                 |
| GET    | `/exam/attempts/:attemptId/logs`                  | `exam:attempt:self`/`exam:log:read:school`      | Log aktivitas                  |
| POST   | `/exam/attempts/:attemptId/answers`               | `exam:attempt:self`/`school`                    | Autosave jawaban (idempotent)  |
| POST   | `/exam/attempts/:attemptId/submit`                | `exam:attempt:self`/`school`                    | Submit attempt                 |
| POST   | `/exam/attempts/:attemptId/grade`                 | `exam:grade-esai:class`                         | Nilai manual esai              |
| POST   | `/exam/attempts/:attemptId/log`                   | `exam:attempt:self`                             | Catat aktivitas proctor        |
| POST   | `/exam/attempts/:attemptId/expire`                | `exam:session:write:school`/`exam:write:school` | Tandai expired                 |
| POST   | `/exam/attempts/auto-submit`                      | `exam:write:school`                             | Auto-submit expired (internal) |
| GET    | `/exam/:examId/item-analysis?packageId=`          | `exam:analysis:read:school`                     | Analisis butir                 |

## Struktur File

| File                      | Isi                                             |
| ------------------------- | ----------------------------------------------- |
| `exam.controller.ts`      | REST endpoint                                   |
| `exam.service.ts`         | CRUD ujian/paket/sesi/token + analisis butir    |
| `exam-attempt.service.ts` | Attempt lifecycle, autosave, submit, grade, log |
| `dto/`                    | DTO exam & attempt                              |
