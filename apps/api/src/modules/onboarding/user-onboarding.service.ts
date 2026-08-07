import { Injectable, Logger } from "@nestjs/common";
import type { Role } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { PrismaClient } from "@openlms/database";
import { UpdateOnboardingProgressDto } from "./dto/onboarding-progress.dto";

export interface OnboardingStep {
  key: string;
  title: string;
  description: string;
  targetSelector?: string;
}

export interface UserOnboardingView {
  isCompleted: boolean;
  dismissedAt: string | null;
  completedAt: string | null;
  completedSteps: string[];
  steps: OnboardingStep[];
}

interface OnboardingRow {
  role: string;
  steps_completed: Prisma.JsonValue | null;
  is_completed: boolean;
  completed_at: Date | null;
  dismissed_at: Date | null;
}

/**
 * Tur onboarding fitur per user (semua role kecuali guest).
 * Langkah role-specific (Bahasa Indonesia formal, branding openlms).
 * Progres per user disimpan di tabel user_onboarding (bukan settings sekolah).
 */

const s = (
  key: string,
  title: string,
  description: string,
  targetSelector?: string
): OnboardingStep => ({ key, title, description, targetSelector });

const STEPS_SUPERADMIN: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms adalah sistem informasi sekolah (SIS) dan learning management system (LMS) terpadu. Tur singkat ini akan memandu Anda memahami fitur utama sebagai Superadmin."
  ),
  s(
    "dashboard",
    "Beranda Superadmin",
    "Beranda menampilkan ringkasan aktivitas sekolah: jumlah pengguna, kelas, dan notifikasi penting. Mulailah dari sini untuk memantau kesehatan sistem secara menyeluruh.",
    "header"
  ),
  s(
    "navigasi",
    "Navigasi Sistem",
    "Menu di sisi kiri berisi seluruh modul yang dapat Anda kelola: Admin Sistem, Branding, Landing Page, RBAC, Onboarding, Rollover, dan Maintenance.",
    'nav[aria-label="Navigasi utama"]'
  ),
  s(
    "pengaturan",
    "Pengaturan & Identitas",
    "Atur identitas visual aplikasi di menu Branding, dan konten halaman depan sekolah di menu Landing Page. Perubahan langsung tampil untuk seluruh pengguna.",
    "#main"
  ),
  s(
    "rbac",
    "Manajemen Hak Akses",
    "Menu RBAC memungkinkan Anda mengelola permission tiap role dan override per pengguna. Pastikan perubahan hak akses selalu dicatat dan diuji.",
    "#main"
  ),
  s(
    "maintenance",
    "Mode Maintenance",
    "Gunakan menu Maintenance untuk mengaktifkan mode pemeliharaan global. Saat aktif, seluruh pengguna melihat halaman pemeliharaan kecuali endpoint publik terpilih.",
    "#main"
  )
];

const STEPS_KEPSEK: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms membantu Anda memantau seluruh kegiatan sekolah dalam satu platform: akademik, keuangan, kesiswaan, dan pelaporan."
  ),
  s(
    "dashboard",
    "Beranda Kepala Sekolah",
    "Beranda menampilkan ringkasan kondisi sekolah, termasuk kehadiran, pembayaran, dan pengumuman yang memerlukan perhatian Anda.",
    "header"
  ),
  s(
    "laporan",
    "Laporan & Rapor",
    "Akses laporan nilai, rapor per kelas dan seluruh sekolah, serta ekspor rapor untuk kebutuhan administrasi dan akreditasi.",
    "#main"
  ),
  s(
    "keuangan",
    "Keuangan Sekolah",
    "Pantau tagihan, pembayaran, dan arus kas sekolah. Anda dapat melihat ringkasan keuangan tanpa perlu mengubah data transaksi.",
    "#main"
  ),
  s(
    "kesiswaan",
    "Kesiswaan & BK",
    "Pantau data kedisiplinan dan catatan bimbingan konseling. Data BK bersifat rahasia dan hanya dapat diakses oleh pihak yang berwenang.",
    "#main"
  ),
  s(
    "pengumuman",
    "Pengumuman & Surat",
    "Terbitkan pengumuman untuk role tertentu dan kelola persetujuan surat resmi sekolah langsung dari aplikasi.",
    "#main"
  )
];

