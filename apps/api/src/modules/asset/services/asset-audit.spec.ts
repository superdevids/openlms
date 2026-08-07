import { InMemoryAssetStore } from "../asset.store";

describe("asset-audit — opname & reklasifikasi RETIRED (prd04 §5.G.3)", () => {
  let store: InMemoryAssetStore;

  beforeEach(() => {
    store = new InMemoryAssetStore();
  });

  it("opname FISIK cocok (fisik = buku) -> status MATCH, selisih 0", async () => {
    const audit = await store.createAudit({
      assetId: "ast-1",
      auditDate: new Date("2026-08-01"),
      auditType: "FISIK",
      physicalQty: 5,
      bookQty: 5,
      note: "opname rutin",
      proposeRetired: false,
      createdBy: "user-1"
    });
    expect(audit.status).toBe("MATCH");
    expect(audit.difference).toBe(0);
  });

  it("opname selisih (fisik 4, buku 5) -> status SELISIH, selisih -1", async () => {
    const audit = await store.createAudit({
      assetId: "ast-1",
      auditDate: new Date("2026-08-01"),
      auditType: "FISIK",
      physicalQty: 4,
      bookQty: 5,
      note: "hilang 1 unit",
      proposeRetired: false,
      createdBy: "user-1"
    });
    expect(audit.status).toBe("SELISIH");
    expect(audit.difference).toBe(-1);
  });

  it("usulan RETIRED tanpa selisih tetap status SELISIH sampai approval", async () => {
    const audit = await store.createAudit({
      assetId: "ast-2",
      auditDate: new Date("2026-08-01"),
      auditType: "BOOK",
      physicalQty: null,
      bookQty: 1,
      note: "rusak berat",
      proposeRetired: true,
      createdBy: "user-1"
    });
    expect(audit.status).toBe("SELISIH");
    expect(audit.proposeRetired).toBe(true);
    expect(audit.approvedByKepsek).toBeNull();
  });

  it("approval KEPSEK -> REKLASIFIKASI_RETIRED + AuditLog", async () => {
    const audit = await store.createAudit({
      assetId: "ast-2",
      auditDate: new Date("2026-08-01"),
      auditType: "BOOK",
      physicalQty: null,
      bookQty: 1,
      note: "rusak berat",
      proposeRetired: true,
      createdBy: "user-1"
    });
    const approved = await store.approveAudit(audit.id, "kepsek-1");
    expect(approved.status).toBe("REKLASIFIKASI_RETIRED");
    expect(approved.approvedByKepsek).toBe("kepsek-1");
    expect(approved.approvedAt).not.toBeNull();

    const logs = await store.listAuditLogs("AssetAudit", audit.id);
    expect(logs.length).toBeGreaterThan(0);
    expect(logs[0]?.actorRole).toBe("KEPSEK");
  });

  it("tolak usulan -> status dikembalikan MATCH via updateAuditStatus", async () => {
    const audit = await store.createAudit({
      assetId: "ast-3",
      auditDate: new Date("2026-08-01"),
      auditType: "FISIK",
      physicalQty: 1,
      bookQty: 1,
      note: "tidak layak retired",
      proposeRetired: true,
      createdBy: "user-1"
    });
    const updated = await store.updateAuditStatus(audit.id, "MATCH", "kepsek-1");
    expect(updated.status).toBe("MATCH");
    expect(updated.approvedByKepsek).toBeNull();
  });
});
