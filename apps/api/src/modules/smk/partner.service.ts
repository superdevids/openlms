/**
 * PartnerService — direktori DUDI (dunia usaha & dunia industri).
 * Menyimpan mitra (InternshipPartner) dan pembimbing industri (IndustryMentor).
 * RBAC enforced di SmkController (partner:write:school untuk tulis/baca mitra).
 */
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { IndustryMentor, InternshipPartner } from "@prisma/client";
import { DATABASE_CLIENT, DatabaseClient } from "../database/database.constants";

export interface CreatePartnerInput {
  name: string;
  industryType?: string;
  address?: string;
  contactPerson?: string;
  phone?: string;
  agreementYear?: string;
}

export interface AddMentorInput {
  fullName: string;
  position?: string;
  phone?: string;
  userId?: string;
}

@Injectable()
export class PartnerService {
  constructor(@Inject(DATABASE_CLIENT) private readonly db: DatabaseClient) {}

  async list(
    filter: { search?: string; agreementYear?: string } = {}
  ): Promise<InternshipPartner[]> {
    return this.db.internshipPartner.findMany({
      where: {
        ...(filter.search
          ? {
              OR: [
                { name: { contains: filter.search, mode: "insensitive" } },
                { industry_type: { contains: filter.search, mode: "insensitive" } }
              ]
            }
          : {}),
        agreement_year: filter.agreementYear
      },
      include: { _count: { select: { internships: true } } },
      orderBy: { name: "asc" }
    });
  }

  async create(input: CreatePartnerInput): Promise<InternshipPartner> {
    if (!input.name) throw new BadRequestException("name wajib diisi");
    const existing = await this.db.internshipPartner.findFirst({ where: { name: input.name } });
    if (existing) throw new ConflictException("Mitra dengan nama sama sudah ada");
    return this.db.internshipPartner.create({
      data: {
        name: input.name,
        industry_type: input.industryType,
        address: input.address,
        contact_person: input.contactPerson,
        phone: input.phone,
        agreement_year: input.agreementYear
      }
    });
  }

  async update(id: string, input: Partial<CreatePartnerInput>): Promise<InternshipPartner> {
    await this.requirePartner(id);
    return this.db.internshipPartner.update({
      where: { id },
      data: {
        name: input.name,
        industry_type: input.industryType,
        address: input.address,
        contact_person: input.contactPerson,
        phone: input.phone,
        agreement_year: input.agreementYear
      }
    });
  }

  async addMentor(partnerId: string, input: AddMentorInput): Promise<IndustryMentor> {
    await this.requirePartner(partnerId);
    if (!input.fullName) throw new BadRequestException("fullName wajib diisi");
    return this.db.industryMentor.create({
      data: {
        partner_id: partnerId,
        user_id: input.userId,
        full_name: input.fullName,
        position: input.position,
        phone: input.phone
      }
    });
  }

  async listMentors(partnerId: string): Promise<IndustryMentor[]> {
    await this.requirePartner(partnerId);
    return this.db.industryMentor.findMany({
      where: { partner_id: partnerId },
      orderBy: { full_name: "asc" }
    });
  }

  private async requirePartner(id: string): Promise<InternshipPartner> {
    const partner = await this.db.internshipPartner.findUnique({ where: { id } });
    if (!partner) throw new NotFoundException("Mitra DUDI tidak ditemukan");
    return partner;
  }
}
