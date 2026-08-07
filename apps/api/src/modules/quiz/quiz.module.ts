import { Module } from "@nestjs/common";
import { QuizController } from "./quiz.controller";
import { QuestionService } from "./question.service";
import { QuizService } from "./quiz.service";
import { QuizAttemptService } from "./quiz-attempt.service";

/**
 * QuizModule — bank soal & kuis (prd04 §5.A.5; docs/05 M-EXAM-T1).
 * Registrasi ke AppModule (dokumen: README.registration.md) — tugas integrasi
 * dilakukan oleh orchestrator/openteam; app.module.ts dilarang diubah di task ini.
 */
@Module({
  controllers: [QuizController],
  providers: [QuestionService, QuizService, QuizAttemptService],
  exports: [QuestionService, QuizService, QuizAttemptService]
})
export class QuizModule {}
