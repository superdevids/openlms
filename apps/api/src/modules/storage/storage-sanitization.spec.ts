import { BadRequestException } from "@nestjs/common";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { LocalStorageProvider } from "./local-storage.provider";
import { sanitizeStoredName } from "./local-storage.provider";

/**
 * Storage sanitization spec — R-26 (ekstensi STRICT, nama file aman,
 * ekstensi ↔ mimetype ↔ magic bytes, batas global).
 * Env STORAGE_LOCAL_DIR → direktori temp; STORAGE_GLOBAL_MAX_MB dikecilkan
 * agar pengujian batas global cepat. Keduanya dibersihkan di afterAll agar
 * tidak bocor ke spec lain (jest --runInBand berjalan berurutan).
 */

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
const PDF_MAGIC = Buffer.from("%PDF-1.7");
const ZIP_PK = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(16)]);
const OLE2 = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Ekstensi berbahaya yang harus DITOLAK di bucket mana pun. */
const DANGEROUS_EXTENSIONS = [
  ".svg",
  ".html",
  ".htm",
  ".js",
  ".mjs",
  ".ts",
  ".php",
  ".exe",
  ".sh",
  ".bat",
  ".cmd",
  ".ps1",
  ".vbs",
  ".apk",
  ".jar",
  ".msi",
  ".dll",
  ".py",
  ".sql",
  ".json",
  ".xml"
];

function pngOf(size: number): Buffer {
  return Buffer.concat([PNG_MAGIC, Buffer.alloc(size)]);
}

describe("sanitizeStoredName (nama file aman)", () => {
  it("menghasilkan format {timestamp}-{slug}.{ext} dari originalname bersih", () => {
    expect(sanitizeStoredName("logo.png", "image/png")).toMatch(/^\d+-logo\.png$/);
  });

  it("membuang path traversal (../) dan hanya memakai basename", () => {
    const name = sanitizeStoredName("../../etc/passwd.png", "image/png");
    expect(name).toMatch(/^\d+-passwd\.png$/);
    expect(name).not.toContain("/");
    expect(name).not.toContain("..");
  });

  it("membuang backslash traversal", () => {
    expect(sanitizeStoredName("..\\..\\evil\\shell.png", "image/png")).toMatch(/^\d+-shell\.png$/);
  });

  it("membuang karakter kontrol", () => {
    expect(sanitizeStoredName("bad\u0000name.png", "image/png")).toMatch(/^\d+-bad-name\.png$/);
  });

  it("membuang unicode non-ASCII dan merangkapkan spasi ganda", () => {
    expect(sanitizeStoredName("foto-çafé ünïcode.png", "image/png")).toMatch(
      /^\d+-foto-af-n-code\.png$/
    );
    expect(sanitizeStoredName("my   file.png", "image/png")).toMatch(/^\d+-my-file\.png$/);
  });

  it("membatasi panjang nama ≤ 100 karakter", () => {
    const name = sanitizeStoredName(`${"a".repeat(200)}.png`, "image/png");
    expect(name).toMatch(/^\d+-a{80}\.png$/);
    expect(name.length).toBeLessThanOrEqual(100);
  });

  it("ekstensi final diambil dari mimetype, bukan originalname", () => {
    expect(sanitizeStoredName("kartu.xlsx", "application/pdf")).toMatch(/^\d+-kartu\.pdf$/);
  });

  it("tanpa originalname → slug fallback 'file'", () => {
    expect(sanitizeStoredName(undefined, "application/pdf")).toMatch(/^\d+-file\.pdf$/);
  });
});

