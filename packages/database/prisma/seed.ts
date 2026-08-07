/**
 * openlms — seed Fase 0 (F0-T4). Idempotent: aman dijalankan berulang.
 *
 * Isi:
 * - SchoolProfile demo (single-school) + AcademicYear contoh (2026/2027 OPEN).
 * - SUPERADMIN dev (password dev "password" — hanya untuk development lokal).
 * - FeatureFlag global (prd04 §5.N).
 * - Katalog Permission (13 kategori) + RolePermission untuk 12 role.
 * - Data demo: Class, Subject, ClassSubject.
 *
 * Komponen gaji, kategori aset + umur manfaat, dan template tagihan
 * disiapkan sebagai konstanta di prisma/seed-data (tabel W2 belum di ERD v1.1).
 */

import { PrismaClient, Role, EnrollmentStatus } from "@prisma/client";
import argon2 from "argon2";
import { PERMISSIONS, ROLE_PERMISSIONS, ROLES_TO_SEED } from "./seed-data/permissions";
import { FEATURE_FLAGS } from "./seed-data/feature-flags";

const prisma = new PrismaClient();

const DEV_ADMIN = {
  username: "admin",
  email: "admin@openlms.local",
  fullName: "Admin Sekolah (SUPERADMIN)",
  // Password dev yang DIDOKUMENTASIKAN — "password" untuk semua user seed
  // agar mudah login saat development (must_change_password=false).
  // Jangan dipakai di production.
  devPassword: "password"
};

