import { BadRequestException } from "@nestjs/common";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LocalStorageProvider } from "./local-storage.provider";

/**
 * LocalStorageProvider spec — R-15 (magic bytes) + R-18 (per-bucket limits).
 * Env STORAGE_LOCAL_DIR diarahkan ke direktori temp agar tidak mengotori repo;
 * STORAGE_MAX_BRANDING_MB/MATERIALS_MB dikecilkan supaya pengujian cepat.
 */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const PDF_MAGIC = Buffer.from("%PDF-1.7");

function pngOf(size: number): Buffer {
  return Buffer.concat([PNG_MAGIC, Buffer.alloc(size)]);
}

describe("LocalStorageProvider", () => {
  let provider: LocalStorageProvider;
  let root: string;
  let savedPath: string | null = null;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "opensis-storage-"));
    process.env.STORAGE_LOCAL_DIR = root;
    process.env.STORAGE_MAX_BRANDING_MB = "1";
    process.env.STORAGE_MAX_MATERIALS_MB = "2";
    // Provider baru dimuat setelah env di-set; tanpa resetModules agar identitas
    // BadRequestException tetap satu registry (toThrow(class) tidak gagal).
    const mod = await import("./local-storage.provider");
    provider = new mod.LocalStorageProvider();
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_DIR;
    delete process.env.STORAGE_MAX_BRANDING_MB;
    delete process.env.STORAGE_MAX_MATERIALS_MB;
  });

  afterEach(async () => {
    if (savedPath) {
      const full = join(root, savedPath);
      try {
        await rm(full, { force: true });
      } catch {
        // abaikan
      }
      savedPath = null;
    }
  });

  it("menyimpan PNG valid ke bucket branding dengan nama UUID", async () => {
    savedPath = await provider.save("branding", {
      mimetype: "image/png",
      buffer: pngOf(1024),
      originalname: "logo.png"
    });
    expect(savedPath).toMatch(/^branding\/\d+-logo\.png$/);
    const full = join(root, savedPath!);
    await expect(readFile(full)).resolves.toBeTruthy();
  });

  it("menerima PDF valid di bucket materi (allowlist dokumen)", async () => {
    savedPath = await provider.save("materials", {
      mimetype: "application/pdf",
      buffer: PDF_MAGIC,
      originalname: "bahan.pdf"
    });
    expect(savedPath).toMatch(/^materials\/\d+-bahan\.pdf$/);
  });

  it("menolak file ber-isi PNG yang diklaim image/jpeg → magic mismatch (R-15)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "image/jpeg",
        buffer: pngOf(512),
        originalname: "fake.jpg"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak file teks yang diklaim image/png → magic mismatch (R-15)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "image/png",
        buffer: Buffer.from("plain text, bukan png"),
        originalname: "fake.png"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak mimetype di luar allowlist (SVG) (R-19)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "image/svg+xml",
        buffer: Buffer.from("<svg></svg>"),
        originalname: "x.svg"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak file melebihi limit bucket branding 1MB (R-18)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "image/png",
        buffer: pngOf(1024 * 1024 + 1),
        originalname: "big.png"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerapkan limit per bucket: materials 2MB masih menerima file 1.5MB", async () => {
    savedPath = await provider.save("materials", {
      mimetype: "image/png",
      buffer: pngOf(Math.round(1.5 * 1024 * 1024)),
      originalname: "materi.png"
    });
    expect(savedPath).toMatch(/^materials\//);
  });

  it("menolak file melebihi limit materials 2MB (R-18)", async () => {
    await expect(
      provider.save("materials", {
        mimetype: "image/png",
        buffer: pngOf(2 * 1024 * 1024 + 1),
        originalname: "big.png"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak path traversal saat resolve/assertExists (keamanan)", async () => {
    await expect(provider.assertExists("materials", "../secret")).rejects.toThrow(
      BadRequestException
    );
    await expect(provider.assertExists("materials", "..\\secret")).rejects.toThrow(
      BadRequestException
    );
  });

  it("deleteRelative menghapus file dan mengembalikan true", async () => {
    savedPath = await provider.save("materials", {
      mimetype: "application/pdf",
      buffer: PDF_MAGIC
    });
    await expect(provider.deleteRelative(savedPath)).resolves.toBe(true);
    savedPath = null;
    await expect(provider.deleteRelative("materials/not-exists.pdf")).resolves.toBe(false);
  });
});
