/**
 * Unit test — Komunikasi: pengumuman (publish) + surat (approval; tanda tangan DITUNDA).
 */
import "reflect-metadata";
import { ConflictException, ForbiddenException } from "@nestjs/common";
import { AnnouncementService } from "../../src/modules/communication/announcement.service";
import { OfficialLetterService } from "../../src/modules/communication/official-letter.service";
import { createMockDb, mockFn, MockDb } from "../helpers/mock-db";

describe("Communication", () => {
  let db: MockDb;
  const notifications = {
    createForUser: jest.fn(),
    createForRoles: jest.fn().mockResolvedValue(1)
  };

  beforeEach(() => {
    db = createMockDb();
  });

  describe("AnnouncementService", () => {
    it("publish menolak pengumuman yang sudah terbit -> 409", async () => {
      const service = new AnnouncementService(db, notifications as never);
      mockFn(db, "announcement", "findUnique").mockResolvedValue({
        id: "ann-1",
        published_at: new Date()
      });
      await expect(service.publish("ann-1")).rejects.toThrow(ConflictException);
    });

    it("publish menetapkan published_at", async () => {
      const service = new AnnouncementService(db, notifications as never);
      mockFn(db, "announcement", "findUnique").mockResolvedValue({
        id: "ann-1",
        published_at: null,
        target_role: ["SISWA", "GURU"]
      });
      mockFn(db, "announcement", "update").mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: "ann-1",
          published_at: data.published_at,
          target_role: ["SISWA", "GURU"]
        })
      );
      const published = await service.publish("ann-1");
      expect(published.published_at).toBeInstanceOf(Date);
      // Publish terbit → notifikasi dikirim ke role target (best-effort).
      expect(notifications.createForRoles).toHaveBeenCalledWith(
        expect.objectContaining({ type: "ANNOUNCEMENT", roles: ["SISWA", "GURU"] })
      );
    });
  });

  describe("OfficialLetterService", () => {
    it("approve hanya untuk surat SUBMITTED -> 409 untuk DRAFT", async () => {
      const service = new OfficialLetterService(db);
      mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
        id: "letter-1",
        status: "DRAFT"
      });
      await expect(
        service.approve("letter-1", "kepsek-1", { userId: "kepsek-1", roles: ["KEPSEK"] })
      ).rejects.toThrow(ConflictException);
    });

    it("approve menghasilkan letter_no dan status APPROVED", async () => {
      const service = new OfficialLetterService(db);
      mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
        id: "letter-1",
        type: "KETERANGAN",
        status: "SUBMITTED"
      });
      mockFn(db, "officialLetter", "update").mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: "letter-1",
          status: data.status,
          letter_no: data.letter_no,
          approver_id: data.approver_id
        })
      );
      const letter = await service.approve("letter-1", "kepsek-1", {
        userId: "kepsek-1",
        roles: ["KEPSEK"]
      });
      expect(letter.status).toBe("APPROVED");
      expect(letter.letter_no).toContain("/ECL/");
      expect(letter.approver_id).toBe("kepsek-1");
    });

    it("tanda tangan digital DITUNDA -> 403 FEATURE_DISABLED", async () => {
      const service = new OfficialLetterService(db);
      mockFn(db, "officialLetter", "findUnique").mockResolvedValue({
        id: "letter-1",
        status: "APPROVED"
      });
      await expect(service.sign("letter-1")).rejects.toThrow(ForbiddenException);
    });
  });
});
