import { Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction, SchoolType } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { UpdateAppSettingsDto } from "./dto/update-app-settings.dto";

export interface SchoolSettings {
  attendance?: { absence_threshold_per_month?: number };
  rollover?: Record<string, unknown>;
  qr?: { token_ttl_minutes?: number };
  semester?: string;
  dataSaver?: boolean;
  onboarding?: Record<string, unknown>;
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
 */
@Injectable()
export class AppSettingsService {
  constructor(private readonly prisma: PrismaClient) {}

  async getSettings(): Promise<AppSettingsView> {
    const school = await this.prisma.schoolProfile.findFirst();
    if (!school) {
      throw new NotFoundException("Profil sekolah belum diatur.");
    }
    return this.toView(school);
  }

  async updateSettings(
    dto: UpdateAppSettingsDto,
    actorId: string,
    ip?: string
  ): Promise<AppSettingsView> {
    const school = await this.prisma.schoolProfile.findFirst();
    if (!school) {
      throw new NotFoundException("Profil sekolah belum diatur.");
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
        action: AuditAction.UPDATE,
        entity: "school_profile",
        entity_id: school.id,
        before: { name: before.name, npsn: before.npsn } as unknown as Prisma.InputJsonValue,
        after: { name: updated.name, npsn: updated.npsn } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    return this.toView(updated);
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
