/**
 * Referensi kurikulum dasar (CP/ATP) — model SEDERHANA dalam memori.
 *
 * Schema Prisma belum memiliki entitas CapaianPembelajaran/AlurTujuanPembelajaran
 * (lihat ISSUES). Model ini menyimpan referensi CP/ATP per kode mapel agar
 * modul akademik tetap fungsional; ketika entitas DB tersedia, ganti store
 * dengan repository Prisma tanpa mengubah kontrak service.
 */
import { Injectable, NotFoundException } from "@nestjs/common";
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

@Injectable()
export class CurriculumService {
  private readonly store = new Map<string, CurriculumReference>();

  constructor() {
    for (const ref of SEED_CURRICULUM_REFERENCES) {
      this.store.set(ref.id, { ...ref, alurTujuanPembelajaran: [...ref.alurTujuanPembelajaran] });
    }
  }

  list(filter: CurriculumFilter = {}): CurriculumReference[] {
    const result: CurriculumReference[] = [];
    for (const ref of this.store.values()) {
      if (filter.phase && ref.phase !== filter.phase) continue;
      if (filter.subjectCode && ref.subjectCode !== filter.subjectCode) continue;
      result.push(this.clone(ref));
    }
    return result.sort((a, b) => a.subjectCode.localeCompare(b.subjectCode));
  }

  getById(id: string): CurriculumReference {
    const ref = this.store.get(id);
    if (!ref) throw new NotFoundException(`Referensi kurikulum ${id} tidak ditemukan`);
    return this.clone(ref);
  }

  findBySubjectCode(subjectCode: string): CurriculumReference[] {
    return this.list({ subjectCode });
  }

  upsert(input: CurriculumInput): CurriculumReference {
    const id = input.id ?? `cur:${input.subjectCode}:${input.phase}`;
    const ref: CurriculumReference = {
      id,
      subjectCode: input.subjectCode,
      subjectName: input.subjectName,
      phase: input.phase,
      capaianPembelajaran: input.capaianPembelajaran,
      alurTujuanPembelajaran: [...input.alurTujuanPembelajaran]
    };
    this.store.set(id, ref);
    return this.clone(ref);
  }

  remove(id: string): boolean {
    return this.store.delete(id);
  }

  private clone(ref: CurriculumReference): CurriculumReference {
    return { ...ref, alurTujuanPembelajaran: [...ref.alurTujuanPembelajaran] };
  }
}
