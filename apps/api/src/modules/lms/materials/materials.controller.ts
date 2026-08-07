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
import { MaterialsService } from "./materials.service";
import {
  CreateMaterialDto,
  FindMaterialsQueryDto,
  RequestSignedUploadDto,
  UpdateMaterialDto
} from "./dto/materials.dto";
import type { AuthenticatedRequest } from "../../../common/auth.guard";
import { RequirePermission } from "../../../common/require-permission.decorator";

/**
 * Materi (docs/04 §2.2, prd04 §5.A.2): CRUD + publish/unpublish + signed URL.
 * RBAC: upload/publish material:write:class (GURU/OPERATOR/WAKEPSEK); baca
 * material:read:class (S/G/OPR/WPS/KPS/SA). Scope dasar (guru pengampu /
 * siswa kelas sendiri) sudah ditegakkan di service.
 */
@Controller("materials")
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Get()
  @RequirePermission("material:read:class")
  findAll(@Query() query: FindMaterialsQueryDto, @Req() req: AuthenticatedRequest) {
    return this.materialsService.findAll(query, contextFromRequest(req));
  }

  @Post("signed-url")
  @RequirePermission("material:write:class")
  signedUrl(@Body() dto: RequestSignedUploadDto, @Req() req: AuthenticatedRequest) {
    return this.materialsService.requestSignedUpload(dto, contextFromRequest(req));
  }

  @Post()
  @RequirePermission("material:write:class")
  create(@Body() dto: CreateMaterialDto, @Req() req: AuthenticatedRequest) {
    return this.materialsService.create(dto, contextFromRequest(req));
  }

  @Get(":id")
  @RequirePermission("material:read:class")
  findOne(@Param("id") id: string) {
    return this.materialsService.findOne(id);
  }

  @Patch(":id")
  @RequirePermission("material:write:class")
  update(
    @Param("id") id: string,
    @Body() dto: UpdateMaterialDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.materialsService.update(id, dto, contextFromRequest(req));
  }

  @Patch(":id/publish")
  @RequirePermission("material:write:class")
  publish(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.materialsService.publish(id, contextFromRequest(req));
  }

  @Patch(":id/unpublish")
  @RequirePermission("material:write:class")
  unpublish(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.materialsService.unpublish(id, contextFromRequest(req));
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  @RequirePermission("material:write:class")
  remove(@Param("id") id: string, @Req() req: AuthenticatedRequest) {
    return this.materialsService.remove(id, contextFromRequest(req));
  }
}