const STEPS_WAKEPSEK: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "Sebagai Wakil Kepala Sekolah, Anda mengelola operasional akademik dan pembelajaran: kelas, jadwal, materi, tugas, dan penilaian."
  ),
  s(
    "dashboard",
    "Beranda Wakil Kepala Sekolah",
    "Beranda menampilkan ringkasan akademik: kelas aktif, jadwal mengajar, dan aktivitas pembelajaran terbaru.",
    "header"
  ),
  s(
    "akademik",
    "Kelola Akademik",
    "Atur kelas, mata pelajaran, guru pengampu, jadwal pelajaran, dan jurusan (prodi untuk SMK) melalui menu Akademik.",
    "#main"
  ),
  s(
    "lms",
    "Pembelajaran Digital",
    "Kelola materi, tugas, kuis, dan ujian untuk seluruh kelas. Fitur LMS memastikan pembelajaran berjalan terstruktur dan terdokumentasi.",
    "#main"
  ),
  s(
    "penilaian",
    "Penilaian & Rapor",
    "Pantau penilaian guru, nilai akhir, dan rapor. Pastikan seluruh penilaian selesai tepat waktu sebelum rapor diterbitkan.",
    "#main"
  ),
  s(
    "data-user",
    "Data Pengguna",
    "Kelola data induk guru dan staf, termasuk reset kata sandi dan penonaktifan akun bila diperlukan.",
    "#main"
  )
];

const STEPS_OPERATOR: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms membantu Anda mengelola administrasi sekolah sehari-hari: data pengguna, akademik, keuangan, dan pengaturan aplikasi."
  ),
  s(
    "dashboard",
    "Beranda Operator",
    "Beranda menampilkan ringkasan tugas administrasi dan notifikasi yang memerlukan tindakan Anda.",
    "header"
  ),
  s(
    "data-induk",
    "Data Induk Pengguna",
    "Kelola data siswa, guru, dan staf: buat akun, ubah data, reset kata sandi, dan atur status keanggotaan.",
    "#main"
  ),
  s(
    "akademik",
    "Akademik & Jadwal",
    "Atur kelas, mata pelajaran, guru pengampu, jadwal pelajaran, dan enrollment siswa pada menu Akademik.",
    "#main"
  ),
  s(
    "impor",
    "Impor Data & Undangan",
    "Gunakan fitur Impor untuk memasukkan data dalam jumlah besar dari Excel, lalu kirim undangan akun kepada pengguna baru.",
    "#main"
  ),
  s(
    "pengaturan",
    "Pengaturan Aplikasi",
    "Konfigurasi profil sekolah, semester berjalan, dan pengaturan aplikasi lainnya di menu Pengaturan.",
    "#main"
  )
];

const STEPS_KEUANGAN: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "Modul keuangan openlms mengelola tagihan, pembayaran, dan laporan keuangan sekolah secara transparan dan akuntabel."
  ),
  s(
    "dashboard",
    "Beranda Keuangan",
    "Beranda menampilkan ringkasan tagihan, pembayaran terbaru, dan status keuangan yang perlu ditindaklanjuti.",
    "header"
  ),
  s(
    "tagihan",
    "Kelola Tagihan",
    "Buat dan kelola tagihan SPP dan biaya lainnya per siswa, lengkap dengan jatuh tempo dan riwayat carry-over antar tahun ajaran.",
    "#main"
  ),
  s(
    "pembayaran",
    "Catat & Verifikasi Pembayaran",
    "Catat pembayaran, verifikasi bukti transfer, dan kelola refund bila diperlukan. Setiap transaksi tercatat untuk rekonsiliasi.",
    "#main"
  ),
  s(
    "laporan",
    "Laporan & Payroll",
    "Akses laporan arus kas dan kelola penggajian staf: komponen gaji, proses payroll, dan persetujuan pembayaran.",
    "#main"
  )
];

const STEPS_GURU: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms membantu Anda mengelola pembelajaran: materi, tugas, kuis, ujian, penilaian, dan absensi kelas."
  ),
  s(
    "dashboard",
    "Beranda Guru",
    "Beranda menampilkan kelas yang Anda ampu, jadwal mengajar, dan aktivitas pembelajaran terbaru.",
    "header"
  ),
  s(
    "kelas",
    "Kelas & Jadwal",
    "Lihat daftar kelas dan jadwal pelajaran Anda. Klik kelas untuk membuka materi, tugas, dan daftar siswa.",
    "#main"
  ),
  s(
    "materi",
    "Materi Pembelajaran",
    "Unggah dan publikasikan materi pembelajaran per kelas: dokumen, video, atau tautan untuk mendukung kegiatan belajar.",
    "#main"
  ),
  s(
    "tugas",
    "Tugas & Kuis",
    "Buat tugas, kuis, dan bank soal. Pantau pengumpulan tugas dan nilai jawaban siswa langsung dari aplikasi.",
    "#main"
  ),
  s(
    "penilaian",
    "Penilaian & Absensi",
    "Catat nilai, kelola sesi absensi (manual atau QR), dan tinjau rekap kehadiran siswa Anda.",
    "#main"
  )
];

