import { Injectable, Logger } from "@nestjs/common";
import { ImportCommitPayload, ImportService } from "../../onboarding/import.service";

/**
 * ImportProcessor — commit impor data masal via queue (pola JobsService.generateSpp:
 * handler enqueue oleh REST, eksekusi berat di sini lewat service domain).
 * Payload (batchId/rows) dibawa job; REST membuat batch PROCESSING + error
 * validasi (createMany), processor menyelesaikan baris valid + AuditLog.
 */
@Injectable()
export class ImportProcessor {
  private readonly logger = new Logger(ImportProcessor.name);

  constructor(private readonly importService: ImportService) {}

  async handle(payload: unknown): Promise<void> {
    const input = payload as ImportCommitPayload;
    if (!input || !input.batchId) {
      this.logger.warn("import.commit: payload tidak lengkap (butuh batchId), dilewati");
      return;
    }
    const result = await this.importService.commit(input);
    this.logger.log(
      `import.commit ${input.batchId} (${input.importType}): ${result.successRows} berhasil, ${result.failedRows} gagal`
    );
  }
}
