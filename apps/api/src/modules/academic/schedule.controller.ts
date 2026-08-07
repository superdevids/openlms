/**
 * ScheduleController — jadwal pelajaran.
 * RBAC: tulis (POST/PATCH/DELETE) schedule:write:school (OPERATOR/WAKEPSEK);
 * baca (GET) schedule:read:school (GURU/SISWA/role lain).
 */
import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ScheduleService } from "./schedule.service";
import { CreateScheduleDto, UpdateScheduleDto } from "./dto/schedule.dto";
import { RequirePermission } from "../../common/require-permission.decorator";

@Controller("academic/schedules")
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Post()
  @RequirePermission("schedule:write:school")
  create(@Body() dto: CreateScheduleDto) {
    return this.scheduleService.create(dto);
  }

  @Get()
  @RequirePermission("schedule:read:school")
  list(
    @Query("classId") classId?: string,
    @Query("teacherId") teacherId?: string,
    @Query("academicYear") academicYear?: string
  ) {
    return this.scheduleService.list({ classId, teacherId, academicYear });
  }

  @Patch(":id")
  @RequirePermission("schedule:write:school")
  update(@Param("id") id: string, @Body() dto: UpdateScheduleDto) {
    return this.scheduleService.update(id, dto);
  }

  @Delete(":id")
  @RequirePermission("schedule:write:school")
  remove(@Param("id") id: string) {
    return this.scheduleService.remove(id);
  }
}
