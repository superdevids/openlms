import { ROLES_KEY } from "../../../common/roles.decorator";
import { PERMISSIONS_KEY } from "../../../common/require-permission.decorator";
import { AuditLogController } from "../audit-log.controller";
import { AuditLogService } from "../audit-log.service";

describe("AuditLogController", () => {
  const serviceMock = {
    list: jest.fn(),
    listEntities: jest.fn()
  } as unknown as AuditLogService;

  let controller: AuditLogController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new AuditLogController(serviceMock);
  });

  describe("RBAC (R-11 — visible HANYA SUPERADMIN + KEPSEK)", () => {
    it("list: @Roles membatasi ke SUPERADMIN dan KEPSEK saja", () => {
      const roles = Reflect.getMetadata(ROLES_KEY, AuditLogController.prototype.list) as string[];
      expect(roles).toEqual(["SUPERADMIN", "KEPSEK"]);
      expect(roles).not.toContain("WAKEPSEK");
    });

    it("list: @RequirePermission menuntut audit:read:school", () => {
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        AuditLogController.prototype.list
      ) as string[];
      expect(permissions).toContain("audit:read:school");
    });

    it("listEntities: guard identik (role + permission)", () => {
      const roles = Reflect.getMetadata(
        ROLES_KEY,
        AuditLogController.prototype.listEntities
      ) as string[];
      const permissions = Reflect.getMetadata(
        PERMISSIONS_KEY,
        AuditLogController.prototype.listEntities
      ) as string[];
      expect(roles).toEqual(["SUPERADMIN", "KEPSEK"]);
      expect(permissions).toContain("audit:read:school");
    });
  });

  describe("delegation", () => {
    it("list meneruskan dto ke service dan mengembalikan hasilnya", async () => {
      const dto = { page: 1, pageSize: 20 } as never;
      const page = { items: [], total: 0, page: 1, pageSize: 20 };
      serviceMock.list = jest.fn().mockResolvedValue(page);

      const result = await controller.list(dto);

      expect(serviceMock.list).toHaveBeenCalledWith(dto);
      expect(result).toBe(page);
    });

    it("listEntities meneruskan ke service dan mengembalikan daftar", async () => {
      serviceMock.listEntities = jest.fn().mockResolvedValue(["class", "announcement"]);

      const result = await controller.listEntities();

      expect(serviceMock.listEntities).toHaveBeenCalled();
      expect(result).toEqual(["class", "announcement"]);
    });
  });
});
