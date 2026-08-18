/**
 * Referensi kurikulum dasar (CP/ATP) — PERSISTEN di Prisma (model
 * CurriculumReference + Subject, W2). Sebelumnya store Map in-memory; sekarang
 * data tersimpan di tabel `curriculum_reference` dengan subject_id di-resolve
 * dari Subject (upsert by code bila belum ada).
 *
 * Kontrak service TIDAK berubah (curriculum.controller.ts & DTO tetap):
 *   CurriculumReference { id, subjectCode, subjectName, phase,
 *   capaianPembelajaran, alurTujuanPembelajaran }.
 * Seed referensi (curriculum.seed.ts) dijalankan idempoten saat module init.
 */
import { Inject, Injectable, Logger, NotFoundException, OnModuleInit } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";
import { SEED_CURRICULUM_REFERENCES } from "./curriculum.seed";

export interface CurriculumReference {
  id: string;
  subjectCode: string;
  subjectName: string;
  /** Fase: "E" (kelas 10) / "F" (kelas 11-12). */
  phase: string;
  capaianPembelajaran: string;
  alurTujuanPembelajaran: string[];
}

export interface CurriculumInput {
  id?: string;
  subjectCode: string;
  subjectName: string;
  phase: string;
  capaianPembelajaran: string;
  alurTujuanPembelajaran: string[];
}

export interface CurriculumFilter {
  phase?: string;
  subjectCode?: string;
}

type CurriculumReferenceRow = Prisma.CurriculumReferenceGetPayload<{
  include: { subject: true };
}>;

interface CurriculumContent {
  phase?: string;
  capaianPembelajaran?: string;
  alurTujuanPembelajaran?: string[];
}

function toView(row: CurriculumReferenceRow): CurriculumReference {
  const content = (row.content ?? {}) as CurriculumContent;
  const alur = Array.isArray(content.alurTujuanPembelajaran) ? content.alurTujuanPembelajaran : [];
  return {
    id: row.id,
    subjectCode: row.subject.code,
    subjectName: row.subject.name,
    phase: content.phase ?? "",
    capaianPembelajaran: content.capaianPembelajaran ?? "",
    alurTujuanPembelajaran: [...alur]
  };
}

/** Kode referensi unik per (subject, type, code) — pola "CP-{mapel}-{fase}". */
function referenceCode(subjectCode: string, phase: string): string {
  return `CUR-${subjectCode}-${phase}`;
}

@Injectable()
export class CurriculumService implements OnModuleInit {
  private readonly logger = new Logger(CurriculumService.name);
  private seedPromise: Promise<void> | null = null;

  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async onModuleInit(): Promise<void> {
    await this.ensureSeeded();
  }

  // ---------- Seed (idempoten) ----------

  private ensureSeeded(): Promise<void> {
    if (!this.seedPromise) {
      this.seedPromise = this.doSeed();
    }
    return this.seedPromise;
  }

  private async doSeed(): Promise<void> {
    for (const ref of SEED_CURRICULUM_REFERENCES) {
      await this.upsert({
        subjectCode: ref.subjectCode,
        subjectName: ref.subjectName,
        phase: ref.phase,
        capaianPembelajaran: ref.capaianPembelajaran,
        alurTujuanPembelajaran: ref.alurTujuanPembelajaran
      });
    }
    this.logger.log(`Seeded ${SEED_CURRICULUM_REFERENCES.length} referensi kurikulum`);
  }

  // ---------- Query ----------

  async list(filter: CurriculumFilter = {}): Promise<CurriculumReference[]> {
    const where: Prisma.CurriculumReferenceWhereInput = {};
    if (filter.subjectCode) {
      where.subject = { code: filter.subjectCode };
    }
    if (filter.phase) {
      where.content = { path: ["phase"], equals: filter.phase };
    }
    const rows = await this.db.curriculumReference.findMany({
      where,
      include: { subject: true },
      orderBy: { subject: { code: "asc" } }
    });
    return rows.map(toView);
  }

  async getById(id: string): Promise<CurriculumReference> {
    const row = await this.db.curriculumReference.findUnique({
      where: { id },
      include: { subject: true }
    });
    if (!row) {
      throw new NotFoundException(`Referensi kurikulum ${id} tidak ditemukan`);
    }
    return toView(row);
  }

  async findBySubjectCode(subjectCode: string): Promise<CurriculumReference[]> {
    return this.list({ subjectCode });
  }

  async upsert(input: CurriculumInput): Promise<CurriculumReference> {
    // Resolve Subject (upsert by code; category WAJIB untuk referensi kurikulum).
    const subject = await this.db.subject.upsert({
      where: { code: input.subjectCode },
      create: {
        code: input.subjectCode,
        name: input.subjectName,
        category: "WAJIB"
      },
      update: { name: input.subjectName }
    });
    const code = referenceCode(input.subjectCode, input.phase);
    const content: Prisma.InputJsonValue = {
      phase: input.phase,
      capaianPembelajaran: input.capaianPembelajaran,
      alurTujuanPembelajaran: [...input.alurTujuanPembelajaran]
    };
    const row = await this.db.curriculumReference.upsert({
      where: { subject_id_type_code: { subject_id: subject.id, type: "CP", code } },
      create: {
        subject_id: subject.id,
        type: "CP",
        code,
        name: input.subjectName,
        content
      },
      update: { name: input.subjectName, content },
      include: { subject: true }
    });
    return toView(row);
  }

  /** Hapus baris referensi kurikulum (Subject TIDAK dihapus). */
  async remove(id: string): Promise<boolean> {
    try {
      await this.db.curriculumReference.delete({ where: { id } });
      return true;
    } catch (err) {
      // P2025 = record not found → perilaku sama dengan Map.delete(false).
      if ((err as { code?: string } | undefined)?.code === "P2025") {
        return false;
      }
      throw err;
    }
  }
}
