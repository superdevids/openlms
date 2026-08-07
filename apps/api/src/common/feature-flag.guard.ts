import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PrismaClient } from "@openlms/database";
import { FEATURE_KEY } from "./feature-flag.decorator";

/**
 * FeatureFlagGuard — global (APP_GUARD, F1-T13, prd04 §5.N).
 * Endpoint ber-@Feature('KEY') ditolak dengan 403 FEATURE_DISABLED saat flag OFF.
 * - Flag sistem (is_system) tidak pernah bisa dimatikan.
 * - Flag tak dikenal → ditolak (fail-closed).
 * - Nilai efektif: AppFeatureSetting.enabled, fallback FeatureFlag.default_enabled.
 * Catatan: AllExceptionsFilter memetakan 403 → code FORBIDDEN; kode
 * FEATURE_DISABLED dibawa di body exception (lihat ISSUES lintas-tim).
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaClient
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(FEATURE_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!key) {
      return true;
    }

    const flag = await this.prisma.featureFlag.findUnique({ where: { key } });
    if (!flag) {
      throw featureDisabled(key);
    }
    if (flag.is_system) {
      return true;
    }

    const setting = await this.prisma.appFeatureSetting.findUnique({
      where: { feature_key: key }
    });
    const enabled = setting ? setting.enabled : flag.default_enabled;
    if (!enabled) {
      throw featureDisabled(key);
    }
    return true;
  }
}

function featureDisabled(key: string): HttpException {
  return new HttpException(
    { code: "FEATURE_DISABLED", message: `Fitur dinonaktifkan: ${key}` },
    HttpStatus.FORBIDDEN
  );
}
