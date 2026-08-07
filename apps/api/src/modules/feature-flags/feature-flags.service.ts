import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AuditAction } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { UpdateFeatureFlagDto } from "./dto/update-feature-flag.dto";

export interface FeatureFlagView {
  key: string;
  kategori: string;
  deskripsi: string;
  default_enabled: boolean;
  locked: boolean;
  is_system: boolean;
  config_schema: Prisma.JsonValue | null;
  /** Nilai efektif: AppFeatureSetting.enabled, fallback default_enabled; sistem selalu ON. */
  enabled: boolean;
  config: Prisma.JsonValue | null;
  updated_by: string | null;
  updated_at: Date | null;
}

/**
 * FeatureFlagsService — F1-T13, prd04 §5.N.
 * Daftar flag + nilai efektif; update oleh SUPERADMIN tercatat di AuditLog.
 * Flag locked tidak bisa diubah; flag sistem (is_system) tidak bisa dimatikan.
 */
@Injectable()
export class FeatureFlagsService {
  constructor(private readonly prisma: PrismaClient) {}

  async list(): Promise<FeatureFlagView[]> {
    const [flags, settings] = await Promise.all([
      this.prisma.featureFlag.findMany({ orderBy: [{ kategori: "asc" }, { key: "asc" }] }),
      this.prisma.appFeatureSetting.findMany()
    ]);
    const settingByKey = new Map(settings.map((s) => [s.feature_key, s]));

    return flags.map((flag) => {
      const setting = settingByKey.get(flag.key);
      return {
        key: flag.key,
        kategori: flag.kategori,
        deskripsi: flag.deskripsi,
        default_enabled: flag.default_enabled,
        locked: flag.locked,
        is_system: flag.is_system,
        config_schema: flag.config_schema,
        enabled: flag.is_system ? true : setting ? setting.enabled : flag.default_enabled,
        config: setting?.config ?? null,
        updated_by: setting?.updated_by ?? null,
        updated_at: setting?.updated_at ?? null
      };
    });
  }

  async update(
    key: string,
    dto: UpdateFeatureFlagDto,
    actorId: string,
    ip?: string
  ): Promise<FeatureFlagView> {
    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw new NotFoundException(`Feature flag tidak ditemukan: ${key}`);
    }
    if (flag.locked) {
      throw new ForbiddenException("Feature flag dikunci dan tidak dapat diubah.");
    }
    if (flag.is_system && dto.enabled === false) {
      throw new ForbiddenException("Feature flag sistem tidak dapat dimatikan.");
    }

    const before = await this.prisma.appFeatureSetting.findUnique({
      where: { feature_key: key }
    });
    const nextEnabled = dto.enabled ?? before?.enabled ?? flag.default_enabled;
    // unknown → cast di titik pakai; null (tanpa config) ditangani runtime (kolom nullable).
    const nextConfig: unknown = dto.config !== undefined ? dto.config : before?.config;

    const after = await this.prisma.appFeatureSetting.upsert({
      where: { feature_key: key },
      create: {
        feature_key: key,
        enabled: nextEnabled,
        config: nextConfig as Prisma.InputJsonValue,
        updated_by: actorId
      },
      update: {
        enabled: nextEnabled,
        config: nextConfig as Prisma.InputJsonValue,
        updated_by: actorId
      }
    });

    await this.prisma.auditLog.create({
      data: {
        actor_id: actorId,
        action: AuditAction.UPDATE,
        entity: "feature_flag",
        entity_id: key,
        before: before
          ? ({ enabled: before.enabled, config: before.config } as unknown as Prisma.InputJsonValue)
          : undefined,
        after: { enabled: after.enabled, config: after.config } as unknown as Prisma.InputJsonValue,
        ip_address: ip
      }
    });

    return {
      key: flag.key,
      kategori: flag.kategori,
      deskripsi: flag.deskripsi,
      default_enabled: flag.default_enabled,
      locked: flag.locked,
      is_system: flag.is_system,
      config_schema: flag.config_schema,
      enabled: flag.is_system ? true : after.enabled,
      config: after.config,
      updated_by: after.updated_by,
      updated_at: after.updated_at
    };
  }
}
