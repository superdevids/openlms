import { Module } from "@nestjs/common";
import { ExamController } from "./exam.controller";
import { ExamService } from "./exam.service";
import { ExamAttemptService } from "./exam-attempt.service";

/**
 * ExamModule — ujian online (prd04 §5.A.6; docs/05 M-EXAM-T1..T12).
 * Registrasi ke AppModule (dokumen: README.registration.md) — tugas integrasi
 * dilakukan oleh orchestrator/openteam; app.module.ts dilarang diubah di task ini.
 */
@Module({
  controllers: [ExamController],
  providers: [ExamService, ExamAttemptService],
  exports: [ExamService, ExamAttemptService]
})
export class ExamModule {}
