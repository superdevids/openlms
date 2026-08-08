import { Injectable } from "@nestjs/common";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "@opensis/database";
import type { RequestContext } from "@opensis/types";
import { assertCanManageClass, assertCanAccessStudent, scopeOf } from "../lms-scope";
import { buildCsv, buildSimplePdf } from "./export-file";
import { GradesService } from "./grades.service";
import { ExportGradesDto } from "./dto/grades.dto";

export interface ExportResult {
  filePath: string;
  fileUrl: string;
  recordCount: number;
}

/**
 * Ekspor CSV/PDF dasar (F2-T9): generate file, simpan path lokal di
 * `STORAGE_EXPORT_DIR` (default ./storage/exports), catat DataExportLog
 * (export_type NILAI). Integration mengganti penyimpanan ke bucket `exports`.
 */
@Injectable()
export class GradeExportService {
  private readonly exportDir: string;

  constructor(private readonly gradesService: GradesService) {
    this.exportDir = process.env.STORAGE_EXPORT_DIR ?? join(process.cwd(), "storage", "exports");
    mkdirSync(this.exportDir, { recursive: true });
  }

  async exportCsv(filter: ExportGradesDto, ctx: RequestContext): Promise<ExportResult> {
    const grades = await this.loadScoped(filter, ctx);
    const rows = grades.map((g) => [
      g.student.full_name,
      g.class_subject.class.name,
      g.class_subject.subject.name,
      g.semester,
      g.type,
      String(g.score),
      String(g.weight),
      g.note ?? ""
    ]);
    const csv = buildCsv(rows, [
      "Nama",
      "Kelas",
      "Mapel",
      "Semester",
      "Tipe",
      "Skor",
      "Bobot",
      "Catatan"
    ]);
    return this.writeFile(csv, "csv", filter, ctx);
  }

  async exportPdf(filter: ExportGradesDto, ctx: RequestContext): Promise<ExportResult> {
    const grades = await this.loadScoped(filter, ctx);
    const lines = [
      "opensis - Rekap Nilai",
      `Semester: ${filter.semester ?? "-"}   Kelas: ${filter.classId ?? "-"}`,
      "----------------------------------------"
    ];
    for (const g of grades) {
      lines.push(
        `${g.student.full_name} | ${g.class_subject.class.name} | ${g.class_subject.subject.name} | ${g.type} | ${g.score}`
      );
    }
    const pdf = buildSimplePdf(lines);
    return this.writeFile(pdf, "pdf", filter, ctx);
  }

  private async loadScoped(filter: ExportGradesDto, ctx: RequestContext) {
    if (scopeOf(ctx) === "SENDIRI") {
      assertCanAccessStudent(ctx, filter.studentId ?? ctx.userId);
      filter.studentId = ctx.userId;
    } else if (filter.classId) {
      assertCanManageClass(ctx, filter.classId);
    }

    return prisma.grade.findMany({
      where: this.gradesService.buildWhere(filter),
      include: {
        student: { select: { id: true, full_name: true } },
        class_subject: {
          include: {
            class: { select: { id: true, name: true } },
            subject: { select: { id: true, code: true, name: true } }
          }
        }
      },
      orderBy: [{ student_id: "asc" }, { class_subject_id: "asc" }]
    });
  }

  private async writeFile(
    content: string | Buffer,
    ext: "csv" | "pdf",
    filter: ExportGradesDto,
    ctx: RequestContext
  ): Promise<ExportResult> {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `nilai_${filter.semester ?? "all"}_${stamp}.${ext}`;
    const filePath = join(this.exportDir, filename);
    writeFileSync(filePath, content);

    const fileUrl = `exports/${filename}`;
    const recordCount = ext === "csv" ? this.countRows(content) : (content as Buffer).length;

    await prisma.dataExportLog.create({
      data: {
        export_type: "NILAI",
        requested_by: ctx.userId,
        status: "COMPLETED",
        file_url: fileUrl,
        record_count: recordCount,
        finished_at: new Date()
      }
    });
    return { filePath, fileUrl, recordCount };
  }

  private countRows(content: string | Buffer): number {
    const text = typeof content === "string" ? content : content.toString("utf8");
    return text.split(/\r?\n/).filter((line) => line.trim().length > 0).length - 1;
  }
}
