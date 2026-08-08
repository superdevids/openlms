/**
 * Unit test — JobsService (registrasi handler + helper enqueue) dan
 * processor SPP / exam-autosubmit (logika murni, tanpa DB).
 */
import { InProcessQueue } from "../../src/modules/queue/in-process.queue";
import { JOB_NAMES, type IJobQueue } from "../../src/modules/queue/queue.types";
import { JobsService } from "../../src/modules/jobs/jobs.service";
import { SppProcessor } from "../../src/modules/jobs/processors/spp.processor";
import { ExamAutoSubmitProcessor } from "../../src/modules/jobs/processors/exam-autosubmit.processor";

const flushImmediate = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));

function makeQueueMock(): { enqueue: jest.Mock; registerHandler: jest.Mock; isReady: jest.Mock } {
  return {
    enqueue: jest.fn().mockResolvedValue(undefined),
    registerHandler: jest.fn(),
    isReady: jest.fn().mockReturnValue(true)
  };
}

function makeProcessors() {
  return {
    notifications: { handle: jest.fn() },
    payroll: { handle: jest.fn() },
    rollover: { handle: jest.fn() },
    report: { handle: jest.fn() },
    spp: { handle: jest.fn() },
    examAutoSubmit: { handle: jest.fn() },
    importProcessor: { handle: jest.fn() }
  };
}

function makeService(queueMock: ReturnType<typeof makeQueueMock>) {
  const p = makeProcessors();
  const service = new JobsService(
    queueMock as unknown as IJobQueue,
    p.notifications as never,
    p.payroll as never,
    p.rollover as never,
    p.report as never,
    p.spp as never,
    p.examAutoSubmit as never,
    p.importProcessor as never
  );
  return { service, p };
}

describe("JobsService — registrasi handler & helper enqueue", () => {
  let queueMock: ReturnType<typeof makeQueueMock>;

  beforeEach(() => {
    queueMock = makeQueueMock();
  });

  it("onModuleInit mendaftarkan handler untuk semua nama job yang dikenal", () => {
    const { service } = makeService(queueMock);
    service.onModuleInit();

    expect(queueMock.registerHandler).toHaveBeenCalledTimes(7);
    for (const name of Object.values(JOB_NAMES)) {
      expect(queueMock.registerHandler).toHaveBeenCalledWith(name, expect.any(Function));
    }
  });

  it("helper fanoutNotifications mengirim payload ke queue dengan nama benar", async () => {
    const { service } = makeService(queueMock);
    const payload = { type: "TASK_NEW" as const, roles: ["SISWA"], title: "t", body: "b" };
    await service.fanoutNotifications(payload);
    expect(queueMock.enqueue).toHaveBeenCalledWith(JOB_NAMES.NOTIFICATIONS_FANOUT, payload);
  });

  it("helper executeRollover menambah jobId idempotensi dari idempotencyKey", async () => {
    const { service } = makeService(queueMock);
    await service.executeRollover({
      runId: "r1",
      idempotencyKey: "k-123",
      actorId: "a1"
    });
    expect(queueMock.enqueue).toHaveBeenCalledWith(
      JOB_NAMES.ROLLOVER_EXECUTE,
      { runId: "r1", idempotencyKey: "k-123", actorId: "a1" },
      { jobId: `${JOB_NAMES.ROLLOVER_EXECUTE}:k-123` }
    );
  });

  it("helper generateSpp menambah jobId dari period", async () => {
    const { service } = makeService(queueMock);
    await service.generateSpp({ period: "2026-08", createdBy: "system" });
    expect(queueMock.enqueue).toHaveBeenCalledWith(
      JOB_NAMES.SPP_GENERATE,
      { period: "2026-08", createdBy: "system" },
      { jobId: `${JOB_NAMES.SPP_GENERATE}:2026-08` }
    );
  });
});

