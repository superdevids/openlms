import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { contextFromRequest } from "../lms-context";
import { ClassesService } from "./classes.service";
import { SubjectsService } from "./subjects.service";
import { ClassSubjectsService } from "./class-subjects.service";
import { EnrollmentsService } from "./enrollments.service";
import { SchedulesService } from "./schedules.service";
import { CreateClassDto, FindClassesQueryDto, UpdateClassDto } from "./dto/classes.dto";
import { BulkEnrollDto, BulkUnenrollDto, UpdateEnrollmentStatusDto } from "./dto/enrollments.dto";
import { CreateSubjectDto, FindSubjectsQueryDto, UpdateSubjectDto } from "./dto/subjects.dto";
import {
  CreateClassSubjectDto,
  FindClassSubjectsQueryDto,
  UpdateClassSubjectDto
} from "./dto/class-subjects.dto";
import { CreateScheduleDto, FindSchedulesQueryDto, UpdateScheduleDto } from "./dto/schedules.dto";
import type { AuthenticatedRequest } from "../../../common/auth.guard";
import { RequirePermission } from "../../../common/require-permission.decorator";

/**
 * Kelas & mapel (docs/04 §2.2, prd04 §5.A.1):
 * CRUD Class, Subject, ClassSubject, Enrollment (bulk), ScheduleEntry.
 * RBAC: baca kelas class:read:class/class:read:school; tulis
 * class:write:school; enrollment enrollment:manage:school; mapel
 * subject:*; class-subject classsubject:write:school; jadwal schedule:*.
 * Service tetap menegakkan scope dasar (guru pengampu / kelas siswa).
 */
@Controller("classes")
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly enrollmentsService: EnrollmentsService
  ) {}

  @Get()
  @RequirePermission("class:read:class", "class:read:school")
  findAll(@Query() query: FindClassesQueryDto, @Req() req: AuthenticatedRequest) {
    return this.classesService.findAll(query, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("class:write:school")
  create(@Body() dto: CreateClassDto, @Req() req: AuthenticatedRequest) {
    return this.classesService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("class:read:class", "class:read:school")
  findOne(@Param("id") id: string) {
    return this.classesService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("class:write:school")
  update(@Param("id") id: string, @Body() dto: UpdateClassDto, @Req() req: AuthenticatedRequest) {
    return this.classesService.update(id, dto, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("class:write:school")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.classesService.remove(id, contextFromRequest(req));
  }

  @Post(":id/enroll")
  @RequirePermission("enrollment:manage:school")
  enroll(@Param("id") id: string, @Body() dto: BulkEnrollDto, @Req() req: AuthenticatedRequest) {
    return this.enrollmentsService.enroll(id, dto, contextFromRequest(req));
  }

  @Post(":id/unenroll")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("enrollment:manage:school")
  unenroll(
    @Param("id") id: string,
    @Body() dto: BulkUnenrollDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.enrollmentsService.unenroll(id, dto, contextFromRequest(req));
  }

  @Get(":id/students")
  @RequirePermission("class:read:class", "class:read:school")
  students(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.enrollmentsService.students(id, contextFromRequest(req));
  }
}

@Controller("subjects")
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Get()
  @RequirePermission("subject:read:school")
  findAll(@Query() query: FindSubjectsQueryDto) {
    return this.subjectsService.findAll(query);
  }

  @Post()
  @RequirePermission("subject:write:school")
  create(@Body() dto: CreateSubjectDto, @Req() req: AuthenticatedRequest) {
    return this.subjectsService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("subject:read:school")
  findOne(@Param("id") id: string) {
    return this.subjectsService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("subject:write:school")
  update(@Param("id") id: string, @Body() dto: UpdateSubjectDto, @Req() req: AuthenticatedRequest) {
    return this.subjectsService.update(id, dto, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("subject:write:school")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.subjectsService.remove(id, contextFromRequest(req));
  }
}

@Controller("class-subjects")
export class ClassSubjectsController {
  constructor(private readonly classSubjectsService: ClassSubjectsService) {}

  @Get()
  @RequirePermission("class:read:class", "class:read:school")
  findAll(@Query() query: FindClassSubjectsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.classSubjectsService.findAll(query, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("classsubject:write:school")
  create(@Body() dto: CreateClassSubjectDto, @Req() req: AuthenticatedRequest) {
    return this.classSubjectsService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("class:read:class", "class:read:school")
  findOne(@Param("id") id: string) {
    return this.classSubjectsService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("classsubject:write:school")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateClassSubjectDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.classSubjectsService.update(id, dto, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("classsubject:write:school")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.classSubjectsService.remove(id, contextFromRequest(req));
  }
}

@Controller("schedules")
export class SchedulesController {
  constructor(private readonly schedulesService: SchedulesService) {}

  @Get()
  @RequirePermission("schedule:read:school")
  findAll(@Query() query: FindSchedulesQueryDto, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.findAll(query, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("schedule:write:school")
  create(@Body() dto: CreateScheduleDto, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("schedule:read:school")
  findOne(@Param("id") id: string) {
    return this.schedulesService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("schedule:write:school")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateScheduleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.schedulesService.update(id, dto, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("schedule:write:school")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.schedulesService.remove(id, contextFromRequest(req));
  }
}

@Controller("enrollments")
export class EnrollmentsController {
  constructor(private readonly enrollmentsService: EnrollmentsService) {}

  @Patch("status")
  @RequirePermission("enrollment:manage:school")
  updateStatus(
    @Body() dto: UpdateEnrollmentStatusDto,
    @Query("classId") classId: string,
    @Req() req: AuthenticatedRequest
  ) {
    return this.enrollmentsService.updateStatus(classId, dto, contextFromRequest(req));
  }
}