const STEPS_SISWA: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms adalah platform belajarmu: akses materi, tugas, kuis, ujian, nilai, dan absensi dalam satu tempat."
  ),
  s(
    "dashboard",
    "Beranda Siswa",
    "Beranda menampilkan ringkasan kelas, tugas terbaru, dan pengumuman dari sekolah.",
    "header"
  ),
  s(
    "kelas",
    "Kelas & Materi",
    "Buka kelas untuk mengakses materi pembelajaran yang dibagikan gurumu. Pelajari materi sebelum mengerjakan tugas.",
    "#main"
  ),
  s(
    "tugas",
    "Tugas & Kuis",
    "Kerjakan tugas dan kuis tepat waktu. Pastikan kamu mengunggah jawaban sebelum batas waktu yang ditentukan.",
    "#main"
  ),
  s(
    "ujian",
    "Ujian Online",
    "Ikuti ujian online sesuai jadwal. Perhatikan batas waktu dan token sesi yang diberikan gurumu.",
    "#main"
  ),
  s(
    "nilai",
    "Nilai & Absensi",
    "Pantau nilai, rekap kehadiran, dan tagihan melalui menu yang tersedia di beranda.",
    "#main"
  )
];

const STEPS_WALI_MURID: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms membantu Anda memantau perkembangan belajar anak: nilai, kehadiran, dan tagihan sekolah."
  ),
  s(
    "dashboard",
    "Beranda Orang Tua",
    "Beranda menampilkan ringkasan perkembangan anak Anda beserta pengumuman dari sekolah.",
    "header"
  ),
  s(
    "nilai",
    "Nilai Anak",
    "Pantau nilai dan rapor anak Anda secara berkala melalui menu Nilai Anak.",
    "#main"
  ),
  s(
    "absensi",
    "Absensi Anak",
    "Lihat rekap kehadiran anak Anda dan ajukan izin/sakit bila diperlukan melalui menu Absensi Anak.",
    "#main"
  ),
  s(
    "tagihan",
    "Tagihan Anak",
    "Pantau tagihan sekolah anak Anda dan status pembayarannya melalui menu Tagihan Anak.",
    "#main"
  )
];

const STEPS_DEFAULT: OnboardingStep[] = [
  s(
    "welcome",
    "Selamat Datang di openlms",
    "openlms adalah sistem informasi sekolah dan LMS terpadu. Tur singkat ini akan memperkenalkan fitur utama yang tersedia untuk akun Anda."
  ),
  s(
    "dashboard",
    "Beranda Anda",
    "Beranda menampilkan ringkasan aktivitas yang relevan dengan peran Anda di sekolah.",
    "header"
  ),
  s(
    "navigasi",
    "Navigasi Aplikasi",
    "Gunakan menu navigasi untuk berpindah antar modul yang tersedia sesuai hak akses Anda.",
    'nav[aria-label="Navigasi utama"]'
  ),
  s(
    "notifikasi",
    "Notifikasi",
    "Ikon lonceng di pojok kanan atas menampilkan notifikasi tugas, pembayaran, dan pengumuman terbaru.",
    'a[aria-label*="Notifikasi"]'
  ),
  s(
    "bantuan",
    "Bantuan & FAQ",
    "Temukan panduan penggunaan lebih lanjut di menu Bantuan & FAQ. Tur ini dapat dibuka kembali kapan saja melalui tombol Panduan.",
    "#main"
  )
];

const TEMPLATES: Record<string, OnboardingStep[]> = {
  SUPERADMIN: STEPS_SUPERADMIN,
  KEPSEK: STEPS_KEPSEK,
  WAKEPSEK: STEPS_WAKEPSEK,
  OPERATOR: STEPS_OPERATOR,
  KEUANGAN: STEPS_KEUANGAN,
  GURU: STEPS_GURU,
  GURU_BK: STEPS_GURU,
  SISWA: STEPS_SISWA,
  WALI_MURID: STEPS_WALI_MURID
};

