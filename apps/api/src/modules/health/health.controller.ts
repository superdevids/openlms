import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaClient } from "@opensis/database";

@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaClient) {}

  @Get()
  health(): { status: string; service: string } {
    return { status: "ok", service: "opensis-api" };
  }

  /** Readiness — cek koneksi DB (SELECT 1). 503 SERVICE_DEGRADED bila DB tidak terjangkau. */
  @Get("ready")
  async ready(): Promise<{ status: string; checks: { database: string } }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ok", checks: { database: "ok" } };
    } catch {
      // Kode eksplisit (prd04 §1.6) — tidak bocor ke body error; stack dicatat server-side (pino).
      throw new ServiceUnavailableException({
        error: { code: "SERVICE_DEGRADED", message: "Database tidak tersedia" }
      });
    }
  }
}
