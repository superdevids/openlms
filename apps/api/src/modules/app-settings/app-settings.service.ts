import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, SchoolType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@opensis/database";
import { FONT_FAMILY_VALUES, FONT_SCALE_VALUES } from "@opensis/types";
import { readCacheTtlMs } from "../../common/cache.util";
import { resolveActorRole } from "../lms/lms-audit";
import { UpdateAppSettingsDto } from "./dto/update-app-settings.dto";

export interface SchoolSettings {
  attendance?: { absence_threshold_per_month?: number };
  rollover?: Record<string, unknown>;
  qr?: { token_ttl_minutes?: number };
  semester?: string;
  dataSaver?: boolean;
  onboarding?: Record<string, unknown>;
  font?: { font_family?: string; base_font_scale?: string };
  [key: string]: unknown;
}

export interface AppSettingsView {
  profile: {
    id: string;
    npsn: string;
    nss: string | null;
    name: string;
    school_type: SchoolType;
    address: string;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    current_academic_year_id: string | null;
    timezone: string;
  };
  settings: SchoolSettings;
  updatedAt: Date;
}

function asSettings(raw: Prisma.JsonValue | null | undefined): SchoolSettings {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as unknown as SchoolSettings;
  }
  return {};
}

/**
 * AppSettingsService — pengaturan aplikasi (profil sekolah, ambang, current_academic_year_id,
 * settings Json) berbasis SchoolProfile single-school (prd04 §5.D, §9.1 langkah 2).
 * GET /app/settings di-cache in-memory TTL (pola BrandingService TtlCache) dan
 * di-invalidate otomatis saat PATCH updateSettings.
 */
@Injectable()
export class AppSettingsService {
  private readonly cacheTtlMs = readCacheTtlMs(30_000);
  private settingsCache: { view: AppSettingsView; expiresAt: number } | null = null;

  constructor(private readonly prisma: PrismaClient) {}

  async getSettings(): Promise<AppSettingsView> {
    const now = Date.now();
    if (this.settingsCache && this.settingsCache.expiresAt > now) {
      return this.settingsCache.view;
    }
    const school = await this.prisma.schoolProfile.findFirst();
    if (!school) {
      throw new NotFoundException("Profil sekolah belum diatur.");
    }
    const view = this.toView(school);
    this.settingsCache = { view, expiresAt: now + this.cacheTtlMs };
    return view;
  }

  /**
   * Preferensi tipografi global (SchoolProfile.settings.font) — endpoint publik
   * agar web bisa seed default skala teks untuk SEMUA user (tanpa permission
   * app:read:school). Hanya nilai kosmetik; tidak membocorkan data sekolah.
   */
  async getFontSettings(): Promise<{ font_family: string | null; base_font_scale: string }> {
    const now = Date.now();
    if (this.settingsCache && this.settingsCache.expiresAt > now) {
      return this.toFontSettings(this.settingsCache.view);
    }
    const school = await this.prisma.schoolProfile.findFirst();
    if (!school) {
      return { font_family: null, base_font_scale: "normal" };
    }
    return this.toFontSettings(this.toView(school));
  }

