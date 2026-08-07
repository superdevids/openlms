import { AttendanceRekapService } from "./attendance-rekap.service";

describe("AttendanceRekapService — rekap & kedisiplinan (M-ABSQR-T5/T6)", () => {
  let service: AttendanceRekapService;

  beforeEach(() => {
    service = new AttendanceRekapService();
  });

  describe("computeRekap", () => {
    it("menghitung persentase kehadiran & alpa dengan benar", () => {
      const summary = service.computeRekap([
        "HADIR",
        "HADIR",
        "IZIN",
        "ALPA",
        "TERLAMBAT",
        "SAKIT",
        "HADIR",
        "HADIR",
        "HADIR",
        "ALPA"
      ]);

      expect(summary.total).toBe(10);
      expect(summary.hadir).toBe(5);
      expect(summary.izin).toBe(1);
      expect(summary.sakit).toBe(1);
      expect(summary.alpa).toBe(2);
      expect(summary.terlambat).toBe(1);
      // kehadiran = non-alpa = 8/10
      expect(summary.kehadiranPercent).toBe(80);
      expect(summary.alpaPercent).toBe(20);
    });

    it("list kosong -> nol tanpa pembagian dengan nol", () => {
      const summary = service.computeRekap([]);
      expect(summary).toEqual({
        total: 0,
        hadir: 0,
        izin: 0,
        sakit: 0,
        alpa: 0,
        terlambat: 0,
        kehadiranPercent: 0,
        alpaPercent: 0
      });
    });

    it("semua ALPA -> kehadiran 0%, alpa 100%", () => {
      const summary = service.computeRekap(["ALPA", "ALPA"]);
      expect(summary.kehadiranPercent).toBe(0);
      expect(summary.alpaPercent).toBe(100);
    });

    it("pembulatan satu desimal", () => {
      // 3 dari 4 non-alpa -> 75%; 1/3 alpa -> 33.3
      const summary = service.computeRekap(["HADIR", "HADIR", "ALPA", "TERLAMBAT"]);
      expect(summary.kehadiranPercent).toBe(75);
      expect(summary.alpaPercent).toBe(25);
    });
  });

  describe("computeDiscipline", () => {
    const entries = [
      { studentId: "s1", status: "ALPA" as const },
      { studentId: "s1", status: "ALPA" as const },
      { studentId: "s1", status: "ALPA" as const },
      { studentId: "s2", status: "ALPA" as const },
      { studentId: "s2", status: "HADIR" as const },
      { studentId: "s3", status: "HADIR" as const }
    ];

    it("highlight siswa berisiko saat alpa >= ambang (default 3/bulan)", () => {
      const result = service.computeDiscipline(entries, 3);

      expect(result).toHaveLength(2);
      const s1 = result.find((r) => r.studentId === "s1");
      const s2 = result.find((r) => r.studentId === "s2");
      expect(s1?.alpaCount).toBe(3);
      expect(s1?.atRisk).toBe(true);
      expect(s2?.alpaCount).toBe(1);
      expect(s2?.atRisk).toBe(false);
      // siswa tanpa alpa tidak muncul
      expect(result.find((r) => r.studentId === "s3")).toBeUndefined();
    });

    it("tepat di ambang -> atRisk true (batas inklusif)", () => {
      const result = service.computeDiscipline(entries, 3);
      expect(result.find((r) => r.studentId === "s1")?.atRisk).toBe(true);
    });

    it("ambang 4 -> s1 belum berisiko", () => {
      const result = service.computeDiscipline(entries, 4);
      expect(result.find((r) => r.studentId === "s1")?.atRisk).toBe(false);
    });
  });
});