describe("LocalStorageProvider.save (validasi ekstensi & konten)", () => {
  let provider: LocalStorageProvider;
  let root: string;
  let savedPath: string | null = null;

  beforeAll(async () => {
    root = await mkdtemp(join(tmpdir(), "opensis-storage-san-"));
    process.env.STORAGE_LOCAL_DIR = root;
    process.env.STORAGE_GLOBAL_MAX_MB = "1";
    const mod = await import("./local-storage.provider");
    provider = new mod.LocalStorageProvider();
  });

  afterAll(async () => {
    await rm(root, { recursive: true, force: true });
    delete process.env.STORAGE_LOCAL_DIR;
    delete process.env.STORAGE_GLOBAL_MAX_MB;
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

  it.each(DANGEROUS_EXTENSIONS)("menolak ekstensi berbahaya %s (allowlist STRICT)", async (ext) => {
    await expect(
      provider.save("branding", {
        mimetype: "image/png",
        buffer: pngOf(128),
        originalname: `file${ext}`
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak ekstensi ganda berbahaya file.jpg.exe (ekstensi akhir di luar allowlist)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "image/jpeg",
        buffer: JPEG_MAGIC,
        originalname: "photo.jpg.exe"
      })
    ).rejects.toThrow(BadRequestException);
    await expect(
      provider.save("branding", {
        mimetype: "image/png",
        buffer: pngOf(64),
        originalname: "logo.png.js"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak ekstensi ↔ mimetype tidak konsisten", async () => {
    // Ekstensi .png tapi klaim image/jpeg
    await expect(
      provider.save("branding", {
        mimetype: "image/jpeg",
        buffer: JPEG_MAGIC,
        originalname: "photo.png"
      })
    ).rejects.toThrow(BadRequestException);
    // Ekstensi .jpg tapi klaim image/png
    await expect(
      provider.save("branding", {
        mimetype: "image/png",
        buffer: pngOf(64),
        originalname: "photo.jpg"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menolak bucket gambar untuk dokumen (branding + PDF)", async () => {
    await expect(
      provider.save("branding", {
        mimetype: "application/pdf",
        buffer: PDF_MAGIC,
        originalname: "surat.pdf"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerima DOCX (PK zip header) di ppdb-documents", async () => {
    savedPath = await provider.save("ppdb-documents", {
      mimetype: DOCX_MIME,
      buffer: ZIP_PK,
      originalname: "kartu-keluarga.docx"
    });
    expect(savedPath).toMatch(/^ppdb-documents\/\d+-kartu-keluarga\.docx$/);
  });

  it("menolak DOCX palsu (magic bytes bukan PK zip)", async () => {
    await expect(
      provider.save("ppdb-documents", {
        mimetype: DOCX_MIME,
        buffer: pngOf(64),
        originalname: "kartu.docx"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerima XLSX (PK zip header) di materials", async () => {
    savedPath = await provider.save("materials", {
      mimetype: XLSX_MIME,
      buffer: ZIP_PK,
      originalname: "daftar-nilai.xlsx"
    });
    expect(savedPath).toMatch(/^materials\/\d+-daftar-nilai\.xlsx$/);
  });

  it("menerima DOC (OLE2) di ppdb-documents", async () => {
    savedPath = await provider.save("ppdb-documents", {
      mimetype: "application/msword",
      buffer: OLE2,
      originalname: "surat-keterangan.doc"
    });
    expect(savedPath).toMatch(/^ppdb-documents\/\d+-surat-keterangan\.doc$/);
  });

  it("menolak DOC palsu (magic bytes bukan OLE2)", async () => {
    await expect(
      provider.save("ppdb-documents", {
        mimetype: "application/msword",
        buffer: PDF_MAGIC,
        originalname: "surat.doc"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerima CSV teks di ppdb-documents", async () => {
    savedPath = await provider.save("ppdb-documents", {
      mimetype: "text/csv",
      buffer: Buffer.from("nama,nilai\nA,90\nB,85\n"),
      originalname: "data-pendaftar.csv"
    });
    expect(savedPath).toMatch(/^ppdb-documents\/\d+-data-pendaftar\.csv$/);
  });

  it("menolak CSV berisi null bytes (binary)", async () => {
    await expect(
      provider.save("ppdb-documents", {
        mimetype: "text/csv",
        buffer: Buffer.from([0x61, 0x00, 0x62]),
        originalname: "data.csv"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerima TXT teks di materials", async () => {
    savedPath = await provider.save("materials", {
      mimetype: "text/plain",
      buffer: Buffer.from("catatan sederhana untuk siswa"),
      originalname: "catatan.txt"
    });
    expect(savedPath).toMatch(/^materials\/\d+-catatan\.txt$/);
  });

  it("menolak TXT yang terlihat binary (banyak byte kontrol)", async () => {
    await expect(
      provider.save("materials", {
        mimetype: "text/plain",
        buffer: Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0a, 0x0b, 0x0c]),
        originalname: "aneh.txt"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("menerapkan batas keras global (STORAGE_GLOBAL_MAX_MB=1)", async () => {
    await expect(
      provider.save("exports", {
        mimetype: "image/png",
        buffer: pngOf(1024 * 1024 + 1),
        originalname: "besar.png"
      })
    ).rejects.toThrow(BadRequestException);
  });

  it("file di bawah batas global tetap diterima", async () => {
    savedPath = await provider.save("exports", {
      mimetype: "image/png",
      buffer: pngOf(512 * 1024),
      originalname: "sedang.png"
    });
    expect(savedPath).toMatch(/^exports\/\d+-sedang\.png$/);
  });
});
