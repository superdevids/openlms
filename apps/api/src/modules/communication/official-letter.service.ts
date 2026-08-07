/**
 * OfficialLetterService — surat-menyurat (prd04 §5.K).
 * Approval flow: DRAFT -> SUBMITTED -> APPROVED/REJECTED.
 * Tanda tangan digital DITUNDA (status SIGNED tidak dipakai pada alur ini).
 * RBAC enforced di CommunicationController (letter:request:self untuk pemohon;
 * letter:approve:school untuk approval KEPSEK/WAKEPSEK).
 */
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { OfficialLetter } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";

/** Type lokal — @openlms/types belum mengekspor LetterType (ISSUES). */
export type LetterType = "KETERANGAN" | "IZIN" | "UNDANGAN" | "LAINNYA";

export interface CreateLetterInput {
  requesterId: string;
  type: LetterType;
  subject: string;
  body: string;
}

@Injectable()
export class OfficialLetterService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async create(input: CreateLetterInput): Promise<OfficialLetter> {
    if (!input.subject || !input.body) {
      throw new BadRequestException("subject dan body wajib diisi");
    }
    return this.db.officialLetter.create({
      data: {
        type: input.type,
        subject: input.subject,
        body: input.body,
        status: "DRAFT",
        requester_id: input.requesterId
      }
    });
  }

  async submit(id: string): Promise<OfficialLetter> {
    const letter = await this.requireLetter(id);
    if (letter.status !== "DRAFT") {
      throw new ConflictException(
        `Hanya surat DRAFT yang bisa disubmit (saat ini ${letter.status})`
      );
    }
    return this.db.officialLetter.update({ where: { id }, data: { status: "SUBMITTED" } });
  }

  async approve(id: string, approverId: string): Promise<OfficialLetter> {
    const letter = await this.requireLetter(id);
    if (letter.status !== "SUBMITTED") {
      throw new ConflictException(
        `Hanya surat SUBMITTED yang bisa disetujui (saat ini ${letter.status})`
      );
    }
    const letterNo = this.generateLetterNo(letter);
    return this.db.officialLetter.update({
      where: { id },
      data: { status: "APPROVED", approver_id: approverId, letter_no: letterNo }
    });
  }

  async reject(id: string, approverId: string): Promise<OfficialLetter> {
    const letter = await this.requireLetter(id);
    if (letter.status !== "SUBMITTED") {
      throw new ConflictException(
        `Hanya surat SUBMITTED yang bisa ditolak (saat ini ${letter.status})`
      );
    }
    return this.db.officialLetter.update({
      where: { id },
      data: { status: "REJECTED", approver_id: approverId }
    });
  }

  /** Tanda tangan digital DITUNDA (prd04): lempar penolakan eksplisit. */
  async sign(id: string): Promise<never> {
    await this.requireLetter(id);
    throw new ForbiddenException({
      error: {
        code: "FEATURE_DISABLED",
        message: "Tanda tangan digital (SIGNED) masih DITUNDA; cukup status APPROVED"
      }
    });
  }

  /** Surat untuk pemohon (scope SENDIRI) atau semua bila admin. */
  async listForRequester(requesterId: string): Promise<OfficialLetter[]> {
    return this.db.officialLetter.findMany({
      where: { requester_id: requesterId },
      orderBy: { created_at: "desc" }
    });
  }

  private async requireLetter(id: string): Promise<OfficialLetter> {
    const letter = await this.db.officialLetter.findUnique({ where: { id } });
    if (!letter) throw new NotFoundException("Surat tidak ditemukan");
    return letter;
  }

  private generateLetterNo(letter: OfficialLetter): string {
    const seq = Math.floor(Math.random() * 9000) + 1000;
    const year = new Date().getFullYear();
    return `${letter.type === "KETERANGAN" ? "SKT" : "ST."}${seq}/ECL/${year}`;
  }
}
