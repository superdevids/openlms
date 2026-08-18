import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@opensis/database";
import { LocalStorageProvider } from "../../storage/local-storage.provider";
import { BUCKET_POLICIES } from "../../storage/storage.constants";

/**
 * StorageCleanupProcessor — pembersihan file orphan (R-21).
 *
 * Setiap hari (03:17) scan direktori storage untuk file yang:
 * - berada di bucket yang dikenal (BUCKET_POLICIES),
 * - TIDAK direferensikan oleh entri DB (material.content_url,
 *   submission.attachment_url, branding.logo_path/favicon_path,
 *   landing.image_path, news.cover_image_path, data_export_log.file_url,
 *   parental_consent.document_url),
 * - lebih tua dari STORAGE_ORPHAN_RETENTION_DAYS (default 7).
 *
 * File yang masih baru (< retention) TIDAK dihapus — memberi waktu upload
 * "upload lalu simpan referensi" yang tidak transaksional. Laporan jumlah
 * (scanned/deleted/referenced) lewat logger.
 */

interface WalkEntry {
  rel: string;
  mtimeMs: number;
}

@Injectable()
export class StorageCleanupProcessor {
  private readonly logger = new Logger(StorageCleanupProcessor.name);
  private readonly retentionDays: number;

  constructor(private readonly storage: LocalStorageProvider) {
    const parsed = Number(process.env.STORAGE_ORPHAN_RETENTION_DAYS);
    this.retentionDays = Number.isFinite(parsed) && parsed > 0 ? parsed : 7;
  }

  /** Harian 03:17 — di luar jam penggunaan sistem. */
  @Cron("17 3 * * *", { name: "storage-cleanup-daily" })
  async cronDaily(): Promise<void> {
    await this.cleanupOrphans();
  }

  async cleanupOrphans(): Promise<{ scanned: number; deleted: number; referenced: number }> {
    const referenced = await this.loadReferencedPaths();
    const root = this.storage.getRoot();
    const knownBuckets = new Set(Object.keys(BUCKET_POLICIES));

    const files: WalkEntry[] = [];
    for (const bucket of knownBuckets) {
      await this.walk(root, bucket, files);
    }

    const cutoff = Date.now() - this.retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;
    let keptReferenced = 0;

    for (const file of files) {
      if (referenced.has(file.rel)) {
        keptReferenced += 1;
        continue;
      }
      if (file.mtimeMs > cutoff) {
        continue; // masih dalam retention window
      }
      const ok = await this.storage.deleteRelative(file.rel);
      if (ok) {
        deleted += 1;
        this.logger.log(`orphan deleted: ${file.rel}`);
      }
    }

    this.logger.log(
      `storage cleanup: scanned=${files.length} referenced=${keptReferenced} deleted=${deleted} ` +
        `retentionDays=${this.retentionDays}`
    );
    return { scanned: files.length, deleted, referenced: keptReferenced };
  }

  /** Kumpulkan semua path yang direferensikan DB (normalisasi leading slash). */
  private async loadReferencedPaths(): Promise<Set<string>> {
    const [materials, submissions, branding, landing, news, exports, consents] = await Promise.all([
      prisma.material.findMany({ select: { content_url: true } }),
      prisma.submission.findMany({ select: { attachment_url: true } }),
      prisma.brandingConfig.findMany({ select: { logo_path: true, favicon_path: true } }),
      prisma.landingContent.findMany({ select: { image_path: true } }),
      prisma.newsArticle.findMany({ select: { cover_image_path: true } }),
      prisma.dataExportLog.findMany({ select: { file_url: true } }),
      prisma.parentalConsent.findMany({ select: { document_url: true } })
    ]);

    const refs = new Set<string>();
    const add = (p: string | null | undefined): void => {
      if (p && p.trim().length > 0) {
        refs.add(this.normalizeRef(p));
      }
    };
    for (const m of materials) add(m.content_url);
    for (const s of submissions) add(s.attachment_url);
    for (const b of branding) {
      add(b.logo_path);
      add(b.favicon_path);
    }
    for (const l of landing) add(l.image_path);
    for (const n of news) add(n.cover_image_path);
    // M-01: file_url ekspor bisa comma-separated multi-file (Dapodik 3 CSV).
    // Tiap URL didaftarkan terpisah — kalau tidak, ketiganya dianggap orphan
    // setelah 7 hari dan dihapus → download 404.
    for (const e of exports) {
      if (e.file_url) {
        for (const url of e.file_url.split(",")) {
          const trimmed = url.trim();
          if (trimmed.length > 0) {
            refs.add(this.normalizeRef(trimmed));
          }
        }
      }
    }
    for (const c of consents) add(c.document_url);
    return refs;
  }

  private normalizeRef(p: string): string {
    return p.replace(/^\.?\//, "").replace(/\/+$/, "");
  }

  /** Rekursif: kumpulkan file (rel path terhadap root + mtime). */
  private async walk(root: string, base: string, out: WalkEntry[]): Promise<void> {
    const dir = join(root, base);
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return; // bucket dir belum ada
    }
    for (const entry of entries) {
      const rel = base ? `${base}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        await this.walk(root, rel, out);
      } else if (entry.isFile()) {
        try {
          const s = await stat(join(dir, entry.name));
          out.push({ rel, mtimeMs: s.mtimeMs });
        } catch {
          // abaikan file yang berubah/hilang saat scan
        }
      }
    }
  }
}
