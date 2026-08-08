/**
 * Unit test — ScopeResolver (prd04 §4.1): resolve scope + cache + invalidate.
 */
import "reflect-metadata";
import { ScopeResolver } from "../../src/common/scope-resolver";

function makePrismaMock() {
  const classSubject = { findMany: jest.fn() };
  const enrollment = { findMany: jest.fn() };
  const classModel = { findFirst: jest.fn() };
  const prisma = {
    classSubject,
    enrollment,
    class: classModel
  } as never;
  return { prisma, classSubject, enrollment, classModel };
}

describe("ScopeResolver", () => {
  beforeEach(() => {
    ScopeResolver.invalidateAllScope();
  });

  it("resolve menggabungkan kelas diajar + diikuti (dedupe) + homeroom", async () => {
    const { prisma, classSubject, enrollment, classModel } = makePrismaMock();
    classSubject.findMany.mockResolvedValue([{ class_id: "c1" }, { class_id: "c2" }]);
    enrollment.findMany.mockResolvedValue([{ class_id: "c2" }, { class_id: "c3" }]);
    classModel.findFirst.mockResolvedValue({ id: "c9" });

    const resolver = new ScopeResolver(prisma);
    const scope = await resolver.resolve("u1");

    expect(scope.classIds.sort()).toEqual(["c1", "c2", "c3"]);
    expect(scope.homeroomClassId).toBe("c9");
  });

  it("resolve tanpa homeroom → null", async () => {
    const { prisma, classSubject, enrollment, classModel } = makePrismaMock();
    classSubject.findMany.mockResolvedValue([]);
    enrollment.findMany.mockResolvedValue([]);
    classModel.findFirst.mockResolvedValue(null);

    const resolver = new ScopeResolver(prisma);
    const scope = await resolver.resolve("u1");
    expect(scope.classIds).toEqual([]);
    expect(scope.homeroomClassId).toBeNull();
  });

  it("resolve meng-cache per user (query hanya sekali dalam TTL)", async () => {
    const { prisma, classSubject, enrollment, classModel } = makePrismaMock();
    classSubject.findMany.mockResolvedValue([{ class_id: "c1" }]);
    enrollment.findMany.mockResolvedValue([]);
    classModel.findFirst.mockResolvedValue(null);

    const resolver = new ScopeResolver(prisma);
    await resolver.resolve("u1");
    await resolver.resolve("u1");

    expect(classSubject.findMany).toHaveBeenCalledTimes(1);
  });

  it("invalidateScope memaksa reload", async () => {
    const { prisma, classSubject, enrollment, classModel } = makePrismaMock();
    classSubject.findMany.mockResolvedValue([{ class_id: "c1" }]);
    enrollment.findMany.mockResolvedValue([]);
    classModel.findFirst.mockResolvedValue(null);

    const resolver = new ScopeResolver(prisma);
    await resolver.resolve("u1");
    classSubject.findMany.mockResolvedValue([{ class_id: "c2" }]);
    ScopeResolver.invalidateScope("u1");
    const scope = await resolver.resolve("u1");

    expect(scope.classIds).toEqual(["c2"]);
    expect(classSubject.findMany).toHaveBeenCalledTimes(2);
  });

  it("query hanya untuk status enrollment ACTIVE", async () => {
    const { prisma, classSubject, classModel, enrollment } = makePrismaMock();
    classSubject.findMany.mockResolvedValue([]);
    enrollment.findMany.mockResolvedValue([]);
    classModel.findFirst.mockResolvedValue(null);
    const resolver = new ScopeResolver(prisma);
    await resolver.resolve("u1");
    expect(enrollment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { student_id: "u1", status: "ACTIVE" } })
    );
  });
});
