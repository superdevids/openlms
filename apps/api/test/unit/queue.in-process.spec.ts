/**
 * Unit test — InProcessQueue (fallback tanpa Redis).
 * Drain via setImmediate / setTimeout(delay); isolasi error per-job.
 */
import { InProcessQueue } from "../../src/modules/queue/in-process.queue";
import { JOB_NAMES, redisQueueUrl } from "../../src/modules/queue/queue.types";

const flushImmediate = (): Promise<void> => new Promise((resolve) => setImmediate(resolve));
const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

describe("InProcessQueue (queue fallback tanpa Redis)", () => {
  let queue: InProcessQueue;

  beforeEach(() => {
    queue = new InProcessQueue();
  });

  afterEach(() => {
    queue.onModuleDestroy();
  });

  it("isReady selalu true (in-process)", () => {
    expect(queue.isReady()).toBe(true);
  });

  it("enqueue tanpa handler → job dibuang, resolve tanpa error", async () => {
    const warnSpy = jest
      .spyOn(queue["logger"] as never, "warn" as never)
      .mockImplementation(() => undefined as never);
    await expect(queue.enqueue("job.unknown", {})).resolves.toBeUndefined();
    await flushImmediate();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("enqueue menjalankan handler terdaftar (drain async)", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler("my.job", handler);

    await queue.enqueue("my.job", { hello: "world" });
    await flushImmediate();

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ hello: "world" });
  });

  it("registerHandler mengganti handler duplikat (log warning) dan memakai yang terakhir", async () => {
    const first = jest.fn().mockResolvedValue(undefined);
    const second = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler("dup.job", first);
    queue.registerHandler("dup.job", second);

    await queue.enqueue("dup.job", {});
    await flushImmediate();

    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("isolasi error: satu job gagal tidak menghentikan job lain", async () => {
    const failing = jest.fn().mockRejectedValue(new Error("boom"));
    const ok = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler("job.fail", failing);
    queue.registerHandler("job.ok", ok);

    await queue.enqueue("job.fail", {});
    await queue.enqueue("job.ok", {});
    await flushImmediate();
    await flushImmediate();

    expect(failing).toHaveBeenCalledTimes(1);
    expect(ok).toHaveBeenCalledTimes(1);
  });

  it("delayMs > 0 menjalankan setelah jeda (bukan langsung)", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler("job.delay", handler);

    await queue.enqueue("job.delay", {}, { delayMs: 15 });
    await flushImmediate();
    expect(handler).not.toHaveBeenCalled();

    await sleep(40);
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("onModuleDestroy membatalkan timer/immediate yang belum jalan", async () => {
    const handler = jest.fn().mockResolvedValue(undefined);
    queue.registerHandler("job.late", handler);
    await queue.enqueue("job.late", {}, { delayMs: 1000 });

    queue.onModuleDestroy();
    await sleep(20);
    expect(handler).not.toHaveBeenCalled();
  });

  it("JOB_NAMES tidak berubah (kontrak nama job)", () => {
    expect(JOB_NAMES).toEqual({
      NOTIFICATIONS_FANOUT: "notifications.fanout",
      PAYROLL_RUN: "payroll.run",
      ROLLOVER_EXECUTE: "rollover.execute",
      REPORT_GENERATE: "report.generate",
      SPP_GENERATE: "spp.generate",
      IMPORT_COMMIT: "import.commit",
      AUTO_SUBMIT_EXPIRED: "auto-submit.expired"
    });
  });
});

describe("redisQueueUrl", () => {
  const OLD = process.env.REDIS_URL;

  afterEach(() => {
    if (OLD === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = OLD;
  });

  it("kosong bila env tidak diset", () => {
    delete process.env.REDIS_URL;
    expect(redisQueueUrl()).toBe("");
  });

  it("trim whitespace di sekitar env", () => {
    process.env.REDIS_URL = "  redis://localhost:6379  ";
    expect(redisQueueUrl()).toBe("redis://localhost:6379");
  });

  it("mengembalikan nilai env apa adanya (non-empty)", () => {
    process.env.REDIS_URL = "redis://x:1";
    expect(redisQueueUrl()).toBe("redis://x:1");
  });
});
