# README.quiz.md — Modul Quiz (apps/api/src/modules/quiz)

## Fungsi Folder

Bank soal & kuis: CRUD soal (termasuk impor CSV), CRUD kuis, publikasi/tutup,
lampirkan soal ke kuis, dan attempt kuis (start, simpan jawaban, submit,
auto-submit). Aktor diambil dari `@CurrentUser` dan diteruskan ke service untuk
binding `student_id` + cek kepemilikan attempt (anti-IDOR).

## Daftar Fitur

- Bank soal: CRUD + impor CSV + daftar dengan filter.
- Kuis: CRUD, publish/close, attach/detach soal.
- Attempt: start, get, save answer, submit, auto-submit expired (job).

## Endpoint (prefix global `/api/v1`)

| Method | Path                                  | Permission                             | Deskripsi                      |
| ------ | ------------------------------------- | -------------------------------------- | ------------------------------ |
| POST   | `/quiz/questions`                     | `question:write:class`                 | Buat soal                      |
| GET    | `/quiz/questions`                     | `question:read:class`                  | Daftar soal                    |
| GET    | `/quiz/questions/:questionId`         | `question:read:class`                  | Detail soal                    |
| PATCH  | `/quiz/questions/:questionId`         | `question:write:class`                 | Update soal                    |
| DELETE | `/quiz/questions/:questionId`         | `question:write:class`                 | Hapus soal                     |
| POST   | `/quiz/questions/import`              | `question:write:class`                 | Impor soal CSV                 |
| POST   | `/quiz`                               | `quiz:write:class`                     | Buat kuis                      |
| GET    | `/quiz`                               | `quiz:attempt:self`/`quiz:write:class` | Daftar kuis                    |
| GET    | `/quiz/:quizId`                       | `quiz:attempt:self`/`quiz:write:class` | Detail kuis                    |
| PATCH  | `/quiz/:quizId`                       | `quiz:write:class`                     | Update kuis                    |
| POST   | `/quiz/:quizId/publish` / `close`     | `quiz:write:class`                     | Publish/close                  |
| POST   | `/quiz/:quizId/questions/:questionId` | `quiz:write:class`                     | Lampirkan soal                 |
| DELETE | `/quiz/:quizId/questions/:questionId` | `quiz:write:class`                     | Lepas soal                     |
| POST   | `/quiz/:quizId/attempts`              | `quiz:attempt:self`/`school`           | Start attempt                  |
| GET    | `/quiz/attempts/:attemptId`           | `quiz:attempt:self`/`quiz:write:class` | Detail attempt                 |
| POST   | `/quiz/attempts/:attemptId/answers`   | `quiz:attempt:self`/`school`           | Simpan jawaban                 |
| POST   | `/quiz/attempts/:attemptId/submit`    | `quiz:attempt:self`/`school`           | Submit attempt                 |
| POST   | `/quiz/attempts/auto-submit`          | `quiz:write:class`                     | Auto-submit expired (internal) |

## Struktur File

| File                      | Isi                                |
| ------------------------- | ---------------------------------- |
| `quiz.controller.ts`      | REST endpoint                      |
| `quiz.service.ts`         | CRUD kuis + attach/detach + status |
| `question.service.ts`     | Bank soal + impor CSV              |
| `quiz-attempt.service.ts` | Attempt lifecycle + auto-submit    |
| `dto/`                    | DTO soal, kuis, attempt            |
