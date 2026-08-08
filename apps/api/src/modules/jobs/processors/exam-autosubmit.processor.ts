import { Inject, Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { ExamAttemptService } from "../../exam/exam-attempt.service";
import { QuizAttemptService } from "../../quiz/quiz-attempt.service";
import { JOB_NAMES, QUEUE_TOKEN, redisQueueUrl, type IJobQueue } from "../../queue/queue.types";

/**
 * ExamAutoSubmitProcessor (G-05) — auto-submit attempt ujian & kuis yang
 * melewati durasi (claim README tetapi cron-nya tidak ada).
 * @Cron tiap 1 menit; guard per-instance:
 * - REDIS_URL tersedia → enqueue job `auto-submit.expired` dengan jobId tetap
 *   (BullMQ men-dedupe jobId → satu eksekutor di antara banyak instance).
 * - Tanpa Redis → eksekusi langsung dengan boolean in-process (cegah overlap
 *   bila eksekusi lebih dari 1 menit).
 * SPP punya scheduler sendiri (SppProcessor) — JANGAN tambah duplikat di sini.
 */
@Injectable()
export class ExamAutoSubmitProcessor {
  private readonly logger = new Logger(ExamAutoSubmitProcessor.name);
  private running = false;

  constructor(
    private readonly examAttemptService: ExamAttemptService,
    private readonly quizAttemptService: QuizAttemptService,
    @Inject(QUEUE_TOKEN) private readonly queue: IJobQueue
  ) {}

  /** Tiap menit: cek attempt IN_PROGRESS yang melewati durasi. */
  @Cron("*/1 * * * *", { name: "exam-quiz-auto-submit" })
  async cronAutoSubmit(): Promise<void> {
    if (this.running) {
      this.logger.debug("auto-submit sebelumnya masih berjalan — dilewati");
      return;
    }
    this.running = true;
    try {
      if (redisQueueUrl()) {
        try {
          await this.queue.enqueue(
            JOB_NAMES.AUTO_SUBMIT_EXPIRED,
            {},
            {
              jobId: JOB_NAMES.AUTO_SUBMIT_EXPIRED
            }
          );
        } catch (err) {
          // jobId tetap sudah antre/diproses (BullMQ) — normal pada tick berikutnya.
          this.logger.debug(
            `auto-submit enqueue dilewati: ${err instanceof Error ? err.message : String(err)}`
          );
        }
        return;
      }
      await this.runNow();
    } finally {
      this.running = false;
    }
  }

  /** Handler job (BullMQ worker / in-process queue). */
  async handle(payload: unknown): Promise<void> {
    if (payload === undefined || payload === null) {
      this.logger.warn("auto-submit.expired: payload kosong, dilewati");
      return;
    }
    await this.runNow();
  }

  private async runNow(): Promise<void> {
    const [exam, quiz, tick] = await Promise.all([
      this.examAttemptService.autoSubmitExpired(),
      this.quizAttemptService.autoSubmitExpired(),
      // R-29: push exam:tick (ambang 60/30/10/0) di cron yang sama.
      this.examAttemptService.tickActiveExams()
    ]);
    this.logger.log(
      `auto-submit expired: exam=${exam.submitted}, quiz=${quiz.submitted}, tick=${tick.ticked}`
    );
  }
}
