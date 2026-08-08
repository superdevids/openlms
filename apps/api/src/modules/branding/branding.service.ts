import { Injectable, Logger } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { RealtimeGateway } from "../realtime/realtime.gateway";
import { BRANDING_CHANGED_EVENT } from "../notifications/notification-events";
import { LocalStorageProvider, UploadedFile } from "../storage/local-storage.provider";
import { UpdateBrandingDto } from "./dto/update-branding.dto";
import type { BrandingView } from "./branding.types";
import { readCacheTtlMs } from "../../common/cache.util";

/** TTL cache branding (ms) — env CACHE_TTL_MS, default 60s (GET /app/branding tiap load halaman). */
const CACHE_TTL_MS = readCacheTtlMs(60_000);

/** Branding fallback bila tidak ada row di DB. */
const DEFAULT_BRANDING: BrandingView = {
  appName: "openlms",
  tagline: "LMS & SIS Sekolah",
  logoUrl: null,
  faviconUrl: null,
  colors: {
    primary: "#2563eb",
    secondary: "#1d4ed8",
    accent: "#0ea5e9"
  },
  radius: null,
  configVersion: 1
};

interface CacheEntry {
  view: BrandingView;
  expiresAt: number;
}

/**
 * BrandingService — identitas visual aplikasi (single-school).
 * - GET publik (pre-login) + cache module-level Map TTL 60s.
 * - ETag = config_version (dipakai klien untuk conditional fetch).
 * - Update: bump config_version, AuditLog, emit Socket.IO branding:changed, invalidasi cache.
 */
@Injectable()
export class BrandingService {
  private readonly logger = new Logger(BrandingService.name);
  private cache: CacheEntry | null = null;

  constructor(
    private readonly db: PrismaClient,
    private readonly realtime: RealtimeGateway,
    private readonly storage: LocalStorageProvider
  ) {}

  async getBranding(): Promise<BrandingView> {
    const now = Date.now();
    if (this.cache && this.cache.expiresAt > now) {
      return this.cache.view;
    }
    const view = await this.loadView();
    this.cache = { view, expiresAt: now + CACHE_TTL_MS };
    return view;
  }

  async updateBranding(
    dto: UpdateBrandingDto,
    actorId: string,
    ip?: string
  ): Promise<BrandingView> {
    const current = await this.findOrCreate();
    const before = this.toView(current);
    const nextVersion = current.config_version + 1;

    const updated = await this.db.brandingConfig.update({
      where: { id: current.id },
      data: {
        app_name: dto.appName ?? current.app_name,
        tagline: dto.tagline !== undefined ? dto.tagline : current.tagline,
        primary_color: dto.primaryColor ?? current.primary_color,
        secondary_color: dto.secondaryColor ?? current.secondary_color,
        accent_color: dto.accentColor ?? current.accent_color,
        radius: dto.radius !== undefined ? dto.radius : current.radius,
        config_version: nextVersion,
        updated_by: actorId
      }
    });

    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.UPDATE,
        entity: "branding_config",
        entity_id: updated.id,
        before: {
          appName: before.appName,
          colors: before.colors
        } as unknown as Prisma.InputJsonValue,
        after: {
          appName: updated.app_name,
          colors: {
            primary: updated.primary_color,
            secondary: updated.secondary_color,
            accent: updated.accent_color
          },
          configVersion: updated.config_version
        } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    this.invalidate();
    const view = this.toView(updated);
    this.emitChanged(view);
    return view;
  }

  /** Simpan file logo/favicon ke bucket branding + bump version. */
  async setAsset(
    field: "logo" | "favicon",
    file: UploadedFile,
    actorId: string,
    ip?: string
  ): Promise<BrandingView> {
    const path = await this.storage.save("branding", file);
    const current = await this.findOrCreate();
    const before = this.toView(current);
    const nextVersion = current.config_version + 1;
    // Unchecked input: set updated_by (FK) langsung, tanpa nested relation.
    const data: Prisma.BrandingConfigUncheckedUpdateInput = {
      config_version: nextVersion,
      updated_by: actorId
    };
    if (field === "logo") {
      data.logo_path = path;
    } else {
      data.favicon_path = path;
    }

    const updated = await this.db.brandingConfig.update({
      where: { id: current.id },
      data
    });

    await this.db.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.UPDATE,
        entity: "branding_config",
        entity_id: updated.id,
        before: {
          [field]: before[field === "logo" ? "logoUrl" : "faviconUrl"]
        } as unknown as Prisma.InputJsonValue,
        after: { [field]: path } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    this.invalidate();
    const view = this.toView(updated);
    this.emitChanged(view);
    return view;
  }

  invalidate(): void {
    this.cache = null;
  }

  private async loadView(): Promise<BrandingView> {
    const row = await this.db.brandingConfig.findFirst({ orderBy: { updated_at: "desc" } });
    if (!row) {
      return { ...DEFAULT_BRANDING };
    }
    return this.toView(row);
  }

  private async findOrCreate() {
    const existing = await this.db.brandingConfig.findFirst({ orderBy: { updated_at: "desc" } });
    if (existing) {
      return existing;
    }
    return this.db.brandingConfig.create({
      data: {
        app_name: DEFAULT_BRANDING.appName,
        tagline: DEFAULT_BRANDING.tagline,
        primary_color: DEFAULT_BRANDING.colors.primary,
        secondary_color: DEFAULT_BRANDING.colors.secondary,
        accent_color: DEFAULT_BRANDING.colors.accent,
        radius: null,
        config_version: 1
      }
    });
  }

  private toView(row: {
    app_name: string;
    tagline: string | null;
    logo_path: string | null;
    favicon_path: string | null;
    primary_color: string;
    secondary_color: string;
    accent_color: string;
    radius: number | null;
    config_version: number;
  }): BrandingView {
    return {
      appName: row.app_name,
      tagline: row.tagline,
      logoUrl: row.logo_path ? this.fileUrl(row.logo_path, row.config_version) : null,
      faviconUrl: row.favicon_path ? this.fileUrl(row.favicon_path, row.config_version) : null,
      colors: {
        primary: row.primary_color,
        secondary: row.secondary_color,
        accent: row.accent_color
      },
      radius: row.radius,
      configVersion: row.config_version
    };
  }

  /** URL publik untuk file di bucket branding (relatif ke API) + ?v=configVersion. */
  private fileUrl(path: string, configVersion: number): string {
    const clean = path.replace(/^\/+/, "");
    return `/api/v1/storage/files/${clean}?v=${configVersion}`;
  }

  private emitChanged(view: BrandingView): void {
    try {
      this.realtime.emitToAll(BRANDING_CHANGED_EVENT, { configVersion: view.configVersion });
    } catch (err) {
      this.logger.warn(`branding:changed emit gagal: ${(err as Error).message}`);
    }
  }
}
