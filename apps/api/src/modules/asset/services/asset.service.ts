import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { Asset, AssetStatus } from "@prisma/client";
import { prisma } from "@opensis/database";
import { Decimal } from "@prisma/client/runtime/library";
import { AssetStore } from "../asset.store";
import { AssetExtensionRecord } from "../asset.types";
import { ASSET_STORE } from "../asset.constants";
import { DEFAULT_USEFUL_LIFE_MONTHS } from "../calculator/depreciation";

/**
 * AssetService — inventaris (prd04 §5.G.1). Prisma-backed (model Asset ada).
 * Field PERLUASAN (merk, tahun_perolehan, harga_perolehan, masa_manfaat_bulan,
 * penanggung_jawab, sumber_dana) belum ada di kolom schema — dipersist via
 * AssetStore (AssetExtension) sampai skema ditambah (lihat ISSUES).
 */

export interface CreateAssetInput {
  code: string;
  name: string;
  category: string;
  condition?: string;
  status?: string;
  quantity?: number;
  location?: string;
  merk?: string | null;
  tahunPerolehan?: number | null;
  hargaPerolehan?: Decimal | number | string | null;
  masaManfaatBulan?: number | null;
  penanggungJawab?: string | null;
  sumberDana?: "BOS" | "APBD" | "SWADANA" | null;
  createdBy: string;
}

@Injectable()
export class AssetService {
  constructor(@Inject(ASSET_STORE) private readonly store: AssetStore) {}

  async create(input: CreateAssetInput): Promise<Asset> {
    const code = input.code.trim().toUpperCase();
    if (code.length === 0) {
      throw new BadRequestException("Kode aset wajib diisi");
    }
    const existing = await prisma.asset.findUnique({ where: { code } });
    if (existing) {
      throw new BadRequestException(`Kode aset ${code} sudah dipakai`);
    }
    if (input.hargaPerolehan !== null && input.hargaPerolehan !== undefined) {
      const harga =
        input.hargaPerolehan instanceof Decimal
          ? input.hargaPerolehan
          : new Decimal(input.hargaPerolehan);
      if (harga.lt(0)) {
        throw new BadRequestException("hargaPerolehan tidak boleh negatif");
      }
    }

    const asset = await prisma.asset.create({
      data: {
        code,
        name: input.name.trim(),
        category: input.category as never,
        condition: (input.condition ?? "BAIK") as never,
        status: (input.status ?? "AVAILABLE") as AssetStatus,
        quantity: input.quantity ?? 1,
        location: input.location ?? null
      }
    });

    await this.store.upsertExtension({
      assetId: asset.id,
      merk: input.merk ?? null,
      tahunPerolehan: input.tahunPerolehan ?? null,
      hargaPerolehan: input.hargaPerolehan ?? null,
      masaManfaatBulan: input.masaManfaatBulan ?? null,
      penanggungJawab: input.penanggungJawab ?? null,
      sumberDana: input.sumberDana ?? null
    });
    await this.store.appendAuditLog({
      actorId: input.createdBy,
      actorRole: "OPERATOR",
      action: "CREATE",
      entity: "Asset",
      entityId: asset.id,
      before: {},
      after: { code, name: input.name, category: input.category },
      note: "aset dibuat"
    });
    return asset;
  }

  async update(
    id: string,
    input: Partial<CreateAssetInput> & { createdBy: string }
  ): Promise<Asset> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException("Aset tidak ditemukan");
    }
    const updated = await prisma.asset.update({
      where: { id },
      data: {
        ...(input.name ? { name: input.name } : {}),
        ...(input.category ? { category: input.category as never } : {}),
        ...(input.condition ? { condition: input.condition as never } : {}),
        ...(input.status ? { status: input.status as AssetStatus } : {}),
        ...(input.quantity !== undefined ? { quantity: input.quantity } : {}),
        ...(input.location !== undefined ? { location: input.location } : {})
      }
    });
    await this.store.upsertExtension({
      assetId: id,
      merk: input.merk ?? undefined,
      tahunPerolehan: input.tahunPerolehan ?? undefined,
      hargaPerolehan: input.hargaPerolehan ?? undefined,
      masaManfaatBulan: input.masaManfaatBulan ?? undefined,
      penanggungJawab: input.penanggungJawab ?? undefined,
      sumberDana: input.sumberDana ?? undefined
    });
    return updated;
  }

  async findById(id: string): Promise<Asset> {
    const asset = await prisma.asset.findUnique({ where: { id } });
    if (!asset) {
      throw new NotFoundException("Aset tidak ditemukan");
    }
    return asset;
  }

  async list(
    query: { category?: string; status?: string; location?: string } = {}
  ): Promise<Array<{ asset: Asset; extension: AssetExtensionRecord | null }>> {
    const assets = await prisma.asset.findMany({
      where: {
        ...(query.category ? { category: query.category as never } : {}),
        ...(query.status ? { status: query.status as AssetStatus } : {}),
        ...(query.location ? { location: query.location } : {})
      },
      orderBy: { code: "asc" }
    });
    // Extension = kolom pada tabel asset yang sama (merk, tahun_perolehan, dst.)
    // → diproyeksikan langsung dari hasil findMany awal (SEBELUMNYA getExtension
    // per aset = N+1). Perilaku identik dengan PrismaAssetStore.toExtension.
    return assets.map((a) => ({ asset: a, extension: this.toExtension(a) }));
  }

  /** Proyeksi kolom perluasan aset -> AssetExtensionRecord (1:1 ke PrismaAssetStore). */
  private toExtension(asset: Asset): AssetExtensionRecord {
    return {
      assetId: asset.id,
      merk: asset.merk,
      tahunPerolehan: asset.tahun_perolehan,
      hargaPerolehan: asset.harga_perolehan,
      masaManfaatBulan: asset.masa_manfaat_bulan,
      penanggungJawab: asset.penanggung_jawab_id,
      sumberDana: asset.sumber_dana,
      createdAt: asset.created_at,
      updatedAt: asset.updated_at
    };
  }

  /** Umur manfaat efektif: dari extension, fallback default per kategori. */
  async usefulLifeMonths(assetId: string, category: string): Promise<number> {
    const ext = await this.store.getExtension(assetId);
    if (ext?.masaManfaatBulan && ext.masaManfaatBulan > 0) {
      return ext.masaManfaatBulan;
    }
    return DEFAULT_USEFUL_LIFE_MONTHS[category] ?? DEFAULT_USEFUL_LIFE_MONTHS["LAINNYA"] ?? 36;
  }
}