  async updateSettings(
    dto: UpdateAppSettingsDto,
    actorId: string,
    ip?: string,
    roles: string[] = []
  ): Promise<AppSettingsView> {
    const school = await this.prisma.schoolProfile.findFirst();
    if (!school) {
      throw new NotFoundException("Profil sekolah belum diatur.");
    }

    const fontPatch = dto.settings?.font;
    if (fontPatch !== undefined && fontPatch !== null) {
      this.assertValidFont(fontPatch);
    }

    const before = { name: school.name, npsn: school.npsn, settings: school.settings };
    const mergedSettings =
      dto.settings !== undefined ? mergeSettings(school.settings, dto.settings) : school.settings;

    const updated = await this.prisma.schoolProfile.update({
      where: { id: school.id },
      data: {
        name: dto.name ?? school.name,
        npsn: dto.npsn ?? school.npsn,
        school_type: dto.school_type ?? school.school_type,
        address: dto.address ?? school.address,
        phone: dto.phone ?? school.phone,
        email: dto.email ?? school.email,
        timezone: dto.timezone ?? school.timezone,
        current_academic_year_id: dto.current_academic_year_id ?? school.current_academic_year_id,
        settings: (mergedSettings ?? undefined) as Prisma.InputJsonValue | undefined
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: actorId,
        actor_role: resolveActorRole(roles) ?? undefined,
        action: AuditAction.UPDATE,
        entity: "school_profile",
        entity_id: school.id,
        before: { name: before.name, npsn: before.npsn } as unknown as Prisma.InputJsonValue,
        after: { name: updated.name, npsn: updated.npsn } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    this.invalidate();
    return this.toView(updated);
  }

  /** Settings berubah → cache publik dibuang (di-fill ulang saat GET berikutnya). */
  private invalidate(): void {
    this.settingsCache = null;
  }

  /** Validasi nilai font dari settings (daftar kurasi @opensis/types — mencegah input arbitrer). */
  private assertValidFont(font: unknown): void {
    if (typeof font !== "object" || font === null) {
      throw new BadRequestException("settings.font harus objek.");
    }
    const f = font as Record<string, unknown>;
    if (
      f.font_family !== undefined &&
      (typeof f.font_family !== "string" || !FONT_FAMILY_VALUES.includes(f.font_family as never))
    ) {
      throw new BadRequestException("font_family tidak valid.");
    }
    if (
      f.base_font_scale !== undefined &&
      (typeof f.base_font_scale !== "string" ||
        !FONT_SCALE_VALUES.includes(f.base_font_scale as never))
    ) {
      throw new BadRequestException("base_font_scale harus normal, large, atau big.");
    }
  }

  private toView(school: {
    id: string;
    npsn: string;
    nss: string | null;
    name: string;
    school_type: SchoolType;
    address: string;
    phone: string | null;
    email: string | null;
    logo_url: string | null;
    current_academic_year_id: string | null;
    timezone: string;
    settings: Prisma.JsonValue | null;
    updated_at: Date;
  }): AppSettingsView {
    return {
      profile: {
        id: school.id,
        npsn: school.npsn,
        nss: school.nss,
        name: school.name,
        school_type: school.school_type,
        address: school.address,
        phone: school.phone,
        email: school.email,
        logo_url: school.logo_url,
        current_academic_year_id: school.current_academic_year_id,
        timezone: school.timezone
      },
      settings: asSettings(school.settings),
      updatedAt: school.updated_at
    };
  }

  private toFontSettings(view: AppSettingsView): {
    font_family: string | null;
    base_font_scale: string;
  } {
    const font = view.settings.font ?? {};
    return {
      font_family: FONT_FAMILY_VALUES.includes(
        font.font_family as (typeof FONT_FAMILY_VALUES)[number]
      )
        ? (font.font_family ?? null)
        : null,
      base_font_scale: FONT_SCALE_VALUES.includes(
        font.base_font_scale as (typeof FONT_SCALE_VALUES)[number]
      )
        ? (font.base_font_scale ?? "normal")
        : "normal"
    };
  }
}

function mergeSettings(
  current: Prisma.JsonValue | null | undefined,
  patch: Record<string, unknown>
): Prisma.InputJsonValue {
  const base: Record<string, unknown> = asSettings(current);
  for (const [key, value] of Object.entries(patch)) {
    const existing = base[key];
    if (
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing) &&
      value &&
      typeof value === "object" &&
      !Array.isArray(value)
    ) {
      base[key] = {
        ...(existing as Record<string, unknown>),
        ...(value as Record<string, unknown>)
      };
    } else {
      base[key] = value;
    }
  }
  return base as Prisma.InputJsonValue;
}
