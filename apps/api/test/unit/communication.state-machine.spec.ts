/**
 * Unit test — Komunikasi: state machine pengumuman (draft/published) & surat
 * (DRAFT -> SUBMITTED -> APPROVED/REJECTED; sign DITUNDA).
 */
// Mock rantai import fail-fast (lms-audit → realtime.gateway → cors.util) agar
// suite tetap jalan di NODE_ENV=production — solusi sisi test, fail-fast tidak dilemahkan.
jest.mock("../../src/modules/lms/lms-audit", () => ({
  writeAudit: jest.fn(),
  resolveActorRole: jest.fn(),
  ROLE_PRIORITY: []
}));
// Rantai kedua: announcement.service → notifications.service → realtime.gateway
// → realtime.auth → jwt.util (fail-fast JWT_ACCESS_SECRET). Di-mock agar suite
// jalan di NODE_ENV=production; AnnouncementService di spec memakai `notif` sendiri.
jest.mock("../../src/modules/notifications/notifications.service", () => ({
  NotificationService: class {}
}));

import "reflect-metadata";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException
} from "@nestjs/common";
import { AnnouncementService } from "../../src/modules/communication/announcement.service";
import { OfficialLetterService } from "../../src/modules/communication/official-letter.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

const ACTOR = { userId: "user-1", roles: ["KEPSEK"] };

describe("AnnouncementService — state machine publish/unpublish", () => {
  let db: MockDb;
  let service: AnnouncementService;
  // NotificationService disuntikkan (tambahan terbaru) — mock ringan.
  const notif = { createForRoles: jest.fn() } as never;

  beforeEach(() => {
    db = createMockDb();
    service = new AnnouncementService(db, notif);
  });

  it("create menolak title/body kosong dan targetRoles kosong -> 400", async () => {
    await expect(
      service.create({ title: "", body: "x", targetRoles: ["SISWA"], createdBy: "u1" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ title: "t", body: "", targetRoles: ["SISWA"], createdBy: "u1" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ title: "t", body: "x", targetRoles: [], createdBy: "u1" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    expect(mockFn(db, "announcement", "create")).not.toHaveBeenCalled();
  });

  it("create dengan publishNow=true langsung mengisi published_at", async () => {
    mockFn(db, "announcement", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "ann_1", ...data })
    );
    const ann = await service.create(
      {
        title: "Libur",
        body: "17 Agustus",
        targetRoles: ["SISWA"],
        createdBy: "u1",
        publishNow: true
      },
      ACTOR
    );
    expect(ann.published_at).toBeInstanceOf(Date);
  });

  it("create default draft (published_at null)", async () => {
    mockFn(db, "announcement", "create").mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({ id: "ann_1", ...data })
    );
    const ann = await service.create(
      { title: "Draft", body: "x", targetRoles: ["GURU"], createdBy: "u1" },
      ACTOR
    );
    expect(ann.published_at).toBeNull();
  });

  it("listForRole hanya pengumuman published untuk role target", async () => {
    mockFn(db, "announcement", "findMany").mockResolvedValue([{ id: "ann_1" }]);
    await service.listForRole("SISWA");
    expect(mockFn(db, "announcement", "findMany")).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { published_at: { not: null }, target_role: { has: "SISWA" } },
        orderBy: [{ pinned: "desc" }, { published_at: "desc" }]
      })
    );
  });

  it("unpublish pengumuman yang sudah terbit → published_at null", async () => {
    mockFn(db, "announcement", "findUnique").mockResolvedValue({
      id: "ann_1",
      published_at: new Date()
    });
    mockFn(db, "announcement", "update").mockResolvedValue({
      id: "ann_1",
      published_at: null
    });
    const ann = await service.unpublish("ann_1");
    expect(ann.published_at).toBeNull();
  });

  it("unpublish draft → 409", async () => {
    mockFn(db, "announcement", "findUnique").mockResolvedValue({
      id: "ann_1",
      published_at: null
    });
    await expect(service.unpublish("ann_1")).rejects.toThrow(ConflictException);
  });

  it("publish/update/remove menolak pengumuman tidak ada -> 404", async () => {
    mockFn(db, "announcement", "findUnique").mockResolvedValue(null);
    await expect(service.publish("missing")).rejects.toThrow(NotFoundException);
    await expect(service.update("missing", { title: "x" })).rejects.toThrow(NotFoundException);
    await expect(service.remove("missing")).rejects.toThrow(NotFoundException);
  });

  it("remove menghapus pengumuman", async () => {
    mockFn(db, "announcement", "findUnique").mockResolvedValue({ id: "ann_1" });
    mockFn(db, "announcement", "delete").mockResolvedValue({ id: "ann_1" });
    await expect(service.remove("ann_1")).resolves.toEqual({ id: "ann_1" });
  });
});

