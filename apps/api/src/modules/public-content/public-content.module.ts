import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../common/database/database.module";
import { PublicContentController } from "./public-content.controller";
import { PublicContentService } from "./public-content.service";

/**
 * PublicContentModule — endpoint publik per-halaman landing (PAGE MANDIRI).
 * Tiap halaman punya data/endpoint sendiri (GET /public/*): tabel domain
 * (Prodi, Extracurricular, Achievement, SchoolProfile) + LandingContent
 * (fasilitas, galeri, testimoni, faq, kontak, struktur, tentang, ppdb).
 * Semua endpoint @Public(), cacheable (Cache-Control: public, max-age=300).
 */
@Module({
  imports: [DatabaseModule],
  controllers: [PublicContentController],
  providers: [PublicContentService],
  exports: [PublicContentService]
})
export class PublicContentModule {}
