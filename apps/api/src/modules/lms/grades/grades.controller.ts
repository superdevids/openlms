import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { contextFromRequest } from "../lms-context";
import { GradesService } from "./grades.service";
import { GradeExportService } from "./grade-export.service";
import {
  ExportGradesDto,
  FindGradesQueryDto,
  RecapClassQueryDto,
  RecapClassSubjectQueryDto,
  RecapStudentQueryDto,
  RecordGradeDto
} from "./dto/grades.dto";
import type { AuthenticatedRequest } from "../../../common/auth.guard";
import { RequirePermission } from "../../../common/require-permission.decorator";

/**
 * Penilaian & rekap (docs/04 §2.2, prd04 §5.A.4): Grade, rekap per
 * siswa/kelas/mapel/semester, ekspor CSV/PDF dasar (DataExportLog).
 * RBAC: nilai submission:grade:class (G/SA); rekap report:read:self (S/WM,
 * anak sendiri) / report:read:class (G) / report:read:school (OPR/WPS/KPS/SA);
 * ekspor report:export:class / report:export:school.
 */
@Controller("grades")
export class GradesController {
  constructor(
    private readonly gradesService: GradesService,
    private readonly exportService: GradeExportService
  ) {}

  @Get()
  @RequirePermission("submission:grade:class", "report:read:self", "report:read:class")
  findAll(@Query() query: FindGradesQueryDto, @Req() req: AuthenticatedRequest) {
    return this.gradesService.findAll(query, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("submission:grade:class")
  record(@Body() dto: RecordGradeDto, @Req() req: AuthenticatedRequest) {
    return this.gradesService.record(dto, contextFromRequest(req));
  }

  @Get("recap/student/:studentId")
  @RequirePermission("report:read:self", "report:read:class", "report:read:school")
  recapByStudent(
    @Param("studentId") studentId: string,
    @Query() query: RecapStudentQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.gradesService.recapByStudent(studentId, query, contextFromRequest(req));
  }

  @Get("recap/class/:classId")
  @RequirePermission("report:read:class", "report:read:school")
  recapByClass(
    @Param("classId") classId: string,
    @Query() query: RecapClassQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.gradesService.recapByClass(classId, query, contextFromRequest(req));
  }

  @Get("recap/class-subject/:classSubjectId")
  @RequirePermission("report:read:class", "report:read:school")
  recapByClassSubject(
    @Param("classSubjectId") classSubjectId: string,
    @Query() query: RecapClassSubjectQueryDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.gradesService.recapByClassSubject(classSubjectId, query, contextFromRequest(req));
  }

  @Post("export/csv")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("report:export:class", "report:export:school")
  exportCsv(@Body() dto: ExportGradesDto, @Req() req: AuthenticatedRequest) {
    return this.exportService.exportCsv(dto, contextFromRequest(req));
  }

  @Post("export/pdf")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("report:export:class", "report:export:school")
  exportPdf(@Body() dto: ExportGradesDto, @Req() req: AuthenticatedRequest) {
    return this.exportService.exportPdf(dto, contextFromRequest(req));
  }
}