/** Prioritas role — role lebih "tinggi" dipakai untuk langkah tour bila multi-role. */
const ROLE_PRIORITY: Record<string, number> = {
  SUPERADMIN: 0,
  KEPSEK: 1,
  WAKEPSEK: 2,
  OPERATOR: 3,
  KEUANGAN: 4,
  GURU_BK: 5,
  GURU: 6,
  SISWA: 7,
  WALI_MURID: 8,
  CALON_SISWA: 9,
  PEMBIMBING_INDUSTRI: 10,
  PENGUJI_EKSTERNAL: 11
};

export function resolvePrimaryRole(roles: readonly Role[]): string {
  if (!roles || roles.length === 0) {
    return "SISWA";
  }
  const sorted = [...roles].sort((a, b) => (ROLE_PRIORITY[a] ?? 99) - (ROLE_PRIORITY[b] ?? 99));
  const primary = sorted[0];
  return primary ?? "SISWA";
}

function templateFor(role: string): OnboardingStep[] {
  return TEMPLATES[role] ?? STEPS_DEFAULT;
}

@Injectable()
export class UserOnboardingService {
  private readonly logger = new Logger(UserOnboardingService.name);

  constructor(private readonly prisma: PrismaClient) {}

  /** Status tur user + langkah role-specific. Row dibuat lazy saat pertama kali dibaca. */
  async getMe(userId: string, roles: readonly Role[]): Promise<UserOnboardingView> {
    const role = resolvePrimaryRole(roles);
    const existing = await this.prisma.userOnboarding.findUnique({ where: { user_id: userId } });
    let row: OnboardingRow;
    if (existing) {
      row = existing;
      if (existing.role !== role) {
        row = await this.prisma.userOnboarding.update({
          where: { user_id: userId },
          data: { role }
        });
      }
    } else {
      row = await this.prisma.userOnboarding.create({
        data: { user_id: userId, role }
      });
    }
    return this.toView(row, templateFor(role));
  }

  /** Tandai tur selesai seluruhnya. */
  async complete(userId: string): Promise<UserOnboardingView> {
    const role = await this.ensureRole(userId);
    const row = await this.prisma.userOnboarding.update({
      where: { user_id: userId },
      data: { is_completed: true, completed_at: new Date(), dismissed_at: null }
    });
    return this.toView(row, templateFor(role));
  }

  /** Lewati tur — tidak muncul otomatis lagi sampai dipanggil manual. */
  async dismiss(userId: string): Promise<UserOnboardingView> {
    const role = await this.ensureRole(userId);
    const row = await this.prisma.userOnboarding.update({
      where: { user_id: userId },
      data: { dismissed_at: new Date() }
    });
    return this.toView(row, templateFor(role));
  }

  /** Update progres satu langkah (done=true tambah, done=false hapus). */
  async updateProgress(
    userId: string,
    dto: UpdateOnboardingProgressDto,
    roles: readonly Role[]
  ): Promise<UserOnboardingView> {
    const role = resolvePrimaryRole(roles);
    const existing = await this.ensureRow(userId, role);
    const steps = this.readSteps(existing.steps_completed);
    const next = dto.done
      ? [...new Set<string>([...steps, dto.stepKey])]
      : steps.filter((k) => k !== dto.stepKey);

    const row = await this.prisma.userOnboarding.update({
      where: { user_id: userId },
      data: { steps_completed: next as Prisma.InputJsonValue }
    });
    return this.toView(row, templateFor(role));
  }

  private async ensureRole(userId: string): Promise<string> {
    const row = await this.ensureRow(userId, "SISWA");
    return row.role;
  }

  private async ensureRow(userId: string, role: string): Promise<OnboardingRow> {
    const existing = await this.prisma.userOnboarding.findUnique({ where: { user_id: userId } });
    if (existing) {
      return existing;
    }
    return this.prisma.userOnboarding.create({
      data: { user_id: userId, role }
    });
  }

  private readSteps(raw: Prisma.JsonValue | null | undefined): string[] {
    if (Array.isArray(raw)) {
      return raw.filter((k): k is string => typeof k === "string");
    }
    return [];
  }

  private toView(row: OnboardingRow, steps: OnboardingStep[]): UserOnboardingView {
    return {
      isCompleted: row.is_completed,
      dismissedAt: row.dismissed_at ? row.dismissed_at.toISOString() : null,
      completedAt: row.completed_at ? row.completed_at.toISOString() : null,
      completedSteps: this.readSteps(row.steps_completed),
      steps
    };
  }
}