async function main(): Promise<void> {
  // 1. SchoolProfile demo — single-school
  const school = await prisma.schoolProfile.upsert({
    where: { npsn: "00000001" },
    update: {},
    create: {
      npsn: "00000001",
      nss: "000100001",
      name: "SMA Negeri Contoh",
      school_type: "SMA",
      address: "Jl. Pendidikan No. 1",
      phone: "021-0000000",
      email: "info@openlms.local",
      timezone: "Asia/Jakarta",
      settings: {
        attendance: { absence_threshold_per_month: 3 },
        rollover: { require_final_grades: true, require_backup_verified: true },
        qr: { token_ttl_minutes: 7 }
      }
    }
  });

  // 2. AcademicYear — 2026/2027 (OPEN) + 2025/2026 (CLOSED)
  const yearNow = await prisma.academicYear.upsert({
    where: { code: "2026/2027" },
    update: {},
    create: {
      code: "2026/2027",
      name: "Tahun Ajaran 2026/2027",
      start_date: new Date("2026-07-13T00:00:00.000Z"),
      end_date: new Date("2027-06-30T00:00:00.000Z"),
      status: "OPEN"
    }
  });
  await prisma.academicYear.upsert({
    where: { code: "2025/2026" },
    update: {},
    create: {
      code: "2025/2026",
      name: "Tahun Ajaran 2025/2026",
      start_date: new Date("2025-07-14T00:00:00.000Z"),
      end_date: new Date("2026-06-30T00:00:00.000Z"),
      status: "CLOSED"
    }
  });

  // 3. SUPERADMIN dev + UserRole ACTIVE
  // Hash Argon2id NYATA dibuat di seed time (argon2.hash) — bukan placeholder.
  // Update branch ikut menimpa password_hash agar seed berulang memperbaiki
  // hash lama yang tidak valid (dev-only; password didokumentasikan di DEV_ADMIN).
  const admin = await prisma.user.upsert({
    where: { username: DEV_ADMIN.username },
    update: {
      full_name: DEV_ADMIN.fullName,
      password_hash: await argon2.hash(DEV_ADMIN.devPassword),
      must_change_password: false
    },
    create: {
      username: DEV_ADMIN.username,
      email: DEV_ADMIN.email,
      password_hash: await argon2.hash(DEV_ADMIN.devPassword),
      must_change_password: false,
      full_name: DEV_ADMIN.fullName
    }
  });
  await prisma.userRole.upsert({
    where: { user_id_role: { user_id: admin.id, role: "SUPERADMIN" } },
    update: { status: "ACTIVE" },
    create: {
      user_id: admin.id,
      role: "SUPERADMIN",
      status: "ACTIVE",
      invited_by: admin.id,
      joined_at: new Date()
    }
  });

  // 4. Feature flags global
  for (const flag of FEATURE_FLAGS) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: {
        key: flag.key,
        kategori: flag.kategori,
        deskripsi: flag.deskripsi,
        default_enabled: flag.default_enabled,
        config_schema: flag.config_schema ?? undefined,
        locked: flag.locked,
        is_system: flag.is_system
      }
    });
  }

  // 4b. Branding default — identitas visual aplikasi (single-school)
  await prisma.brandingConfig.upsert({
    where: { id: "branding_default" },
    update: {},
    create: {
      id: "branding_default",
      app_name: "openlms",
      tagline: "LMS & SIS Sekolah",
      primary_color: "#2563eb",
      secondary_color: "#1d4ed8",
      accent_color: "#0ea5e9",
      radius: 8,
      config_version: 1
    }
  });

  // 4b2. SystemStatus — baris tunggal status sistem (maintenance OFF default).
  // Update hanya mengoreksi flag OFF agar seed ulang tidak membatalkan
  // maintenance yang sedang aktif oleh SUPERADMIN.
  const existingStatus = await prisma.systemStatus.findUnique({
    where: { id: "system_status_default" }
  });
  await prisma.systemStatus.upsert({
    where: { id: "system_status_default" },
    update: {},
    create: {
      id: "system_status_default",
      maintenance_enabled: false
    }
  });
  if (existingStatus) {
    console.log("- SystemStatus: baris default sudah ada (status dipertahankan)");
  } else {
    console.log("- SystemStatus: baris default dibuat (maintenance OFF)");
  }

  // 4c. Prodi (jurusan/kompetensi keahlian SMK) — kode unik per jurusan
  const PRODI_SEED = [
    { code: "TKJ", name: "Teknik Komputer dan Jaringan", short_name: "TKJ" },
    { code: "RPL", name: "Rekayasa Perangkat Lunak", short_name: "RPL" },
    { code: "TKR", name: "Teknik Kendaraan Ringan", short_name: "TKR" },
    { code: "AKL", name: "Akuntansi dan Keuangan Lembaga", short_name: "AKL" },
    { code: "MM", name: "Multimedia", short_name: "MM" },
    { code: "TSM", name: "Teknik Sepeda Motor", short_name: "TSM" }
  ];
  const prodiIds = new Map<string, string>();
  for (const p of PRODI_SEED) {
    const row = await prisma.prodi.upsert({
      where: { code: p.code },
      update: { name: p.name, short_name: p.short_name },
      create: { code: p.code, name: p.name, short_name: p.short_name }
    });
    prodiIds.set(p.code, row.id);
  }

  // 5. Permission catalog + RolePermission (12 role)
  const permissionIds = new Map<string, string>();
  for (const perm of PERMISSIONS) {
    const row = await prisma.permission.upsert({
      where: { code: perm.code },
      update: { description: perm.description },
      create: {
        code: perm.code,
        category: perm.category,
        description: perm.description,
        is_system: perm.is_system ?? false
      }
    });
    permissionIds.set(perm.code, row.id);
  }

  let rolePermissionCount = 0;
  for (const role of ROLES_TO_SEED) {
    const grants = ROLE_PERMISSIONS[role as Role] ?? [];
    for (const grant of grants) {
      const permissionId = permissionIds.get(grant.code);
      if (!permissionId) {
        throw new Error(`Seed: permission tidak dikenal untuk role ${role}: ${grant.code}`);
      }
      const existing = await prisma.rolePermission.findUnique({
        where: { role_permission_id: { role: role as Role, permission_id: permissionId } }
      });
      if (!existing) {
        await prisma.rolePermission.create({
          data: {
            role: role as Role,
            permission_id: permissionId,
            effect: "ALLOW",
            scope_default: grant.scope
          }
        });
        rolePermissionCount += 1;
      }
    }
  }

  // 6. Demo akademik: Subject, Class, ClassSubject, Enrollment admin ke kelas
  const subject = await prisma.subject.upsert({
    where: { code: "MAT-11" },
    update: {},
    create: { code: "MAT-11", name: "Matematika", category: "WAJIB", is_competency_based: false }
  });
  let demoClass = await prisma.class.findFirst({
    where: { name: "X IPA 1", academic_year_id: yearNow.id }
  });
  if (!demoClass) {
    demoClass = await prisma.class.create({
      data: {
        name: "X IPA 1",
        grade_level: 10,
        academic_year_id: yearNow.id,
        is_active: true
      }
    });
  }
  // Kelas SMK demo terhubung ke Prodi (naming "10 TKJ 1")
  const tkjId = prodiIds.get("TKJ");
  if (tkjId) {
    const smkClass = await prisma.class.findFirst({
      where: { name: "10 TKJ 1", academic_year_id: yearNow.id }
    });
    if (smkClass) {
      // Kelas sudah ada (seed berulang) — pastikan terhubung ke Prodi.
      if (smkClass.prodi_id !== tkjId) {
        await prisma.class.update({
          where: { id: smkClass.id },
          data: { prodi_id: tkjId }
        });
      }
    } else {
      await prisma.class.create({
        data: {
          name: "10 TKJ 1",
          grade_level: 10,
          academic_year_id: yearNow.id,
          prodi_id: tkjId,
          is_active: true
        }
      });
    }
  }
  await prisma.classSubject.upsert({
    where: {
      class_id_subject_id_semester: {
        class_id: demoClass.id,
        subject_id: subject.id,
        semester: "2026/2027-GANJIL"
      }
    },
    update: {},
    create: {
      class_id: demoClass.id,
      subject_id: subject.id,
      teacher_id: admin.id,
      semester: "2026/2027-GANJIL"
    }
  });
  await prisma.enrollment.upsert({
    where: {
      student_id_class_id_academic_year_id: {
        student_id: admin.id,
        class_id: demoClass.id,
        academic_year_id: yearNow.id
      }
    },
    update: {},
    create: {
      student_id: admin.id,
      class_id: demoClass.id,
      academic_year_id: yearNow.id,
      status: EnrollmentStatus.ACTIVE
    }
  });

  await prisma.schoolProfile.update({
    where: { id: school.id },
    data: { current_academic_year_id: yearNow.id }
  });

  // 7. Landing page — konten sekolah (hero, tentang, piagam, kontak) + berita contoh.
  // Hanya menambah baris landing; TIDAK menyentuh user/password (ditangani seed lain).
  const LANDING_SECTIONS = [
    {
      slug: "hero",
      title: "Selamat Datang",
      subtitle: "Sekolah unggulan dengan teknologi digital",
      body: "Sistem Informasi Sekolah (SIS) dan Learning Management System (LMS) terpadu untuk mendukung pembelajaran, administrasi, dan pelayanan sekolah yang modern, transparan, dan akuntabel.",
      section_order: 0
    },
    {
      slug: "tentang",
      title: "Tentang Kami",
      subtitle: "Profil singkat sekolah",
      body: "Kami adalah sekolah yang berkomitmen mencetak generasi cerdas, berkarakter, dan siap menghadapi tantangan zaman. Kurikulum kami mengintegrasikan penguasaan ilmu pengetahuan, penguatan karakter, dan kecakapan digital agar setiap peserta didik berkembang optimal.",
      section_order: 10
    },
    {
      slug: "piagam",
      title: "Visi, Misi & Piagam Sekolah",
      subtitle: "Arah dan komitmen kami",
      body: "Visi:\nTerwujudnya peserta didik yang beriman, bertakwa, cerdas, terampil, mandiri, dan berwawasan lingkungan.\n\nMisi:\n1. Menyelenggarakan pembelajaran aktif, kreatif, dan menyenangkan.\n2. Menumbuhkan budaya literasi dan numerasi.\n3. Membangun karakter peserta didik melalui pembiasaan positif.\n4. Mengembangkan bakat dan minat peserta didik.\n5. Mewujudkan lingkungan sekolah yang sehat, hijau, dan ramah anak.",
      section_order: 20
    },
    {
      slug: "kontak",
      title: "Hubungi Kami",
      subtitle: "Informasi kontak sekolah",
      body: "Alamat: Jl. Pendidikan No. 1\nTelepon: 021-0000000\nEmail: info@openlms.local\nJam layanan: Senin–Jumat, 07.00–15.00 WIB",
      section_order: 40
    }
  ];
  for (const s of LANDING_SECTIONS) {
    await prisma.landingContent.upsert({
      where: { slug: s.slug },
      update: {
        title: s.title,
        subtitle: s.subtitle,
        body: s.body,
        section_order: s.section_order,
        is_published: true
      },
      create: {
        slug: s.slug,
        title: s.title,
        subtitle: s.subtitle,
        body: s.body,
        section_order: s.section_order,
        is_published: true,
        updated_by: admin.id
      }
    });
  }

  const LANDING_NEWS = [
    {
      title: "PPDB Tahun Ajaran 2026/2027 Resmi Dibuka",
      excerpt:
        "Pendaftaran peserta didik baru dibuka mulai 1 Maret 2026. Kuota terbatas, daftar segera!",
      slug: "ppdb-2026-2027-dibuka",
      body: "Pendaftaran peserta didik baru (PPDB) untuk Tahun Ajaran 2026/2027 resmi dibuka. Calon peserta didik dapat mendaftar secara daring melalui portal PPDB sekolah. Persiapkan dokumen yang dibutuhkan dan pantau jadwal seleksi secara berkala.",
      author: "Panitia PPDB",
      published_at: new Date("2026-03-01T02:00:00.000Z")
    },
    {
      title: "Pembelajaran Digital Dimulai dengan LMS",
      excerpt: "Sekolah mengadopsi openlms untuk pembelajaran dan administrasi terpadu.",
      slug: "pembelajaran-digital-lms",
      body: "Mulai semester ini, seluruh kegiatan pembelajaran daring, tugas, kuis, dan ujian dikelola melalui platform openlms. Guru dan siswa dapat mengakses materi kapan saja, dan orang tua dapat memantau perkembangan belajar anaknya.",
      author: "Tim IT Sekolah",
      published_at: new Date("2026-07-13T02:00:00.000Z")
    }
  ];
  for (const n of LANDING_NEWS) {
    await prisma.newsArticle.upsert({
      where: { slug: n.slug },
      update: {
        title: n.title,
        excerpt: n.excerpt,
        body: n.body,
        author: n.author,
        published_at: n.published_at,
        is_published: true
      },
      create: {
        title: n.title,
        slug: n.slug,
        excerpt: n.excerpt,
        body: n.body,
        author: n.author,
        published_at: n.published_at,
        is_published: true,
        updated_by: admin.id
      }
    });
  }

  const permissionTotal = await prisma.permission.count();
  const rolePermissionTotal = await prisma.rolePermission.count();
  const flagTotal = await prisma.featureFlag.count();
  const prodiTotal = await prisma.prodi.count();

  console.log("Seed selesai:");
  console.log(`- SchoolProfile: ${school.name}`);
  console.log(`- AcademicYear aktif: ${yearNow.code}`);
  console.log(`- SUPERADMIN dev: ${DEV_ADMIN.username} (password: "${DEV_ADMIN.devPassword}")`);
  console.log(`- FeatureFlag: ${flagTotal} flag`);
  console.log(`- Branding: openlms (config_version 1)`);
  console.log(`- Prodi: ${prodiTotal} jurusan (TKJ, RPL, TKR, AKL, MM, TSM)`);
  console.log(
    `- Permission: ${permissionTotal} | RolePermission: ${rolePermissionTotal} (baru: ${rolePermissionCount})`
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Seed gagal:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
