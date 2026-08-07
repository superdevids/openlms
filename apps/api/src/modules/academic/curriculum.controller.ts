/**
 * CurriculumController — referensi kurikulum CP/ATP.
 * RBAC: tulis hanya OPERATOR/WAKEPSEK (subject:write:school / academic:prodi:write);
 * baca untuk semua terautentikasi (subject:read:school).
 */
import { Body, Controller, Delete, Get, Param, Post, Query } from "@nestjs/common";
import { CurriculumService } from "./curriculum.service";
import { UpsertCurriculumDto } from "./dto/curriculum.dto";
import { RequirePermission } from "../../common/require-permission.decorator";

@Controller("academic/curriculum")
export class CurriculumController {
  constructor(private readonly curriculumService: CurriculumService) {}

  @Get()
  @RequirePermission("subject:read:school")
  list(@Query("phase") phase?: string, @Query("subjectCode") subjectCode?: string) {
    return this.curriculumService.list({ phase, subjectCode });
  }

  @Get(":id")
  @RequirePermission("subject:read:school")
  getById(@Param("id") id: string) {
    return this.curriculumService.getById(id);
  }

  @Post()
  @RequirePermission("subject:write:school")
  upsert(@Body() dto: UpsertCurriculumDto) {
    return this.curriculumService.upsert(dto);
  }

  @Delete(":id")
  @RequirePermission("subject:write:school")
  remove(@Param("id") id: string) {
    return this.curriculumService.remove(id);
  }
}
