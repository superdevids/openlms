/**
 * Asset — konstanta domain manajemen aset (prd04 §5.G; 05 W2-ASSET).
 * Sumber: prd04 §5.G.1, 03-database-erd §3.17/§3.18, seed-data/assets.ts.
 */

/** DI token AssetStore (InMemoryAssetStore untuk dev/test; PrismaAssetStore produksi). */
export const ASSET_STORE = Symbol("ASSET_STORE");