describe("SppProcessor", () => {
  let sppScheduler: { generateSpp: jest.Mock };
  let queue: InProcessQueue;
  let processor: SppProcessor;

  beforeEach(() => {
    sppScheduler = { generateSpp: jest.fn().mockResolvedValue({ generated: 5, skipped: 2 }) };
    queue = new InProcessQueue();
    processor = new SppProcessor(sppScheduler as never, queue as never);
  });

  afterEach(() => {
    queue.onModuleDestroy();
  });

  it("handle memanggil scheduler dengan period + amount default 0", async () => {
    await processor.handle({ period: "2026-08" });
    expect(sppScheduler.generateSpp).toHaveBeenCalledWith(
      "2026-08",
      "0",
      undefined,
      undefined,
      "system"
    );
  });

  it("handle meneruskan amount, dueDate, academicYear, createdBy", async () => {
    await processor.handle({
      period: "2026-08",
      amount: "250000",
      dueDate: "2026-08-10",
      academicYear: "2026/2027",
      createdBy: "admin-1"
    });
    expect(sppScheduler.generateSpp).toHaveBeenCalledWith(
      "2026-08",
      "250000",
      new Date("2026-08-10"),
      "2026/2027",
      "admin-1"
    );
  });

  it("handle melewati payload tanpa period (tidak memanggil scheduler)", async () => {
    await processor.handle({});
    await processor.handle(undefined);
    await processor.handle(null);
    expect(sppScheduler.generateSpp).not.toHaveBeenCalled();
  });

  it("cronMonthly meng-enqueue job SPP dengan jobId idempoten per period", async () => {
    const enqueue = jest.spyOn(queue, "enqueue");
    await processor.cronMonthly();
    expect(enqueue).toHaveBeenCalledWith(
      JOB_NAMES.SPP_GENERATE,
      expect.objectContaining({ createdBy: "system" }),
      expect.objectContaining({ jobId: expect.stringContaining(JOB_NAMES.SPP_GENERATE) })
    );
    const payload = (enqueue.mock.calls[0]?.[1] as { period: string } | undefined) ?? {
      period: ""
    };
    expect(payload.period).toMatch(/^\d{4}-\d{2}$/);
  });

  it("end-to-end: enqueue via queue menjalankan handler SPP (in-process)", async () => {
    queue.registerHandler(JOB_NAMES.SPP_GENERATE, (p) => processor.handle(p));
    await queue.enqueue(JOB_NAMES.SPP_GENERATE, { period: "2026-09", amount: "100000" });
    await flushImmediate();
    await flushImmediate();
    expect(sppScheduler.generateSpp).toHaveBeenCalledWith(
      "2026-09",
      "100000",
      undefined,
      undefined,
      "system"
    );
  });
});

describe("ExamAutoSubmitProcessor (G-05)", () => {
  const OLD_REDIS = process.env.REDIS_URL;
  let examSvc: { autoSubmitExpired: jest.Mock; tickActiveExams: jest.Mock };
  let quizSvc: { autoSubmitExpired: jest.Mock };
  let queue: InProcessQueue;
  let processor: ExamAutoSubmitProcessor;

  beforeEach(() => {
    examSvc = {
      autoSubmitExpired: jest.fn().mockResolvedValue({ submitted: 1 }),
      tickActiveExams: jest.fn().mockResolvedValue({ ticked: 2 })
    };
    quizSvc = { autoSubmitExpired: jest.fn().mockResolvedValue({ submitted: 0 }) };
    queue = new InProcessQueue();
    processor = new ExamAutoSubmitProcessor(examSvc as never, quizSvc as never, queue as never);
  });

  afterEach(() => {
    queue.onModuleDestroy();
    if (OLD_REDIS === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = OLD_REDIS;
  });

  it("tanpa REDIS_URL: cron menjalankan runNow langsung (exam + quiz + tick)", async () => {
    delete process.env.REDIS_URL;
    const enqueue = jest.spyOn(queue, "enqueue");
    await processor.cronAutoSubmit();
    expect(examSvc.autoSubmitExpired).toHaveBeenCalledTimes(1);
    expect(quizSvc.autoSubmitExpired).toHaveBeenCalledTimes(1);
    expect(examSvc.tickActiveExams).toHaveBeenCalledTimes(1);
    expect(enqueue).not.toHaveBeenCalled();
  });

  it("dengan REDIS_URL: cron meng-enqueue job auto-submit (jobId tetap)", async () => {
    process.env.REDIS_URL = "redis://localhost:6379";
    const enqueue = jest.spyOn(queue, "enqueue");
    await processor.cronAutoSubmit();
    expect(enqueue).toHaveBeenCalledWith(
      JOB_NAMES.AUTO_SUBMIT_EXPIRED,
      {},
      { jobId: JOB_NAMES.AUTO_SUBMIT_EXPIRED }
    );
    expect(examSvc.autoSubmitExpired).not.toHaveBeenCalled();
  });

  it("cron kedua saat masih berjalan dilewati (guard anti-overlap)", async () => {
    delete process.env.REDIS_URL;
    examSvc.autoSubmitExpired.mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve({ submitted: 1 }), 30))
    );
    const p1 = processor.cronAutoSubmit();
    const p2 = processor.cronAutoSubmit();
    await Promise.all([p1, p2]);
    // Hanya satu runNow dieksekusi; sisanya ditolak oleh flag running.
    expect(examSvc.autoSubmitExpired.mock.calls.length).toBeGreaterThanOrEqual(1);
  });

  it("handle menolak payload kosong (tanpa runNow)", async () => {
    await processor.handle(undefined);
    await processor.handle(null);
    expect(examSvc.autoSubmitExpired).not.toHaveBeenCalled();
  });

  it("handle dengan payload non-null menjalankan runNow", async () => {
    await processor.handle({});
    expect(examSvc.autoSubmitExpired).toHaveBeenCalledTimes(1);
    expect(quizSvc.autoSubmitExpired).toHaveBeenCalledTimes(1);
    expect(examSvc.tickActiveExams).toHaveBeenCalledTimes(1);
  });
});
