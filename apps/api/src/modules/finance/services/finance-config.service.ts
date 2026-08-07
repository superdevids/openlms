import { Injectable } from "@nestjs/common";
import { prisma } from "@openlms/database";
import { DEFAULT_REFUND_KEPSEK_THRESHOLD } from "../finance.constants";
import { money } from "../calculator/money";

/**
 * FinanceConfigService — nilai konfigurasi keuangan (prd04 §5.F.4 ambang
 * approval refund, dsb.). Sumber: FeatureFlag/AppFeatureSetting key
 * "FINANCE_INVOICE" (config Json) dengan fallback default. Nilai TIDAK
 * di-hardcode di logika — selalu lewat config ini.
 */

export interface FinanceConfig {
  /** nominal refund di atas ambang ini butuh approval KEPSEK */
  refundKepsekThreshold: string;
}

export const DEFAULT_FINANCE_CONFIG: FinanceConfig = {
  refundKepsekThreshold: DEFAULT_REFUND_KEPSEK_THRESHOLD
};

@Injectable()
export class FinanceConfigService {
  private cache: FinanceConfig | null = null;

  async getConfig(): Promise<FinanceConfig> {
    if (this.cache) {
      return this.cache;
    }
    let config = DEFAULT_FINANCE_CONFIG;
    try {
      const setting = await prisma.appFeatureSetting.findUnique({
        where: { feature_key: "FINANCE_INVOICE" }
      });
      const json = setting?.config;
      if (json && typeof json === "object" && "refundKepsekThreshold" in json) {
        const raw = (json as { refundKepsekThreshold?: unknown }).refundKepsekThreshold;
        if (typeof raw === "string" && raw.trim().length > 0) {
          config = { ...config, refundKepsekThreshold: raw };
        }
      }
    } catch {
      // DB belum siap (F0) — pakai default; tidak menggagalkan layanan.
    }
    this.cache = config;
    return config;
  }

  /** true bila refund butuh approval KEPSEK (prd04 §5.F.4). */
  async requiresKepsekApproval(amount: DecimalInput): Promise<boolean> {
    const config = await this.getConfig();
    return money(amount).gte(money(config.refundKepsekThreshold));
  }
}

/** Tipe input Decimal lokal (hindari import Prisma di layer config). */
type DecimalInput = import("@prisma/client/runtime/library").Decimal | number | string;