describe("OfficialLetterService — state machine surat", () => {
  let db: MockDb;
  let service: OfficialLetterService;

  beforeEach(() => {
    db = createMockDb();
    service = new OfficialLetterService(db);
  });

  it("create menolak subject/body kosong -> 400", async () => {
    await expect(
      service.create({ requesterId: "u1", type: "KETERANGAN", subject: "", body: "x" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ requesterId: "u1", type: "KETERANGAN", subject: "s", body: "" }, ACTOR)
    ).rejects.toThrow(BadRequestException);
  });

  it("submit hanya untuk DRAFT -> 409 untuk SUBMITTED", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
      id: "l1",
      status: "SUBMITTED"
    });
    await expect(service.submit("l1", ACTOR)).rejects.toThrow(ConflictException);
  });

  it("submit DRAFT → SUBMITTED (audit via writeAudit global)", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue({ id: "l1", status: "DRAFT" });
    mockFn(db, "officialLetter", "update").mockResolvedValue({ id: "l1", status: "SUBMITTED" });
    const letter = await service.submit("l1", ACTOR);
    expect(letter.status).toBe("SUBMITTED");
  });

  it("reject hanya untuk SUBMITTED -> 409 untuk APPROVED", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
      id: "l1",
      status: "APPROVED"
    });
    await expect(service.reject("l1", "kepsek", ACTOR)).rejects.toThrow(ConflictException);
  });

  it("reject SUBMITTED → REJECTED + approver tercatat", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue({ id: "l1", status: "SUBMITTED" });
    mockFn(db, "officialLetter", "update").mockResolvedValue({
      id: "l1",
      status: "REJECTED",
      approver_id: "kepsek-1"
    });
    const letter = await service.reject("l1", "kepsek-1", ACTOR);
    expect(letter.status).toBe("REJECTED");
    expect(letter.approver_id).toBe("kepsek-1");
  });

  it("sign selalu ditolak (tanda tangan digital DITUNDA) -> 403 FEATURE_DISABLED", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
      id: "l1",
      status: "APPROVED"
    });
    await expect(service.sign("l1")).rejects.toBeInstanceOf(ForbiddenException);
    try {
      await service.sign("l1");
    } catch (error) {
      const ex = error as ForbiddenException;
      const body = ex.getResponse() as { error?: { code?: string } };
      expect(body.error?.code).toBe("FEATURE_DISABLED");
    }
  });

  it("sign menolak surat tidak ada -> 404", async () => {
    mockFn(db, "officialLetter", "findUnique").mockResolvedValue(null);
    await expect(service.sign("missing")).rejects.toThrow(NotFoundException);
  });

  it("listForRequester membatasi scope ke pemohon", async () => {
    mockFn(db, "officialLetter", "findMany").mockResolvedValue([]);
    await service.listForRequester("u1");
    expect(mockFn(db, "officialLetter", "findMany")).toHaveBeenCalledWith(
      expect.objectContaining({ where: { requester_id: "u1" } })
    );
  });
});
