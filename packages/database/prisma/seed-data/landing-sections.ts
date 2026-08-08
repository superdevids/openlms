/**
 * Default konten landing page (R-33..R-36).
 * Di-seed ke LandingContent dengan `extra` terstruktur per slug:
 * - hero: CTA (link_url/link_label → /ppdb)
 * - sambutan-kepsek: { name, position, image }
 * - tentang: { features: [{ title, desc }] }
 * - visi-misi: { visi, misi: string[] }
 * - program-keahlian: { programs: [{ title, desc, icon }] } (SMK)
 * - ekstrakurikuler: { items: [{ title, desc, icon }] }
 * - prestasi: { items: [{ title, level, year }] }
 * - fasilitas: { items: [{ title, desc, icon }] }
 * - galeri: { images: [{ title, src }] }
 * - faq: { faq: [{ question, answer }] }
 * - kontak: { phone, email, address, hours } + CTA → /ppdb
 */

export interface LandingSectionSeed {
  slug: string;
  title: string;
  subtitle: string;
  body: string;
  sectionOrder: number;
  linkUrl?: string;
  linkLabel?: string;
  extra?: Record<string, unknown>;
}

export const LANDING_SECTIONS_SEED: LandingSectionSeed[] = [
  {
    slug: "hero",
    title: "Selamat Datang",
    subtitle: "Sekolah unggulan dengan teknologi digital",
    body: "Sistem Informasi Sekolah (SIS) dan Learning Management System (LMS) terpadu untuk mendukung pembelajaran, administrasi, dan pelayanan sekolah yang modern, transparan, dan akuntabel.",
    sectionOrder: 0,
    linkUrl: "/ppdb",
    linkLabel: "Daftar PPDB",
    extra: {
      stats: [
        { label: "Peserta Didik", value: "1.200+" },
        { label: "Guru & Staf", value: "86" },
        { label: "Kelas", value: "48" },
        { label: "Tahun Berdiri", value: "1965" }
      ]
    }
  },
  {
    slug: "sambutan-kepsek",
    title: "Sambutan Kepala Sekolah",
    subtitle: "Kata sambutan dari pimpinan sekolah",
    body: "Selamat datang di website resmi sekolah kami. Kami berkomitmen menyelenggarakan pendidikan yang bermutu, berkarakter, dan relevan dengan kebutuhan zaman. Melalui platform digital ini, kami ingin mendekatkan sekolah dengan orang tua dan masyarakat agar tumbuh kolaborasi yang sehat demi kemajuan peserta didik.",
    sectionOrder: 5,
    extra: {
      name: "Nama Kepala Sekolah",
      position: "Kepala Sekolah",
      image: null
    }
  },
  {
    slug: "tentang",
    title: "Tentang Kami",
    subtitle: "Profil singkat sekolah",
    body: "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman. Kurikulum kami mengintegrasikan penguasaan ilmu pengetahuan, penguatan karakter, dan kecakapan digital agar setiap peserta didik berkembang optimal.",
    sectionOrder: 10,
    extra: {
      features: [
        { title: "Pembelajaran modern", desc: "Kurikulum aktif, kreatif, dan menyenangkan." },
        { title: "Teknologi terpadu", desc: "LMS & SIS dalam satu platform digital." },
        { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." }
      ]
    }
  },
  {
    slug: "visi-misi",
    title: "Visi & Misi",
    subtitle: "Arah dan komitmen kami",
    body: "Visi dan misi sekolah menjadi pedoman seluruh warga sekolah dalam menyelenggarakan pendidikan.",
    sectionOrder: 15,
    extra: {
      visi: "Terwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.",
      misi: [
        "Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.",
        "Menumbuhkan budaya literasi dan numerasi.",
        "Membangun karakter peserta didik melalui pembiasaan positif.",
        "Mengembangkan bakat dan minat peserta didik.",
        "Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak."
      ]
    }
  },
  {
    slug: "piagam",
    title: "Piagam Sekolah",
    subtitle: "Landasan pendirian & akreditasi",
    body: "Piagam pendirian dan akreditasi sekolah sebagai pengakuan resmi atas penyelenggaraan pendidikan.\n\nNPSN: 00000001\nStatus Akreditasi: A\nTahun Pendirian: 1965",
    sectionOrder: 20
  },
  {
    slug: "program-keahlian",
    title: "Program Keahlian",
    subtitle: "Kompetensi keahlian yang diselenggarakan (SMK)",
    body: "Sekolah menyelenggarakan program keahlian yang selaras dengan kebutuhan dunia usaha dan dunia industri (DUDI).",
    sectionOrder: 25,
    linkUrl: "/ppdb",
    linkLabel: "Daftar Sekarang",
    extra: {
      programs: [
        {
          title: "Teknik Komputer & Jaringan",
          desc: "Instalasi jaringan, administrasi server, dan keamanan siber dasar.",
          icon: "database"
        },
        {
          title: "Rekayasa Perangkat Lunak",
          desc: "Pengembangan aplikasi web, mobile, dan basis data.",
          icon: "file"
        },
        {
          title: "Teknik Kendaraan Ringan",
          desc: "Perawatan dan perbaikan kendaraan ringan.",
          icon: "settings"
        },
        {
          title: "Akuntansi & Keuangan",
          desc: "Pembukuan, perpajakan, dan pengelolaan keuangan usaha.",
          icon: "wallet"
        },
        {
          title: "Multimedia",
          desc: "Desain grafis, animasi, dan produksi konten digital.",
          icon: "camera"
        },
        {
          title: "Teknik Sepeda Motor",
          desc: "Perawatan dan perbaikan sepeda motor.",
          icon: "settings"
        }
      ]
    }
  },
  {
    slug: "ekstrakurikuler",
    title: "Ekstrakurikuler",
    subtitle: "Wadah pengembangan bakat & minat",
    body: "Beragam kegiatan ekstrakurikuler untuk mengembangkan bakat, minat, dan karakter peserta didik di luar jam pelajaran.",
    sectionOrder: 30,
    extra: {
      items: [
        { title: "Pramuka", desc: "Kepramukaan & kepemimpinan", icon: "flag" },
        { title: "Paskibra", desc: "Baris-berbaris & upacara", icon: "flag" },
        { title: "Futsal", desc: "Olahraga futsal", icon: "chart" },
        { title: "Basket", desc: "Olahraga basket", icon: "chart" },
        { title: "Robotik", desc: "Perakitan & pemrograman robot", icon: "rocket" },
        { title: "Seni Tari", desc: "Tari tradisional & modern", icon: "camera" },
        { title: "Paduan Suara", desc: "Vokal grup & kor", icon: "grade" },
        { title: "English Club", desc: "Pendalaman bahasa Inggris", icon: "book" }
      ]
    }
  },
  {
    slug: "prestasi",
    title: "Prestasi",
    subtitle: "Kebanggaan warga sekolah",
    body: "Prestasi peserta didik dan guru di tingkat kabupaten, provinsi, nasional, hingga internasional.",
    sectionOrder: 35,
    extra: {
      items: [
        { title: "Juara 1 LKS Web Technologies", level: "Provinsi", year: "2026" },
        { title: "Juara 2 OSN Matematika", level: "Kabupaten", year: "2025" },
        { title: "Juara 1 FLS2N Tari", level: "Provinsi", year: "2025" },
        { title: "Medali Perak Robotik", level: "Nasional", year: "2024" }
      ]
    }
  },
  {
    slug: "fasilitas",
    title: "Fasilitas",
    subtitle: "Sarana & prasarana pendukung",
    body: "Fasilitas belajar yang memadai untuk mendukung proses pembelajaran yang nyaman dan berkualitas.",
    sectionOrder: 40,
    extra: {
      items: [
        { title: "Laboratorium Komputer", desc: "Lab komputer dengan internet", icon: "database" },
        { title: "Perpustakaan", desc: "Koleksi buku & ruang baca", icon: "book" },
        { title: "Masjid Sekolah", desc: "Tempat ibadah & kegiatan keagamaan", icon: "settings" },
        { title: "Lapangan Olahraga", desc: "Lapangan basket & futsal", icon: "chart" },
        { title: "Kantin Sehat", desc: "Kantin dengan pangan sehat", icon: "wallet" },
        { title: "WiFi Area", desc: "Akses internet untuk pembelajaran", icon: "refresh" }
      ]
    }
  },
  {
    slug: "galeri",
    title: "Galeri",
    subtitle: "Dokumentasi kegiatan sekolah",
    body: "Momen kegiatan pembelajaran, upacara, dan acara sekolah dalam dokumentasi foto.",
    sectionOrder: 45,
    extra: {
      images: [
        { title: "Kegiatan MPLS", src: null },
        { title: "Pembelajaran Kelas", src: null },
        { title: "Upacara Bendera", src: null },
        { title: "Praktikum Lab", src: null }
      ]
    }
  },
  {
    slug: "faq",
    title: "Pertanyaan Umum",
    subtitle: "Informasi yang sering ditanyakan",
    body: "Kumpulan pertanyaan dan jawaban seputar pendaftaran, pembelajaran, dan layanan sekolah.",
    sectionOrder: 50,
    extra: {
      faq: [
        {
          question: "Bagaimana cara mendaftar PPDB?",
          answer:
            "Pendaftaran dilakukan secara daring melalui menu PPDB di website ini. Siapkan dokumen seperti akta kelahiran, KK, dan ijazah/SKHU."
        },
        {
          question: "Apakah ada beasiswa?",
          answer:
            "Sekolah menyediakan beasiswa prestasi dan bantuan biaya pendidikan bagi peserta didik yang memenuhi kriteria."
        },
        {
          question: "Bagaimana orang tua memantau perkembangan anak?",
          answer:
            "Orang tua dapat mengakses portal orang tua pada aplikasi untuk melihat nilai, absensi, dan tagihan anak secara real-time."
        },
        {
          question: "Bagaimana jam operasional sekolah?",
          answer:
            "Kegiatan belajar mengajar berlangsung Senin–Jumat pukul 07.00–15.00 WIB. Layanan administrasi dibuka pada jam yang sama."
        }
      ]
    }
  },
  {
    slug: "kontak",
    title: "Hubungi Kami",
    subtitle: "Informasi kontak sekolah",
    body: "Silakan hubungi kami untuk informasi lebih lanjut seputar penerimaan peserta didik baru dan layanan sekolah.",
    sectionOrder: 60,
    linkUrl: "/ppdb",
    linkLabel: "Daftar PPDB",
    extra: {
      phone: "021-0000000",
      email: "info@openlms.local",
      address: "Jl. Pendidikan No. 1",
      hours: "Senin–Jumat, 07.00–15.00 WIB"
    }
  }
];
