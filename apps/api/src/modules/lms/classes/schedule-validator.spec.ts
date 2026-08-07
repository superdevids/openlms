import { findConflicts, periodsOverlap, ScheduleSlot } from "./schedule-validator";

const slot = (overrides: Partial<ScheduleSlot>): ScheduleSlot => ({
  id: "e_1",
  dayOfWeek: 1,
  startPeriod: 1,
  endPeriod: 3,
  teacherId: "t_1",
  room: "R1",
  classId: "c_1",
  ...overrides
});

describe("periodsOverlap", () => {
  it("deteksi tumpang tindih interval", () => {
    expect(periodsOverlap({ start: 1, end: 3 }, { start: 2, end: 4 })).toBe(true);
    expect(periodsOverlap({ start: 1, end: 3 }, { start: 3, end: 4 })).toBe(false);
    expect(periodsOverlap({ start: 3, end: 4 }, { start: 1, end: 3 })).toBe(false);
  });
});

describe("findConflicts (F2-T3 validasi bentrok jadwal)", () => {
  it("guru yang sama di slot tumpang tindih → bentrok TEACHER", () => {
    const conflicts = findConflicts([slot({ id: "e_1" })], slot({ id: "new" }));
    expect(conflicts.some((c) => c.type === "TEACHER")).toBe(true);
  });

  it("ruang yang sama di slot tumpang tindih → bentrok ROOM", () => {
    const conflicts = findConflicts(
      [slot({ id: "e_1", teacherId: "t_2" })],
      slot({ id: "new", teacherId: "t_3" })
    );
    expect(conflicts.some((c) => c.type === "ROOM")).toBe(true);
  });

  it("kelas yang sama di slot tumpang tindih → bentrok CLASS", () => {
    const conflicts = findConflicts(
      [slot({ id: "e_1", teacherId: "t_2", room: "R2" })],
      slot({ id: "new", teacherId: "t_3", room: "R3" })
    );
    expect(conflicts.some((c) => c.type === "CLASS")).toBe(true);
  });

  it("slot berbeda hari atau tidak tumpang tindih → tanpa bentrok", () => {
    expect(findConflicts([slot({ id: "e_1" })], slot({ id: "new", dayOfWeek: 2 }))).toHaveLength(0);
    expect(
      findConflicts([slot({ id: "e_1" })], slot({ id: "new", startPeriod: 4, endPeriod: 5 }))
    ).toHaveLength(0);
  });

  it("update slot yang sama (id sama) tidak dianggap bentrok dengan dirinya sendiri", () => {
    expect(findConflicts([slot({ id: "e_1" })], slot({ id: "e_1" }))).toHaveLength(0);
  });
});
