import { BadRequestException } from "@nestjs/common";
import { PERMISSIONS_KEY } from "../../common/require-permission.decorator";
import { PdpController } from "./pdp.controller";

describe("PdpController", () => {
  const permissionsOf = (handler: (...args: never[]) => unknown): string[] =>
    (Reflect.getMetadata(PERMISSIONS_KEY, handler) as string[]) ?? [];

  describe("RBAC metadata — endpoint self (SISWA/WALI_MURID/CALON_SISWA/PEMBIMBING_INDUSTRI/PENGUJI_EKSTERNAL/SUPERADMIN)", () => {
    it("GET /pdp/me/data → pdp:data:self", () => {
      expect(permissionsOf(PdpController.prototype.collectMyData)).toContain("pdp:data:self");
    });

    it("PUT /pdp/me → pdp:data:self ATAU user:write:self (OR)", () => {
      const permissions = permissionsOf(PdpController.prototype.updateMyProfile);
      expect(permissions).toContain("pdp:data:self");
      expect(permissions).toContain("user:write:self");
    });

    it("POST /pdp/me/export → pdp:export:self", () => {
      expect(permissionsOf(PdpController.prototype.exportMyData)).toContain("pdp:export:self");
    });

    it("GET /pdp/me/exports → pdp:export:self", () => {
      expect(permissionsOf(PdpController.prototype.listMyExports)).toContain("pdp:export:self");
    });

    it("GET /pdp/me/exports/:id/download → pdp:export:self", () => {
      expect(permissionsOf(PdpController.prototype.downloadMyExport)).toContain("pdp:export:self");
    });

    it("POST /pdp/me/delete-request → pdp:delete-request:self", () => {
      expect(permissionsOf(PdpController.prototype.requestDelete)).toContain(
        "pdp:delete-request:self"
      );
    });

    it("GET /pdp/me/requests → pdp:delete-request:self", () => {
      expect(permissionsOf(PdpController.prototype.listMyRequests)).toContain(
        "pdp:delete-request:self"
      );
    });

    it("GET /pdp/consents → pdp:data:self", () => {
      expect(permissionsOf(PdpController.prototype.listConsents)).toContain("pdp:data:self");
    });
  });

  describe("RBAC metadata — endpoint admin (SUPERADMIN/OPERATOR)", () => {
    it("GET /pdp/requests → pdp:review:school", () => {
      expect(permissionsOf(PdpController.prototype.listRequests)).toContain("pdp:review:school");
    });

    it("POST /pdp/requests/:id/approve → pdp:review:school", () => {
      expect(permissionsOf(PdpController.prototype.approveRequest)).toContain("pdp:review:school");
    });

    it("POST /pdp/requests/:id/reject → pdp:review:school", () => {
      expect(permissionsOf(PdpController.prototype.rejectRequest)).toContain("pdp:review:school");
    });

    it("GET /pdp/retention → retention:configure:school", () => {
      expect(permissionsOf(PdpController.prototype.getRetentionPolicies)).toContain(
        "retention:configure:school"
      );
    });

    it("PUT /pdp/retention/:entity → retention:configure:school", () => {
      expect(permissionsOf(PdpController.prototype.upsertRetentionPolicy)).toContain(
        "retention:configure:school"
      );
    });

    it("POST /pdp/retention/run → retention:run:school", () => {
      expect(permissionsOf(PdpController.prototype.runRetention)).toContain("retention:run:school");
    });
  });

  describe("RBAC metadata — endpoint self TIDAK mengizinkan scope school", () => {
    it("endpoint self tidak meminta pdp:review:school", () => {
      const selfHandlers = [
        PdpController.prototype.collectMyData,
        PdpController.prototype.exportMyData,
        PdpController.prototype.listMyExports,
        PdpController.prototype.downloadMyExport,
        PdpController.prototype.requestDelete,
        PdpController.prototype.listMyRequests,
        PdpController.prototype.listConsents
      ];
      for (const handler of selfHandlers) {
        expect(permissionsOf(handler)).not.toContain("pdp:review:school");
      }
    });
  });

  describe("upsertRetentionPolicy — validasi entity dari path param", () => {
    const makeController = () => {
      const service = { upsertRetentionPolicy: jest.fn() };
      const controller = new PdpController(service as never);
      return { service, controller };
    };

    it("entity invalid (mis. 'User') → 400 BadRequestException, service tidak dipanggil", () => {
      const { service, controller } = makeController();
      expect(() =>
        controller.upsertRetentionPolicy("User", { retentionMonths: 12, action: "DELETE" } as never)
      ).toThrow(BadRequestException);
      expect(service.upsertRetentionPolicy).not.toHaveBeenCalled();
    });

    it("entity valid → diteruskan ke service (entity dari param, body tanpa entity)", () => {
      const { service, controller } = makeController();
      const dto = { retentionMonths: 12, action: "DELETE" } as never;
      controller.upsertRetentionPolicy("Notification", dto);
      expect(service.upsertRetentionPolicy).toHaveBeenCalledWith("Notification", dto);
    });
  });
});
