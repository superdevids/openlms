import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Req
} from "@nestjs/common";
import { contextFromRequest } from "../lms/lms-context";
import { RaporService } from "./rapor.service";
import {
  RecordRaporP5Dto,
  RaporClassQueryDto,
  RaporStudentQueryDto,
  RaporStudentsQueryDto,
  UpdateRaporSettingsDto
} from "./dto/rapor.dto";
import type { AuthenticatedRequest } from "../../common/auth.guard";
import { RequirePermission } from "../../common/require-permission.decorator";

/**
 * Rapor (G-49 e-Rapor v1) — komputasi nilai akhir + track P5 manual.
 * RBAC: baca rapor report:read:self (S/WM, anak sendiri) / report:read:class
 * (G) / report:read:school (OPR/WPS/KPS/BK/SA); tulis P5 rapor:p5:write:class
 * (G) / rapor:p5:write:school; pengaturan rapor:write:school.
 */
@Controller("rapor")
export class RaporController {
  constructor(private readonly raporService: RaporService) {}

  @Post("p5")
  @RequirePermission("rapor:p5:write:class", "rapor:p5:write:school")
  upsertP5(@Body() dto: RecordRaporP5Dto, @Req() req: AuthenticatedRequest) {
    return this.raporService.upsertP5(dto, contextFromRequest(req));
  }

  @Delete("p5/:id")
  @RequirePermission("rapor:p5:write:class", "rapor:p5:write:school")
  deleteP5(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.raporService.deleteP5(id, contextFromRequest(req));
  }

  @Get("class/:classId")
  @RequirePermission("report:read:class", "report:read:school")
  classRapor(
    @Param("classId") classId: string,
    @Query() query: RaporClassQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.raporService.getClassRapor(classId, query, contextFromRequest(req));
  }

  @Get("students")
  @RequirePermission("report:read:class", "report:read:school")
  students(@Query() query: RaporStudentsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.raporService.listStudents(query.classId, contextFromRequest(req));
  }

  @Get("settings")
  @RequirePermission("report:read:school")
  getSettings() {
    return this.raporService.getSettings();
  }

  @Put("settings")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("rapor:write:school")
  updateSettings(@Body() dto: UpdateRaporSettingsDto, @Req() req: AuthenticatedRequest) {
    return this.raporService.updateSettings(dto, contextFromRequest(req));
  }

  // Rute param dideklarasikan TERAKHIR agar literal ("p5"/"class"/"students"/"settings")
  // tidak tertelan oleh :studentId.
  @Post(":studentId/export-pdf")
  @RequirePermission("report:export:self", "report:export:class", "report:export:school")
  async exportPdf(
    @Param("studentId") studentId: string,
    @Query() query: RaporStudentQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.raporService.requestRaporExport(studentId, query, contextFromRequest(req));
  }

  @Get(":studentId")
  @RequirePermission("report:read:self", "report:read:class", "report:read:school")
  studentRapor(
    @Param("studentId") studentId: string,
    @Query() query: RaporStudentQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.raporService.getRapor(studentId, query, contextFromRequest(req));
  }
}
