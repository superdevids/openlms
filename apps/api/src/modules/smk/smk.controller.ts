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
  createInternship(@Body() dto: CreateInternshipDto) {
    return this.internshipService.create(dto);
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
  addJournal(@Param("internshipId") internshipId: string, @Body() dto: AddJournalDto) {
    return this.internshipService.addJournal(internshipId, dto);
  }

  @Get("internships/:internshipId/journals")
  @RequirePermission("internship:journal:self", "internship:write:school", "internship:grade:self")
  listJournals(@Param("internshipId") internshipId: string) {
    return this.internshipService.listJournals(internshipId);
  }

  @Patch("journals/:journalId/verify")
  @RequirePermission("internship:journal:self", "internship:write:school")
  verifyJournal(@Param("journalId") journalId: string, @Req() req: AuthenticatedRequest) {
    return this.internshipService.verifyJournal(journalId, this.actorId(req));
  }

  @Patch("internships/:internshipId/complete")
  @RequirePermission("internship:write:school")
  completeInternship(
    @Param("internshipId") internshipId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.internshipService.complete(internshipId, this.actorId(req));
  }

  // ---- UKK ----
  @Post("competency-tests")
  @RequirePermission("competency:grade:school")
  createCompetencyTest(@Body() dto: CreateCompetencyTestDto) {
    return this.competencyTestService.create(dto);
  }

  @Post("competency-tests/:testId/rubric")
  @RequirePermission("competency:grade:school")
  addRubric(@Param("testId") testId: string, @Body() dto: { criterion: string; maxScore: number }) {
    return this.competencyTestService.addRubricItem(testId, dto.criterion, dto.maxScore);
  }

  @Post("competency-tests/:testId/grade")
  @RequirePermission("competency:grade:self", "competency:grade:school")
  gradeCompetencyTest(
    @Param("testId") testId: string,
    @Req() req: AuthenticatedRequest,
    @Body() dto: GradeCompetencyTestDto
  ) {
    return this.competencyTestService.grade(testId, this.actorId(req), dto.items);
  }

  // ---- DUDI ----
  @Get("partners")
  @RequirePermission("partner:write:school", "internship:write:school")
  listPartners(@Query("search") search?: string, @Query("agreementYear") agreementYear?: string) {
    return this.partnerService.list({ search, agreementYear });
  }

  @Post("partners")
  @RequirePermission("partner:write:school")
  createPartner(@Body() dto: CreatePartnerDto) {
    return this.partnerService.create(dto);
  }

  @Patch("partners/:id")
  @RequirePermission("partner:write:school")
  updatePartner(@Param("id") id: string, @Body() dto: CreatePartnerDto) {
    return this.partnerService.update(id, dto);
  }

  @Post("partners/:partnerId/mentors")
  @RequirePermission("partner:write:school")
  addMentor(@Param("partnerId") partnerId: string, @Body() dto: AddMentorDto) {
    return this.partnerService.addMentor(partnerId, dto);
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
}
