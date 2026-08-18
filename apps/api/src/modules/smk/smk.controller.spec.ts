import { PERMISSIONS_KEY } from "../../common/require-permission.decorator";
import { SmkController } from "./smk.controller";

describe("SmkController", () => {
  describe("RBAC complete PKL (FIX 2 — PEMBIMBING_INDUSTRI boleh menutup PKL)", () => {
    it("completeInternship: mengizinkan internship:write:school DAN internship:grade:self", () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        SmkController.prototype.completeInternship
      ) as string[];
      expect(permissions).toContain("internship:write:school");
      expect(permissions).toContain("internship:grade:self");
    });

    it("completeInternship: endpoint complete tidak menuntut permission lain", () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        SmkController.prototype.completeInternship
      ) as string[];
      // OR-permission: PEMBIMBING_INDUSTRI (hanya punya internship:grade:self)
      // cukup dengan satu permission — batasan pembimbing tetap di service
      // (InternshipService.complete → assertMentor).
      expect(permissions).toEqual(
        expect.arrayContaining(["internship:write:school", "internship:grade:self"])
      );
    });

    it("addJournal: pemegang internship:journal:self tetap diizinkan", () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        SmkController.prototype.addJournal
      ) as string[];
      expect(permissions).toContain("internship:journal:self");
    });
  });
});
