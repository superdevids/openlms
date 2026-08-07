import { Module, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { ClassesModule } from "./classes/classes.module";
import { MaterialsModule } from "./materials/materials.module";
import { AssignmentsModule } from "./assignments/assignments.module";
import { GradesModule } from "./grades/grades.module";

/**
 * LmsModule — agregator LMS inti (F2-T1..T12).
 *
 * REGISTRASI (oleh integration): tambahkan `LmsModule` ke `imports` di
 * apps/api/src/app.module.ts. APP_PIPE global (whitelist + transform) ikut
 * terpasang sehingga DTO class-validator modul ini berfungsi tanpa menyentuh
 * main.ts. Detail: baca README.registration.md.
 */
@Module({
  imports: [ClassesModule, MaterialsModule, AssignmentsModule, GradesModule],
  providers: [
    {
      provide: APP_PIPE,
      useFactory: () => new ValidationPipe({ whitelist: true, transform: true })
    }
  ]
})
export class LmsModule {}
