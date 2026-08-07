import { Inject, Injectable } from "@nestjs/common";
import { Asset } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import {
  calculateDepreciation,
  DEFAULT_USEFUL_LIFE_MONTHS,
  monthsSince
} from "../calculator/depreciation";
import { AssetStore } from "../asset.store";
import { ASSET_STORE } from "../asset.constants";
import { AssetService } from "./asset.service";

/**
 * DepreciationService — depresiasi garis lurus dihitung SAAT LAPORAN
 * (prd04 §5.G.2, keputusan B-3: tidak disimpan per bulan, bebas drift).
 * nilai_buku = harga_perolehan − (harga_perolehan / masa_manfaat_bulan × bulan).
 */

export interface DepreciatedAsset {
  asset: Asset;
  cost: Decimal;
  usefulLifeMonths: number;
  monthsElapsed: number;
  monthlyDepreciation: Decimal;
  accumulatedDepreciation: Decimal;
  bookValue: Decimal;
  fullyDepreciated: boolean;
}

@Injectable()
export class DepreciationService {
  constructor(
    private readonly assets: AssetService,
    @Inject(ASSET_STORE) private readonly store: AssetStore
  ) {}

  /** Laporan nilai buku semua aset per bulan berjalan (per periode laporan). */
  async report(asOf = new Date()): Promise<DepreciatedAsset[]> {
    const assets = await this.assets.list();
    const result: DepreciatedAsset[] = [];
    for (const { asset, extension } of assets) {
      const cost = extension?.hargaPerolehan;
      if (cost === null || cost === undefined) {
        continue; // tanpa harga perolehan -> tidak bisa disusutkan
      }
      const usefulLifeMonths =
        extension?.masaManfaatBulan && extension.masaManfaatBulan > 0
          ? extension.masaManfaatBulan
          : (DEFAULT_USEFUL_LIFE_MONTHS[asset.category] ??
            DEFAULT_USEFUL_LIFE_MONTHS["LAINNYA"] ??
            36);
      const monthsElapsed = extension?.tahunPerolehan
        ? monthsSince(new Date(extension.tahunPerolehan, 0, 1), asOf)
        : 0;
      const dep = calculateDepreciation({
        cost,
        usefulLifeMonths,
        monthsElapsed
      });
      result.push({
        asset,
        cost,
        usefulLifeMonths,
        monthsElapsed,
        monthlyDepreciation: dep.monthlyDepreciation,
        accumulatedDepreciation: dep.accumulatedDepreciation,
        bookValue: dep.bookValue,
        fullyDepreciated: dep.fullyDepreciated
      });
    }
    return result;
  }

  /** Rekap depresiasi per kategori (laporan manajemen). */
  async rekapByCategory(
    asOf = new Date()
  ): Promise<
    Array<{ category: string; assetCount: number; totalCost: Decimal; totalBookValue: Decimal }>
  > {
    const items = await this.report(asOf);
    const grouped = new Map<string, (typeof items)[number][]>();
    for (const item of items) {
      const list = grouped.get(item.asset.category) ?? [];
      list.push(item);
      grouped.set(item.asset.category, list);
    }
    const result: Array<{
      category: string;
      assetCount: number;
      totalCost: Decimal;
      totalBookValue: Decimal;
    }> = [];
    for (const [category, list] of grouped.entries()) {
      result.push({
        category,
        assetCount: list.length,
        totalCost: list.reduce((s, i) => s.plus(i.cost), new Decimal(0)),
        totalBookValue: list.reduce((s, i) => s.plus(i.bookValue), new Decimal(0))
      });
    }
    return result;
  }
}
