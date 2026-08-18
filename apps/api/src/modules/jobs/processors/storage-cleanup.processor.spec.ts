import { mkdtempSync, mkdirSync, writeFileSync, rmSync, utimesSync, existsSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";

jest.mock("@opensis/database", () => ({
  prisma: {
    material: { findMany: jest.fn() },
    submission: { findMany: jest.fn() },
    brandingConfig: { findMany: jest.fn() },
    landingContent: { findMany: jest.fn() },
    newsArticle: { findMany: jest.fn() },
    dataExportLog: { findMany: jest.fn() },
    parentalConsent: { findMany: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";
import { StorageCleanupProcessor } from "./storage-cleanup.processor";
import type { LocalStorageProvider } from "../../storage/local-storage.provider";

const prismaMock = prisma as unknown as {
  material: { findMany: jest.Mock };
  submission: { findMany: jest.Mock };
  brandingConfig: { findMany: jest.Mock };
  landingContent: { findMany: jest.Mock };
  newsArticle: { findMany: jest.Mock };
  dataExportLog: { findMany: jest.Mock };
  parentalConsent: { findMany: jest.Mock };
};

/** Semua model lain tidak mereferensikan file apa pun. */
function stubEmptyReferences() {
  prismaMock.material.findMany.mockResolvedValue([]);
  prismaMock.submission.findMany.mockResolvedValue([]);
  prismaMock.brandingConfig.findMany.mockResolvedValue([]);
  prismaMock.landingContent.findMany.mockResolvedValue([]);
  prismaMock.newsArticle.findMany.mockResolvedValue([]);
  prismaMock.parentalConsent.findMany.mockResolvedValue([]);
}

describe("StorageCleanupProcessor — M-01: file_url multi-file (Dapodik) dianggap referenced", () => {
  let root: string;
  const OLD = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 hari lalu

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "opensis-storage-cleanup-"));
    process.env.STORAGE_ORPHAN_RETENTION_DAYS = "1";
  });

  afterAll(() => {
    delete process.env.STORAGE_ORPHAN_RETENTION_DAYS;
    rmSync(root, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stubEmptyReferences();
    // Root bersih per test — file test sebelumnya tidak bocor ke test berikutnya.
    rmSync(root, { recursive: true, force: true });
    mkdirSync(root, { recursive: true });
  });

  function makeFile(rel: string, mtime: Date = OLD): string {
    const abs = join(root, rel);
    mkdirSync(join(abs, ".."), { recursive: true });
    writeFileSync(abs, "x");
    utimesSync(abs, mtime, mtime);
    return abs;
  }

  it("file_url comma-separated 3 file (Dapodik): SEMUA dianggap referenced — tidak dihapus", async () => {
    const f1 = makeFile("exports/dapodik_x/peserta_didik.csv");
    const f2 = makeFile("exports/dapodik_x/pendidik.csv");
    const f3 = makeFile("exports/dapodik_x/sarpras.csv");
    prismaMock.dataExportLog.findMany.mockResolvedValue([
      {
        file_url:
          "exports/dapodik_x/peserta_didik.csv,exports/dapodik_x/pendidik.csv,exports/dapodik_x/sarpras.csv"
      }
    ]);

    const storage = {
      getRoot: () => root,
      deleteRelative: jest.fn()
    } as unknown as LocalStorageProvider;
    const processor = new StorageCleanupProcessor(storage);

    const result = await processor.cleanupOrphans();

    // Tidak ada file yang dihapus — ketiga CSV tetap utuh (download tidak 404).
    expect(storage.deleteRelative).not.toHaveBeenCalled();
    expect(result.deleted).toBe(0);
    expect(result.referenced).toBe(3);
    expect(existsSync(f1)).toBe(true);
    expect(existsSync(f2)).toBe(true);
    expect(existsSync(f3)).toBe(true);
  });

  it("file ekspor orphan (tidak direferensikan) yang sudah lewat retensi → dihapus", async () => {
    makeFile("exports/orphan_old.csv");
    prismaMock.dataExportLog.findMany.mockResolvedValue([]);

    const storage = {
      getRoot: () => root,
      deleteRelative: jest.fn().mockResolvedValue(true)
    } as unknown as LocalStorageProvider;
    const processor = new StorageCleanupProcessor(storage);

    const result = await processor.cleanupOrphans();

    expect(storage.deleteRelative).toHaveBeenCalledWith("exports/orphan_old.csv");
    expect(result.deleted).toBe(1);
  });
});
