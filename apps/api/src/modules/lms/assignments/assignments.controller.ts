import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req
} from "@nestjs/common";
import { contextFromRequest } from "../lms-context";
import { AssignmentsService } from "./assignments.service";
import { SubmissionsService } from "./submissions.service";
import {
  CreateAssignmentDto,
  FindAssignmentsQueryDto,
  UpdateAssignmentDto
} from "./dto/assignments.dto";
import {
  GradeSubmissionDto,
  RequestSubmissionUploadDto,
  SubmitSubmissionDto
} from "./dto/submissions.dto";
import type { AuthenticatedRequest } from "../../../common/auth.guard";
import { RequirePermission } from "../../../common/require-permission.decorator";

/**
 * Tugas & submission (docs/04 §2.2, prd04 §5.A.3): CRUD tugas + publish/close,
 * submit idempotent (Idempotency-Key), deteksi late, batalkan-ganti, penilaian.
 * RBAC: buat/publish tugas assignment:write:class / assignment:publish:class;
 * baca tugas assignment:read:class; submit & batalkan submission:submit:self;
 * lihat submission submission:read:self/class; nilai submission:grade:class.
 */
@Controller("assignments")
export class AssignmentsController {
  constructor(
    private readonly assignmentsService: AssignmentsService,
    private readonly submissionsService: SubmissionsService
  ) {}

  @Get()
  @RequirePermission("assignment:read:class")
  findAll(@Query() query: FindAssignmentsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.findAll(query, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("assignment:write:class")
  create(@Body() dto: CreateAssignmentDto, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("assignment:read:class")
  findOne(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.findOne(id, contextFromRequest(req));
  }

  @Patch(":id")
  @RequirePermission("assignment:write:class")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateAssignmentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.assignmentsService.update(id, dto, contextFromRequest(req));
  }

  @Post(":id/publish")
  @RequirePermission("assignment:publish:class")
  publish(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.publish(id, contextFromRequest(req));
  }

  @Post(":id/close")
  @RequirePermission("assignment:publish:class")
  close(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.close(id, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("assignment:write:class")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.assignmentsService.remove(id, contextFromRequest(req));
  }

  @Post(":id/submissions/upload-url")
  @RequirePermission("submission:submit:self")
  submissionUploadUrl(
    @Param("id") id: string,
    @Body() dto: Omit<RequestSubmissionUploadDto, "assignmentId">,
    @Req() req: AuthenticatedRequest
  ) {
    return this.submissionsService.requestSignedUpload(
      { ...dto, assignmentId: id },
      contextFromRequest(req)
    );
  }

  @Post(":id/submissions")
  @RequirePermission("submission:submit:self")
  submit(
    @Param("id") id: string,
    @Body() dto: SubmitSubmissionDto,
    @Headers("idempotency-key") idempotencyKey: string | undefined,
    @Req() req: AuthenticatedRequest
  ) {
    return this.submissionsService.submit(id, dto, contextFromRequest(req), idempotencyKey);
  }

  @Get(":id/submissions")
  @RequirePermission("submission:read:self", "submission:read:class")
  findAllSubmissions(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.submissionsService.findAllByAssignment(id, contextFromRequest(req));
  }
}

@Controller("submissions")
export class SubmissionsController {
  constructor(private readonly submissionsService: SubmissionsService) {}

  @Patch(":id/grade")
  @RequirePermission("submission:grade:class")
  grade(
    @Param("id") id: string,
    @Body() dto: GradeSubmissionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.submissionsService.grade(id, dto, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("submission:submit:self", "submission:grade:class")
  cancel(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.submissionsService.cancel(id, contextFromRequest(req));
  }
}
