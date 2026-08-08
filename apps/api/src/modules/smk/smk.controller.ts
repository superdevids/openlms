/**
 * SmkController — PKL, UKK, direktori DUDI.
 * RBAC: PKL (internship:write:school = GURU/KEPSEK/WAKEPSEK; jurnal = SISWA
 * & PEMBIMBING_INDUSTRI internship:journal:self), UKK (competency:grade:school =
 * GURU; competency:grade:self = PENGUJI_EKSTERNAL), DUDI (partner:write:school).
 * Identitas user dari request.requestContext (AuthGuard), bukan header.
 */
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException
} from "@nestjs/common";
import { InternshipService } from "./internship.service";
import { CompetencyTestService } from "./competency-test.service";
import { PartnerService } from "./partner.service";
import {
  AddJournalDto,
  AddMentorDto,
  CreateCompetencyTestDto,
  CreateInternshipDto,
  CreatePartnerDto,
  GradeCompetencyTestDto
} from "./dto/smk.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import type { AuditActorContext } from "../lms/lms-audit";
import { RequirePermission } from "../../common/require-permission.decorator";

@Controller("smk")
export class SmkController {
  constructor(
    private readonly internshipService: InternshipService,
    private readonly competencyTestService: CompetencyTestService,
    private readonly partnerService: PartnerService
  ) {}

  // ---- PKL ----
  @Post("internships")
  @RequirePermission("internship:write:school")
  createInternship(@Req() req: AuthenticatedRequest, @Body() dto: CreateInternshipDto) {
    return this.internshipService.create(
      {
        studentId: dto.studentId,
        partnerId: dto.partnerId,
        academicYearId: dto.academicYearId,
        startDate: dto.startDate,
        endDate: dto.endDate,
        schoolMentorId: dto.schoolMentorId,
        industryMentorId: dto.industryMentorId
      },
      this.actorContext(req)
    );
  }

  @Get("internships/by-mentor")
  @RequirePermission("internship:write:school", "internship:journal:self", "internship:grade:self")
  internshipsByMentor(@Req() req: AuthenticatedRequest) {
    return this.internshipService.listByMentor(this.actorId(req));
  }

  @Get("internships/by-student")
  @RequirePermission("internship:write:school", "internship:journal:self")
  internshipsByStudent(@Query("studentId") studentId: string) {
    return this.internshipService.listByStudent(studentId);
  }

  @Post("internships/:internshipId/journals")
  @RequirePermission("internship:journal:self", "internship:write:school")
  addJournal(
    @Param("internshipId") internshipId: string,
    @Body() dto: AddJournalDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.internshipService.addJournal(
      internshipId,
      { entryDate: dto.entryDate, activity: dto.activity, note: dto.note },
      this.actorContext(req)
    );
  }

  @Get("internships/:internshipId/journals")
  @RequirePermission("internship:journal:self", "internship:write:school", "internship:grade:self")
  listJournals(@Param("internshipId") internshipId: string) {
    return this.internshipService.listJournals(internshipId);
  }

  @Patch("journals/:journalId/verify")
  @RequirePermission("internship:journal:self", "internship:write:school")
  verifyJournal(@Param("journalId") journalId: string, @Req() req: AuthenticatedRequest) {
    return this.internshipService.verifyJournal(
      journalId,
      this.actorId(req),
      this.actorContext(req)
    );
  }

  @Patch("internships/:internshipId/complete")
  @RequirePermission("internship:write:school")
  completeInternship(
    @Param("internshipId") internshipId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.internshipService.complete(internshipId, this.actorId(req), this.actorContext(req));
  }

  // ---- UKK ----
  @Post("competency-tests")
  @RequirePermission("competency:grade:school")
  createCompetencyTest(@Req() req: AuthenticatedRequest, @Body() dto: CreateCompetencyTestDto) {
    return this.competencyTestService.create(
      {
        title: dto.title,
        competencyStandard: dto.competencyStandard,
        studentId: dto.studentId,
        examinerId: dto.examinerId,
        scheduledAt: dto.scheduledAt,
        rubricItems: dto.rubricItems
      },
      this.actorContext(req)
    );
  }

  @Post("competency-tests/:testId/rubric")
  @RequirePermission("competency:grade:school")
  addRubric(
    @Param("testId") testId: string,
    @Body() dto: { criterion: string; maxScore: number },
    @Req() req: AuthenticatedRequest
  ) {
    return this.competencyTestService.addRubricItem(
      testId,
      dto.criterion,
      dto.maxScore,
      this.actorContext(req)
    );
  }

  /** Jadwal UKK untuk penguji yang sedang login (PENGUJI_EKSTERNAL / GURU). */
  @Get("competency-tests/by-examiner")
  @RequirePermission("competency:grade:self", "competency:grade:school")
  competencyTestsByExaminer(@Req() req: AuthenticatedRequest) {
    return this.competencyTestService.listByExaminer(this.actorId(req));
  }

  @Post("competency-tests/:testId/grade")
  @RequirePermission("competency:grade:self", "competency:grade:school")
  gradeCompetencyTest(
    @Param("testId") testId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: GradeCompetencyTestDto
  ) {
    return this.competencyTestService.grade(
      testId,
      this.actorId(req),
      dto.items,
      this.actorContext(req)
    );
  }

  // ---- DUDI ----
  @Get("partners")
  @RequirePermission("partner:write:school", "internship:write:school")
  listPartners(@Query("search") search?: string, @Query("agreementYear") agreementYear?: string) {
    return this.partnerService.list({ search, agreementYear });
  }

  @Post("partners")
  @RequirePermission("partner:write:school")
  createPartner(@Req() req: AuthenticatedRequest, @Body() dto: CreatePartnerDto) {
    return this.partnerService.create(
      {
        name: dto.name,
        industryType: dto.industryType,
        address: dto.address,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        agreementYear: dto.agreementYear
      },
      this.actorContext(req)
    );
  }

  @Patch("partners/:id")
  @RequirePermission("partner:write:school")
  updatePartner(
    @Param("id") id: string,
    @Body() dto: CreatePartnerDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.partnerService.update(
      id,
      {
        name: dto.name,
        industryType: dto.industryType,
        address: dto.address,
        contactPerson: dto.contactPerson,
        phone: dto.phone,
        agreementYear: dto.agreementYear
      },
      this.actorContext(req)
    );
  }

  @Post("partners/:partnerId/mentors")
  @RequirePermission("partner:write:school")
  addMentor(
    @Param("partnerId") partnerId: string,
    @Body() dto: AddMentorDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.partnerService.addMentor(
      partnerId,
      { fullName: dto.fullName, position: dto.position, phone: dto.phone, userId: dto.userId },
      this.actorContext(req)
    );
  }

  @Get("partners/:partnerId/mentors")
  @RequirePermission("partner:write:school")
  listMentors(@Param("partnerId") partnerId: string) {
    return this.partnerService.listMentors(partnerId);
  }

  private actorId(req: AuthenticatedRequest): string {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return ctx.userId;
  }

  /** Konteks aktor untuk AuditLog (lms-audit). */
  private actorContext(req: AuthenticatedRequest): AuditActorContext {
    const ctx = req.requestContext;
    if (!ctx) {
      throw new UnauthorizedException("Konteks autentikasi tidak ditemukan.");
    }
    return { userId: ctx.userId, roles: ctx.roles };
  }
}
