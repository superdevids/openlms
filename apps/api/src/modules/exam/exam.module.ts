import { Module } from "@nestjs/common";
import { ExamController } from "./exam.controller";
import { ExamService } from "./exam.service";
import { ExamAttemptService } from "./exam-attempt.service";
import { RealtimeModule } from "../realtime/realtime.module";

/**
 * ExamModule — ujian online (prd04 §5.A.6; docs/05 M-EXAM-T1..T12).
 * Registrasi ke AppModule (dokumen: README.registration.md) — tugas integrasi
 * dilakukan oleh orchestrator/openteam; app.module.ts dilarang diubah di task ini.
 * Import RealtimeModule agar ExamAttemptService bisa push exam:force-submit /
 * exam:tick ke room ujian (R-29).
 */
@Module({
  imports: [RealtimeModule],
  controllers: [ExamController],
  providers: [ExamService, ExamAttemptService],
  exports: [ExamService, ExamAttemptService]
})
export class ExamModule {}
