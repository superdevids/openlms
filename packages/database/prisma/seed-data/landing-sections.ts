/**
 * Default konten landing page (R-33..R-36).
 * Di-seed ke LandingContent dengan `extra` terstruktur per slug:
 * - hero: CTA (link_url/link_label → /ppdb) + stats: [{ label, value }]
 * - statistik: stats: [{ label, value, desc }]
 * - sambutan-kepsek: { name, position, image }
 * - tentang: { features: [{ title, desc }] }
 * - visi-misi: { visi, misi: string[] }
 * - piagam: body teks (NPSN, akreditasi, tahun pendirian)
 * - struktur-organisasi: groups: [{ title, items: [{ name, position }] }]
 * - program-keahlian: programs: [{ code, title, desc, icon, kompetensi[], mitra_dudi[], prospek[] }]
 *   (code = Prodi.code, dipakai endpoint publik /public/programs untuk melengkapi data Prodi)
 * - ekstrakurikuler: items: [{ title, desc, icon, schedule, pembina, kuota }]
 * - prestasi: items: [{ title, level, year, field, coach, description }]
 * - agenda: items: [{ title, date, time, location, desc }]
 * - fasilitas: items: [{ title, desc, icon }]
 * - galeri: images: [{ title, src, category, date }] — src path bucket `landing`
 * - testimoni: items: [{ name, role, text }]
 * - faq: faq: [{ question, answer }]
 * - ppdb-cta: { periode, kuota, jalur[], info[] } + CTA → /ppdb
 * - kontak: { phone, email, address, hours, mapsEmbedUrl, whatsapp, instagram,
 *   facebook, youtube } + CTA → /ppdb
 *
 * Nilai gambar adalah path placeholder di bucket `landing` yang bisa diganti
 * operator melalui UI Landing Page (admin).
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
    slug: "statistik",
    title: "Statistik Sekolah",
    subtitle: "Angka nyata dari lapangan",
    body: "Data profil sekolah yang diperbarui setiap tahun ajaran agar masyarakat dapat melihat capaian dan fasilitas kami secara transparan.",
    sectionOrder: 3,
    extra: {
      stats: [
        {
          label: "Peserta Didik Aktif",
          value: "1.247",
          desc: "Tahun ajaran 2026/2027"
        },
        {
          label: "Guru & Tenaga Kependidikan",
          value: "86",
          desc: "92% guru tersertifikasi"
        },
        {
          label: "Rombongan Belajar",
          value: "36",
          desc: "Kelas X–XII"
        },
        {
          label: "Akreditasi",
          value: "A",
          desc: "BAN-S/M 2023"
        },
        {
          label: "Lulusan Terserap DUDI",
          value: "94%",
          desc: "Tracer study 2025"
        },
        {
          label: "Beasiswa Tersalurkan",
          value: "Rp480 Juta",
          desc: "Tahun 2025/2026"
        }
      ]
    }
  },
  {
    slug: "sambutan-kepsek",
    title: "Sambutan Kepala Sekolah",
    subtitle: "Kata sambutan dari pimpinan sekolah",
    body: "Selamat datang di website resmi sekolah kami. Kami berkomitmen menyelenggarakan pendidikan yang bermutu, berkarakter, dan relevan dengan kebutuhan zaman. Melalui platform digital ini, kami ingin mendekatkan sekolah dengan orang tua dan masyarakat agar tumbuh kolaborasi yang sehat demi kemajuan peserta didik.\n\nKami percaya setiap anak memiliki potensi unik. Tugas kami adalah menyediakan lingkungan belajar yang aman, menyenangkan, dan menantang agar potensi itu tumbuh optimal. Terima kasih atas kepercayaan yang telah diberikan kepada kami.",
    sectionOrder: 5,
    extra: {
      name: "Drs. H. Ahmad Fauzi, M.Pd.",
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
        { title: "Karakter unggul", desc: "Pembiasaan positif dan penguatan budi pekerti." },
        { title: "Lingkungan ramah anak", desc: "Sekolah sehat, hijau, dan bebas perundungan." },
        { title: "Kemitraan industri", desc: "Guru tamu dan magang dari dunia usaha/industri." },
        { title: "Layanan inklusif", desc: "Dukungan belajar untuk semua peserta didik." }
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
        "Memperkuat kemitraan dengan dunia usaha dan dunia industri (DUDI).",
        "Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak."
      ]
    }
  },
  {
    slug: "piagam",
    title: "Piagam Sekolah",
    subtitle: "Landasan pendirian & akreditasi",
    body: "Piagam pendirian dan akreditasi sekolah sebagai pengakuan resmi atas penyelenggaraan pendidikan.\n\nNPSN: 00000001\nStatus Akreditasi: A\nTahun Pendirian: 1965\nSK Pendirian: 1234/D/SK/1965\nNSS: 000100001",
    sectionOrder: 20
  },
  {
    slug: "struktur-organisasi",
    title: "Struktur Organisasi",
    subtitle: "Susunan pengurus dan pembagian tugas",
    body: "Struktur organisasi sekolah menggambarkan pembagian tugas dan tanggung jawab setiap unit kerja agar pelayanan pendidikan berjalan tertib dan akuntabel.",
    sectionOrder: 22,
    extra: {
      groups: [
        {
          title: "Pimpinan",
          items: [
            { name: "Drs. H. Ahmad Fauzi, M.Pd.", position: "Kepala Sekolah" },
            { name: "Hj. Siti Nurhaliza, S.Pd., M.M.", position: "Ketua Komite Sekolah" }
          ]
        },
        {
          title: "Wakil Kepala Sekolah",
          items: [
            { name: "Dedi Kurniawan, S.T.", position: "Waka Bidang Kurikulum" },
            { name: "Budi Santoso, M.Pd.", position: "Waka Bidang Kesiswaan" },
            { name: "Rina Marlina, S.Pd.", position: "Waka Bidang Sarana & Prasarana" },
            { name: "Eko Prasetyo, S.Sn.", position: "Waka Bidang Humas & Industri" }
          ]
        },
        {
          title: "Kepala Program Keahlian",
          items: [
            { name: "Andi Wijaya, S.Or.", position: "Teknik Komputer & Jaringan" },
            { name: "Sarah Wijaya, S.Pd.", position: "Rekayasa Perangkat Lunak" },
            { name: "Hendra Gunawan, S.T.", position: "Teknik Kendaraan Ringan" },
            { name: "Maya Sari, S.E.", position: "Akuntansi & Keuangan" },
            { name: "Fajar Ramadhan, S.Ds.", position: "Multimedia" },
            { name: "Joko Prasetyo, S.T.", position: "Teknik Sepeda Motor" }
          ]
        },
        {
          title: "Tata Usaha & Layanan",
          items: [
            { name: "Siti Aminah, S.E.", position: "Kepala Tata Usaha" },
            { name: "Dewi Lestari, A.Md.", position: "Staf Keuangan & Administrasi" },
            { name: "Joko Susilo", position: "Staf Sarana & Prasarana" },
            { name: "Laila Nurjanah, A.Md.", position: "Staf Layanan PPDB & Humas" }
          ]
        }
      ]
    }
  },
  {
    slug: "program-keahlian",
    title: "Program Keahlian",
    subtitle: "Kompetensi keahlian yang diselenggarakan (SMK)",
    body: "Sekolah menyelenggarakan program keahlian yang selaras dengan kebutuhan dunia usaha dan dunia industri (DUDI). Setiap program dilengkapi kurikulum berbasis industri, guru produktif, dan kemitraan magang.",
    sectionOrder: 25,
    linkUrl: "/ppdb",
    linkLabel: "Daftar Sekarang",
    extra: {
      programs: [
        {
          code: "TKJ",
          title: "Teknik Komputer & Jaringan",
          desc: "Instalasi jaringan, administrasi server, dan keamanan siber dasar.",
          icon: "database",
          kompetensi: [
            "Instalasi LAN/WAN dan nirkabel",
            "Administrasi server Linux & Windows",
            "Keamanan jaringan dasar",
            "Konfigurasi perangkat Mikrotik"
          ],
          mitra_dudi: ["PT Telkom Indonesia", "Mikrotik Academy", "PT Nusantara Network"],
          prospek: ["Teknisi Jaringan", "Network Administrator", "Teknisi Komputer"]
        },
        {
          code: "RPL",
          title: "Rekayasa Perangkat Lunak",
          desc: "Pengembangan aplikasi web, mobile, dan basis data.",
          icon: "file",
          kompetensi: [
            "Pemrograman web (HTML, CSS, JavaScript)",
            "Pengembangan aplikasi mobile",
            "Perancangan basis data",
            "Pengujian perangkat lunak"
          ],
          mitra_dudi: ["Dicoding", "PT Maju Teknologi", "Coding Camp Indonesia"],
          prospek: ["Web Developer", "Mobile Developer", "QA Engineer"]
        },
        {
          code: "TKR",
          title: "Teknik Kendaraan Ringan",
          desc: "Perawatan dan perbaikan kendaraan ringan.",
          icon: "settings",
          kompetensi: [
            "Perawatan mesin kendaraan ringan",
            "Kelistrikan kendaraan",
            "Chassis dan pemindah tenaga",
            "Diagnosa kerusakan dasar"
          ],
          mitra_dudi: ["Astra Honda Motor", "Toyota Service Center", "Bengkel Mitra"],
          prospek: ["Teknisi Otomotif", "Mekanik", "Wirausaha bengkel"]
        },
        {
          code: "AKL",
          title: "Akuntansi & Keuangan",
          desc: "Pembukuan, perpajakan, dan pengelolaan keuangan usaha.",
          icon: "wallet",
          kompetensi: [
            "Akuntansi dasar dan komputer akuntansi",
            "Penyusunan laporan keuangan",
            "Perpajakan dasar",
            "Administrasi transaksi keuangan"
          ],
          mitra_dudi: ["Bank Contoh", "Kantor Akuntan Publik", "UMKM Binaan"],
          prospek: ["Staf Akuntansi", "Operator Pajak", "Bendahara Usaha"]
        },
        {
          code: "MM",
          title: "Multimedia",
          desc: "Desain grafis, animasi, dan produksi konten digital.",
          icon: "camera",
          kompetensi: [
            "Desain grafis cetak & digital",
            "Animasi 2D/3D dasar",
            "Videografi dan penyuntingan",
            "Desain antarmuka (UI/UX)"
          ],
          mitra_dudi: ["Studio Kreatif Lokal", "Rumah Produksi Media", "Media Digital"],
          prospek: ["Desainer Grafis", "Video Editor", "Animator"]
        },
        {
          code: "TSM",
          title: "Teknik Sepeda Motor",
          desc: "Perawatan dan perbaikan sepeda motor.",
          icon: "settings",
          kompetensi: [
            "Perawatan mesin sepeda motor",
            "Kelistrikan sepeda motor",
            "Tune-up dan servis berkala",
            "Manajemen bengkel dasar"
          ],
          mitra_dudi: ["AHM (Astra Honda)", "Bengkel Resmi Mitra", "Yamaha Service"],
          prospek: ["Mekanik", "Teknisi AHASS", "Wirausaha bengkel"]
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
        {
          title: "Pramuka",
          desc: "Kepramukaan & kepemimpinan",
          icon: "flag",
          schedule: "Sabtu, 07.30–10.00 WIB",
          pembina: "Budi Santoso, M.Pd.",
          kuota: "100 peserta"
        },
        {
          title: "Paskibra",
          desc: "Baris-berbaris & upacara",
          icon: "flag",
          schedule: "Sabtu, 07.30–10.00 WIB",
          pembina: "Kapten (Purn.) Joko Prasetyo",
          kuota: "40 peserta"
        },
        {
          title: "Futsal",
          desc: "Olahraga futsal",
          icon: "chart",
          schedule: "Selasa & Kamis, 15.30–17.30 WIB",
          pembina: "Andi Wijaya, S.Or.",
          kuota: "30 peserta"
        },
        {
          title: "Basket",
          desc: "Olahraga basket",
          icon: "chart",
          schedule: "Senin & Rabu, 15.30–17.30 WIB",
          pembina: "Rina Marlina, S.Pd.",
          kuota: "30 peserta"
        },
        {
          title: "Robotik",
          desc: "Perakitan & pemrograman robot",
          icon: "rocket",
          schedule: "Jumat, 14.00–16.00 WIB",
          pembina: "Dedi Kurniawan, S.T.",
          kuota: "25 peserta"
        },
        {
          title: "Seni Tari",
          desc: "Tari tradisional & modern",
          icon: "camera",
          schedule: "Jumat, 14.00–16.00 WIB",
          pembina: "Sri Rahayu, S.Sn.",
          kuota: "40 peserta"
        },
        {
          title: "Paduan Suara",
          desc: "Vokal grup & kor",
          icon: "grade",
          schedule: "Sabtu, 10.00–12.00 WIB",
          pembina: "Eko Prasetyo, S.Sn.",
          kuota: "40 peserta"
        },
        {
          title: "English Club",
          desc: "Pendalaman bahasa Inggris",
          icon: "book",
          schedule: "Rabu, 14.00–15.30 WIB",
          pembina: "Sarah Wijaya, S.Pd.",
          kuota: "30 peserta"
        }
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
        {
          title: "Juara 1 LKS Web Technologies",
          level: "Provinsi",
          year: "2026",
          field: "Teknologi Informasi",
          coach: "Dedi Kurniawan, S.T.",
          description:
            "Mengalahkan 30 peserta dari seluruh provinsi dalam pengembangan aplikasi web."
        },
        {
          title: "Juara 2 OSN Matematika",
          level: "Kabupaten",
          year: "2025",
          field: "Matematika",
          coach: "Bambang Suryanto, S.Pd.",
          description: "Finalis Olimpiade Sains Nasional tingkat kabupaten bidang matematika."
        },
        {
          title: "Juara 1 FLS2N Tari Tradisional",
          level: "Provinsi",
          year: "2025",
          field: "Seni Budaya",
          coach: "Sri Rahayu, S.Sn.",
          description:
            "Penampilan tari tradisional terbaik pada Festival Lomba Seni Siswa Nasional."
        },
        {
          title: "Medali Perak Robotic Competition",
          level: "Nasional",
          year: "2024",
          field: "Robotik",
          coach: "Dedi Kurniawan, S.T.",
          description: "Tim robotik meraih medali perak kategori sumo robot tingkat nasional."
        },
        {
          title: "Juara 1 Futsal Pelajar Cup",
          level: "Kabupaten",
          year: "2024",
          field: "Olahraga",
          coach: "Andi Wijaya, S.Or.",
          description: "Tim futsal putra menjuarai kompetisi futsal antar-SMK se-kabupaten."
        },
        {
          title: "Juara 3 Lomba Pidato Bahasa Inggris",
          level: "Nasional",
          year: "2023",
          field: "Bahasa",
          coach: "Sarah Wijaya, S.Pd.",
          description: "Lomba pidato bahasa Inggris antar-pelajar tingkat nasional."
        },
        {
          title: "Juara 1 Kompetisi Inovasi Digital Siswa",
          level: "Provinsi",
          year: "2023",
          field: "Teknologi",
          coach: "Hendra Gunawan, S.T.",
          description: "Aplikasi pelayanan sekolah karya siswa RPL meraih juara pertama."
        },
        {
          title: "Medali Emas Kejurnas Pencak Silat",
          level: "Nasional",
          year: "2022",
          field: "Olahraga",
          coach: "Budi Santoso, M.Pd.",
          description: "Atlet pencak silat sekolah meraih medali emas kejuaraan nasional."
        }
      ]
    }
  },
  {
    slug: "agenda",
    title: "Agenda Sekolah",
    subtitle: "Kegiatan penting yang akan datang",
    body: "Kalender kegiatan sekolah yang dapat berubah sewaktu-waktu. Informasi terbaru diumumkan melalui pengumuman resmi sekolah.",
    sectionOrder: 38,
    extra: {
      items: [
        {
          title: "Rapat Orang Tua/Wali Semester Ganjil",
          date: "2026-09-05",
          time: "08.00–11.00 WIB",
          location: "Aula Sekolah",
          desc: "Pembagian laporan perkembangan peserta didik dan sosialisasi program semester ganjil."
        },
        {
          title: "Penilaian Tengah Semester Ganjil",
          date: "2026-09-21",
          time: "07.00–11.30 WIB",
          location: "Ruang kelas masing-masing",
          desc: "PTS ganjil berlangsung satu pekan untuk seluruh jenjang kelas."
        },
        {
          title: "Kegiatan P5 Tema Kebekerjaan",
          date: "2026-09-28",
          time: "07.30–14.00 WIB",
          location: "Lapangan & DUDI mitra",
          desc: "Projek penguatan profil pelajar Pancasila dengan praktik langsung di industri mitra."
        },
        {
          title: "Perkemahan Pramuka & Kemah Bakti",
          date: "2026-10-10",
          time: "Jumat–Minggu",
          location: "Bumi Perkemahan Desa Cikole",
          desc: "Kegiatan kepramukaan wajib untuk anggota aktif dan latihan kepemimpinan."
        },
        {
          title: "Uji Kompetensi Keahlian",
          date: "2026-11-02",
          time: "08.00–15.00 WIB",
          location: "Lab & bengkel program keahlian",
          desc: "Uji kompetensi kelas XII dengan asesor industri untuk sertifikasi keahlian."
        },
        {
          title: "Peringatan Hari Guru Nasional",
          date: "2026-11-25",
          time: "07.30–10.30 WIB",
          location: "Halaman sekolah",
          desc: "Upacara dan apresiasi bagi guru serta tenaga kependidikan berprestasi."
        }
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
        { title: "WiFi Area", desc: "Akses internet untuk pembelajaran", icon: "refresh" },
        {
          title: "Bengkel Praktik Otomotif",
          desc: "Bengkel standar industri untuk TKJ/TKR/TSM",
          icon: "settings"
        },
        {
          title: "Studio Multimedia",
          desc: "Studio produksi konten & podcast",
          icon: "camera"
        }
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
        {
          title: "Kegiatan MPLS 2026",
          src: "/storage/files/public/landing/galeri-1.jpg",
          category: "Kegiatan",
          date: "2026-07-15"
        },
        {
          title: "Pembelajaran Kelas X",
          src: "/storage/files/public/landing/galeri-2.jpg",
          category: "Pembelajaran",
          date: "2026-07-20"
        },
        {
          title: "Upacara Bendera",
          src: "/storage/files/public/landing/galeri-3.jpg",
          category: "Seremonial",
          date: "2026-08-03"
        },
        {
          title: "Praktikum Jaringan TKJ",
          src: "/storage/files/public/landing/galeri-4.jpg",
          category: "Praktikum",
          date: "2026-07-22"
        },
        {
          title: "Pentas Seni dan Budaya",
          src: "/storage/files/public/landing/galeri-5.jpg",
          category: "Kegiatan",
          date: "2026-06-10"
        },
        {
          title: "Peringatan Hari Kemerdekaan",
          src: "/storage/files/public/landing/galeri-6.jpg",
          category: "Seremonial",
          date: "2025-08-17"
        },
        {
          title: "Latihan Paskibra",
          src: "/storage/files/public/landing/galeri-7.jpg",
          category: "Ekstrakurikuler",
          date: "2026-07-28"
        },
        {
          title: "Kunjungan Industri RPL",
          src: "/storage/files/public/landing/galeri-8.jpg",
          category: "Kegiatan",
          date: "2026-05-12"
        },
        {
          title: "Perpustakaan Sekolah",
          src: "/storage/files/public/landing/galeri-9.jpg",
          category: "Fasilitas",
          date: "2026-04-05"
        },
        {
          title: "Kegiatan Pramuka",
          src: "/storage/files/public/landing/galeri-10.jpg",
          category: "Ekstrakurikuler",
          date: "2026-08-01"
        }
      ]
    }
  },
  {
    slug: "testimoni",
    title: "Testimoni",
    subtitle: "Apa kata mereka",
    body: "Pengalaman orang tua, siswa, dan alumni tentang sekolah kami.",
    sectionOrder: 48,
    extra: {
      items: [
        {
          name: "Hendra Gunawan",
          role: "Orang tua siswa kelas X TKJ",
          text: "Saya sangat terbantu dengan aplikasi sekolah. Absensi, nilai, dan tagihan bisa dipantau langsung dari rumah tanpa harus datang ke sekolah."
        },
        {
          name: "Salsabila Putri",
          role: "Alumni RPL 2024 — Web Developer",
          text: "Bekal dari sekolah benar-benar terpakai di dunia kerja. Saya bahkan sudah bekerja sebagai developer setahun setelah lulus berkat kemitraan industri."
        },
        {
          name: "Maya Sari",
          role: "Orang tua siswa kelas XII AKL",
          text: "Guru-gurunya komunikatif dan peduli. Anak saya yang tadinya pemalu sekarang berani tampil dan meraih prestasi di lomba."
        },
        {
          name: "Fajar Ramadhan",
          role: "Siswa kelas XI Multimedia",
          text: "Fasilitas studio dan lab komputernya lengkap. Saya bisa belajar editing dan desain tanpa harus ikut kursus di luar."
        }
      ]
    }
  },
  {
    slug: "faq",
    title: "Pertanyaan Umum",
    subtitle: "Informasi yang sering ditanyakan",
    body: "Kumpulan pertanyaan dan jawaban seputar pendaftaran, biaya, kurikulum, pembelajaran, dan layanan sekolah.",
    sectionOrder: 50,
    extra: {
      faq: [
        {
          question: "Bagaimana cara mendaftar PPDB?",
          answer:
            "Pendaftaran dilakukan secara daring melalui menu PPDB di website ini. Siapkan dokumen seperti akta kelahiran, KK, dan ijazah/SKHU."
        },
        {
          question: "Apa saja persyaratan dokumen pendaftaran?",
          answer:
            "Dokumen yang wajib disiapkan: akta kelahiran, kartu keluarga (KK), ijazah/SKHU asli atau legalisir, dan pas foto terbaru. Untuk jalur afirmasi, siapkan dokumen pendukung sesuai ketentuan."
        },
        {
          question: "Apa saja jalur pendaftaran yang tersedia?",
          answer:
            "Tersedia jalur zonasi, afirmasi, perpindahan tugas orang tua, dan prestasi. Setiap jalur memiliki kuota dan mekanisme seleksi yang diumumkan pada portal PPDB."
        },
        {
          question: "Berapa biaya pendidikan di sekolah ini?",
          answer:
            "Sekolah menerapkan sistem uang komite yang ditetapkan dalam rapat orang tua/wali setiap tahun ajaran. Terdapat keringanan dan skema cicilan bagi keluarga yang membutuhkan."
        },
        {
          question: "Apakah ada beasiswa?",
          answer:
            "Sekolah menyediakan beasiswa prestasi dan bantuan biaya pendidikan bagi peserta didik yang memenuhi kriteria, termasuk beasiswa untuk atlet dan seniman berprestasi."
        },
        {
          question: "Kurikulum apa yang digunakan?",
          answer:
            "Sekolah menerapkan Kurikulum Merdeka dengan pembelajaran berbasis projek (P5) serta penguatan kecakapan digital melalui LMS."
        },
        {
          question: "Apa saja fasilitas penunjang pembelajaran?",
          answer:
            "Tersedia laboratorium komputer, bengkel praktik, studio multimedia, perpustakaan, masjid, lapangan olahraga, dan akses WiFi di seluruh area sekolah."
        },
        {
          question: "Bagaimana orang tua memantau perkembangan anak?",
          answer:
            "Orang tua dapat mengakses portal orang tua pada aplikasi untuk melihat nilai, absensi, dan tagihan anak secara real-time."
        },
        {
          question: "Apa saja kegiatan ekstrakurikuler yang bisa diikuti?",
          answer:
            "Tersedia lebih dari 15 ekstrakurikuler, antara lain Pramuka, Paskibra, futsal, basket, robotik, seni tari, paduan suara, dan English Club. Jadwal dan pembina tertera di menu Ekstrakurikuler."
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
    slug: "ppdb-cta",
    title: "PPDB 2026/2027",
    subtitle: "Pendaftaran peserta didik baru",
    body: "Bergabunglah bersama sekolah kami. Pendaftaran dilakukan secara daring, gratis, dan transparan melalui portal PPDB resmi.",
    sectionOrder: 58,
    linkUrl: "/ppdb",
    linkLabel: "Daftar Sekarang",
    extra: {
      periode: "1 Maret – 30 Juni 2026",
      kuota: "360 kursi",
      jalur: ["Zonasi", "Afirmasi", "Perpindahan orang tua", "Prestasi"],
      info: [
        { label: "Pendaftaran", value: "Daring melalui portal PPDB" },
        { label: "Biaya pendaftaran", value: "Gratis / Rp0" },
        { label: "Beasiswa", value: "Tersedia untuk siswa berprestasi" }
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
      email: "info@opensis.local",
      address: "Jl. Pendidikan No. 1, Kec. Contoh, Kab. Contoh, Indonesia",
      hours: "Senin–Jumat, 07.00–15.00 WIB",
      mapsEmbedUrl: "https://maps.google.com/maps?q=Jl.+Pendidikan+No.+1&output=embed",
      whatsapp: "6281200000000",
      instagram: "https://instagram.com/smkncontoh",
      facebook: "https://facebook.com/smkncontoh",
      youtube: "https://youtube.com/@smkncontoh"
    }
  }
];
