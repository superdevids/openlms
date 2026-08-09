import { Controller, Get, Header } from "@nestjs/common";
import { Public } from "../../common/public.decorator";
import { PublicContentService } from "./public-content.service";
import type {
  AchievementPageItem,
  ContactPage,
  ExtracurricularPageItem,
  FaqItem,
  GalleryPage,
  FacilityItem,
  PageSection,
  PpdbInfoPage,
  ProgramPageItem,
  SchoolProfileExtraPage,
  SchoolProfilePage,
  StructurePage,
  TestimonialItem
} from "./public-content.service";

/**
 * PublicContentController — endpoint publik per-halaman landing (PAGE MANDIRI).
 * Setiap halaman punya data/endpoint sendiri, bukan potongan section dari
 * GET /public/landing. Semua endpoint @Public() dan cacheable
 * (Cache-Control: public, max-age=300).
 *
 * Sumber:
 * - Tabel domain: Prodi, Extracurricular, Achievement, SchoolProfile.
 * - LandingContent (extra JSON): fasilitas, galeri, testimoni, faq, kontak,
 *   struktur-organisasi, tentang/visi-misi/piagam, ppdb-cta.
 */
@Controller("public")
export class PublicContentController {
  constructor(private readonly publicContentService: PublicContentService) {}

  @Get("programs")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getPrograms(): Promise<ProgramPageItem[]> {
    return this.publicContentService.getPrograms();
  }

  @Get("extracurriculars")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getExtracurriculars(): Promise<ExtracurricularPageItem[]> {
    return this.publicContentService.getExtracurriculars();
  }

  @Get("achievements")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getAchievements(): Promise<AchievementPageItem[]> {
    return this.publicContentService.getAchievements();
  }

  @Get("school-profile")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getSchoolProfile(): Promise<SchoolProfilePage> {
    return this.publicContentService.getSchoolProfile();
  }

  @Get("facilities")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getFacilities(): Promise<PageSection<FacilityItem>> {
    return this.publicContentService.getFacilities();
  }

  @Get("gallery")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getGallery(): Promise<GalleryPage> {
    return this.publicContentService.getGallery();
  }

  @Get("testimonials")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getTestimonials(): Promise<PageSection<TestimonialItem>> {
    return this.publicContentService.getTestimonials();
  }

  @Get("faqs")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getFaqs(): Promise<PageSection<FaqItem>> {
    return this.publicContentService.getFaqs();
  }

  @Get("contact")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getContact(): Promise<ContactPage> {
    return this.publicContentService.getContact();
  }

  @Get("school-structure")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getSchoolStructure(): Promise<StructurePage> {
    return this.publicContentService.getSchoolStructure();
  }

  @Get("school-profile-extra")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getSchoolProfileExtra(): Promise<SchoolProfileExtraPage> {
    return this.publicContentService.getSchoolProfileExtra();
  }

  @Get("ppdb-info")
  @Public()
  @Header("Cache-Control", "public, max-age=300")
  getPpdbInfo(): Promise<PpdbInfoPage> {
    return this.publicContentService.getPpdbInfo();
  }
}
