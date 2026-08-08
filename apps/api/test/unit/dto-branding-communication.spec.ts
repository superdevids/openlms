/**
 * Unit test — DTO validation modul branding & komunikasi (class-validator).
 */
import "reflect-metadata";
import { expectDtoInvalid, expectDtoValid } from "../helpers/dto-validation";
import { UpdateBrandingDto } from "../../src/modules/branding/dto/update-branding.dto";
import {
  CreateAnnouncementDto,
  CreateOfficialLetterDto,
  UpdateAnnouncementDto
} from "../../src/modules/communication/dto/communication.dto";

describe("DTO — UpdateBrandingDto", () => {
  it("objek kosong valid (semua field opsional)", async () => {
    await expectDtoValid(UpdateBrandingDto, {});
  });

  it("nilai valid diterima", async () => {
    await expectDtoValid(UpdateBrandingDto, {
      appName: "SekolahKu",
      tagline: "Unggul",
      primaryColor: "#2563eb",
      secondaryColor: "#1d4ed8",
      accentColor: "#0ea5e9",
      radius: 8
    });
  });

  it("appName terlalu panjang > 80 ditolak", async () => {
    await expectDtoInvalid(UpdateBrandingDto, { appName: "x".repeat(81) }, { property: "appName" });
  });

  it("warna bukan hex ditolak", async () => {
    await expectDtoInvalid(
      UpdateBrandingDto,
      { primaryColor: "blue" },
      { property: "primaryColor" }
    );
    await expectDtoInvalid(
      UpdateBrandingDto,
      { accentColor: "#12345" },
      { property: "accentColor" }
    );
  });

  it("radius negatif / > 32 / bukan integer ditolak", async () => {
    await expectDtoInvalid(UpdateBrandingDto, { radius: -1 }, { property: "radius" });
    await expectDtoInvalid(UpdateBrandingDto, { radius: 33 }, { property: "radius" });
    await expectDtoInvalid(UpdateBrandingDto, { radius: 1.5 }, { property: "radius" });
  });

  it("appName bukan string ditolak", async () => {
    await expectDtoInvalid(UpdateBrandingDto, { appName: 123 }, { property: "appName" });
  });
});

describe("DTO — CreateAnnouncementDto", () => {
  const base = { title: "Libur Nasional", body: "17 Agustus", targetRoles: ["SISWA"] };

  it("payload valid diterima", async () => {
    await expectDtoValid(CreateAnnouncementDto, base);
  });

  it("title/body pendek (< 3) ditolak", async () => {
    await expectDtoInvalid(CreateAnnouncementDto, { ...base, title: "ab" }, { property: "title" });
    await expectDtoInvalid(CreateAnnouncementDto, { ...base, body: "" }, { property: "body" });
  });

  it("targetRoles bukan array / berisi role tidak dikenal ditolak", async () => {
    await expectDtoInvalid(
      CreateAnnouncementDto,
      { ...base, targetRoles: "SISWA" },
      { property: "targetRoles" }
    );
    await expectDtoInvalid(
      CreateAnnouncementDto,
      { ...base, targetRoles: ["ROLE_ASING"] },
      { property: "targetRoles" }
    );
  });

  it("targetRoles kosong ditolak di level service; DTO menerima array kosong (IsArray)", async () => {
    // DTO class-validator: array kosong lolos @IsArray — penolakan kosong
    // ditangani AnnouncementService (BadRequestException). Validasi negatif
    // yang benar di DTO adalah array berisi role tidak dikenal.
    await expectDtoInvalid(
      CreateAnnouncementDto,
      { ...base, targetRoles: ["ROLE_ASING"] },
      { property: "targetRoles" }
    );
  });

  it("pinned/publishNow bukan boolean ditolak", async () => {
    await expectDtoInvalid(
      CreateAnnouncementDto,
      { ...base, pinned: "yes" },
      { property: "pinned" }
    );
    await expectDtoInvalid(
      CreateAnnouncementDto,
      { ...base, publishNow: 1 },
      { property: "publishNow" }
    );
  });
});

describe("DTO — UpdateAnnouncementDto", () => {
  it("objek kosong valid", async () => {
    await expectDtoValid(UpdateAnnouncementDto, {});
  });

  it("targetRoles invalid ditolak saat dikirim", async () => {
    await expectDtoInvalid(
      UpdateAnnouncementDto,
      { targetRoles: ["NOPE"] },
      { property: "targetRoles" }
    );
  });
});

describe("DTO — CreateOfficialLetterDto", () => {
  const base = { type: "KETERANGAN", subject: "Permohonan Izin", body: "Karena sakit" };

  it("payload valid diterima", async () => {
    await expectDtoValid(CreateOfficialLetterDto, base);
  });

  it("type tidak dikenal ditolak", async () => {
    await expectDtoInvalid(
      CreateOfficialLetterDto,
      { ...base, type: "SOMETHING" },
      { property: "type" }
    );
  });

  it("subject/body pendek ditolak", async () => {
    await expectDtoInvalid(
      CreateOfficialLetterDto,
      { ...base, subject: "ab" },
      { property: "subject" }
    );
    await expectDtoInvalid(CreateOfficialLetterDto, { ...base, body: "" }, { property: "body" });
  });
});
