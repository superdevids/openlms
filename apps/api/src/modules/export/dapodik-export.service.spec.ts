import { mkdirSync, readFileSync, rmSync, readdirSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { PERMISSIONS_KEY } from "../../common/require-permission.decorator";
import { DapodikController } from "./dapodik.controller";
import { DapodikExportService } from "./dapodik-export.service";

jest.mock("@opensis/database", () => ({
  prisma: {
    schoolProfile: { findFirst: jest.fn() },
    userRole: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
    enrollment: { findMany: jest.fn() },
    ppdbApplicant: { findMany: jest.fn() },
    staff: { findMany: jest.fn() },
    class: { findMany: jest.fn() },
    dataExportLog: { update: jest.fn() }
  }
}));

import { prisma } from "@opensis/database";

const prismaMock = prisma as unknown as {
  schoolProfile: { findFirst: jest.Mock };
  userRole: { findMany: jest.Mock };
  user: { findMany: jest.Mock };
  enrollment: { findMany: jest.Mock };
  ppdbApplicant: { findMany: jest.Mock };
  staff: { findMany: jest.Mock };
  class: { findMany: jest.Mock };
  dataExportLog: { update: jest.Mock };
};

const exportDir = join(tmpdir(), `opensis-dapodik-test-${Date.now()}`);
const originalDir = process.env.STORAGE_EXPORT_DIR;

const log = {
  id: "log_d",
  export_type: "DAPODIK" as const,
  requested_by: "u_1",
  status: "PENDING" as const,
  file_url: null,
  record_count: null,
  started_at: null,
  finished_at: null,
  created_at: new Date(),
  updated_at: new Date()
};

function stubQueries() {
  prismaMock.schoolProfile.findFirst.mockResolvedValue({ name: "SMKN 1 Contoh", npsn: "12345678" });
  prismaMock.userRole.findMany.mockResolvedValue([{ user_id: "stu_1" }]);
  prismaMock.user.findMany.mockResolvedValue([
    { id: "stu_1", full_name: "Doe, John", username: "john.doe" }
  ]);
  prismaMock.enrollment.findMany.mockResolvedValue([
    {
      student_id: "stu_1",
      class: { name: "X TKJ 1" },
      academic_year: { code: "2026/2027" }
    }
  ]);
  prismaMock.ppdbApplicant.findMany.mockResolvedValue([
    {
      user_id: "stu_1",
      nisn: "0012345678",
      gender: "L",
      birth_place: "Jakarta",
      birth_date: new Date("2008-01-15T00:00:00.000Z")
    }
  ]);
  prismaMock.staff.findMany.mockResolvedValue([
    {
      id: "st_1",
      nip: "198001012010011001",
      user: { full_name: "Drs. Budi" },
      position: "GURU",
      status: "ACTIVE"
    }
  ]);
  prismaMock.class.findMany.mockResolvedValue([
    {
      id: "c_1",
      name: "X TKJ 1",
      grade_level: 10,
      academic_year: { code: "2026/2027" },
      homeroom_teacher: { full_name: "Drs. Budi" },
      prodi: { name: "Teknik Komputer dan Jaringan" },
      enrollments: [{ id: "e_1" }, { id: "e_2" }]
    }
  ]);
}

describe("DapodikExportService — generate 3 CSV", () => {
  let service: DapodikExportService;

  beforeAll(() => {
    mkdirSync(exportDir, { recursive: true });
    process.env.STORAGE_EXPORT_DIR = exportDir;
    service = new DapodikExportService();
  });

  afterAll(() => {
    if (originalDir === undefined) delete process.env.STORAGE_EXPORT_DIR;
    else process.env.STORAGE_EXPORT_DIR = originalDir;
    rmSync(exportDir, { recursive: true, force: true });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    stubQueries();
    prismaMock.dataExportLog.update.mockResolvedValue({ id: "log_d", status: "COMPLETED" });
  });

  it("menulis 3 file CSV dengan BOM UTF-8 dan header yang benar", async () => {
    await service.generate(log, { academicYear: "2026/2027" });

    const peserta = readFileSync(join(exportDir, findDir(), "peserta_didik.csv"), "utf8");
    expect(peserta.startsWith("\uFEFF")).toBe(true);
    expect(peserta).toContain("NISN,Nama,NIS/Username,JK/TTL,Rombel,Tahun Ajaran,Status,NPSN");
    // buildCsv mengutip sel yang mengandung koma (escaping CSV).
    expect(peserta).toContain(
      '0012345678,"Doe, John",john.doe,"L / Jakarta, 2008-01-15",X TKJ 1,2026/2027,AKTIF,12345678'
    );

    const pendidik = readFileSync(join(exportDir, findDir(), "pendidik.csv"), "utf8");
    expect(pendidik.startsWith("\uFEFF")).toBe(true);
    expect(pendidik).toContain("NIP,Nama,Jabatan,Status,NUPTK,Catatan,NPSN");
    expect(pendidik).toContain(
      "198001012010011001,Drs. Budi,GURU,ACTIVE,,NUPTK belum tersedia di sistem,12345678"
    );

    const rombel = readFileSync(join(exportDir, findDir(), "rombongan_belajar.csv"), "utf8");
    expect(rombel.startsWith("\uFEFF")).toBe(true);
    expect(rombel).toContain(
      "Nama Kelas,Tingkat,Tahun Ajaran,Wali Kelas,Kompetensi Keahlian,Jumlah Siswa,NPSN"
    );
    expect(rombel).toContain(
      "X TKJ 1,10,2026/2027,Drs. Budi,Teknik Komputer dan Jaringan,2,12345678"
    );

    expect(prismaMock.dataExportLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "log_d" },
        data: expect.objectContaining({ status: "COMPLETED" })
      })
    );
  });

  it("escaping CSV: nama mengandung koma dikutip", async () => {
    await service.generate(log, {});
    const peserta = readFileSync(join(exportDir, findDir(), "peserta_didik.csv"), "utf8");
    expect(peserta).toContain('"Doe, John"');
  });

  it("kegagalan query menandai DataExportLog FAILED + melempar error", async () => {
    prismaMock.user.findMany.mockRejectedValue(new Error("db down"));
    await expect(service.generate(log, {})).rejects.toThrow("db down");
    expect(prismaMock.dataExportLog.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "FAILED" })
      })
    );
  });
});

describe("DapodikController — RBAC POST /dapodik/export", () => {
  it("mendeklarasikan permission export:run:school", () => {
    const permissions = Reflect.getMetadata(
      PERMISSIONS_KEY,
      DapodikController.prototype.export
    ) as string[];
    expect(permissions).toContain("export:run:school");
  });
});

/** Temukan direktori dapodik_<stamp> terbaru di exportDir. */
function findDir(): string {
  const dirs = readdirSync(exportDir).filter((d) => d.startsWith("dapodik_"));
  if (dirs.length === 0) throw new Error("tidak ada direktori dapodik_*");
  return dirs.sort()[dirs.length - 1] as string;
}
