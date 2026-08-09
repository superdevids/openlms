# Database ERD — openlms Super-App (Prisma + PostgreSQL, Single-School)

**Versi:** 1.2
**Tanggal:** 8 Agustus 2026
**Status:** Final desain single-school (input: prd04 v4.2 [owner-v4.2] §16.3(g); menggantikan desain multi-tenant v1.0)
**Cakupan:** desain awal 61 entitas = 56 (v1.0) + FeatureFlag, AppFeatureSetting, AcademicYear, RolloverRun, Alumni — **diperbarui 2026-08-08: implementasi aktual 90 model + 62 enum** (lihat Catatan Pembaruan di bawah)
**Referensi konsisten:** `02-technical-architecture.md`, `04-api-contract.md`, `05-implementation-plan.md`

> **Catatan Pembaruan 2026-08-08:** skema implementasi kini berisi **90 model + 62
> enum** (`packages/database/prisma/schema.prisma`, diverifikasi dengan grep `^model `
> dan `^enum `). Daftar entitas di bawah merupakan desain awal 61 entitas; model
> tambahan hasil iterasi mencakup (tidak terbatas): payroll (JobPosition,
> PayrollComponent, SalaryStructure, PayrollPeriodConfig, PayrollRun, PayrollRunItem,
> Payslip), branding (`BrandingConfig`), landing (`LandingContent`, `NewsArticle`),
> onboarding (`UserOnboarding`), maintenance (`SystemStatus`), rbac-admin
> (`RoleDashboardConfig`), feature-flags (`FeatureFlag`, `AppFeatureSetting`),
> alumni (`Alumni`), rollover (`RolloverRun`, `RolloverItem`), queue/jobs
> (job state via `SystemStatus`/`ImportBatch`), dashboard-config, users-admin,
> audit (`AuditLog`), admin-stats, health. **Enum `Role` = 14 nilai**: SISWA, GURU,
> **BK** (rename `GURU_BK`), **KAPRODI**, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK,
> **AUDITOR**, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI,
> PENGUJI_EKSTERNAL. Migrasi terkait belum dieksekusi (lihat [riview04 Rv4-02]).

---

## 1. Ringkasan

- Strategi data: **skema tunggal untuk SATU sekolah** — TANPA kolom `school_id`, tanpa multi-tenant (prd04 §16.3(g) [owner-v4.2]).
- **RLS opsional** (defense-in-depth RBAC) — tanpa session var tenant; session var hanya `app.user_id`.
- **`SchoolProfile`** (sebelumnya `School`) = profil SATU sekolah; `User` = identitas login (auth in-house).
- **Entitas baru v1.1:** `FeatureFlag` & `AppFeatureSetting` (feature flags global oleh SUPERADMIN, prd04 §5.N), `AcademicYear`, `RolloverRun` & `Alumni` (rollover tahun ajaran).
- Konvensi field: `id String @id @default(cuid())`, `created_at DateTime @default(now())`, `updated_at DateTime @updatedAt` di semua tabel (tidak diulang di deskripsi tiap entitas).
- Enum dipakai langsung sebagai tipe Prisma (bagian 5).
- Entitas pendukung desain (di luar daftar PRD, ditandai ⚙): `ClassSubject`, `ScheduleEntry`, `ExamAttempt`, `Notification`.

---

## 2. Entitas v1 (17) + 2 ⚙ pendukung (ClassSubject, ScheduleEntry)

> Catatan penomoran: §2.1–2.19 berjumlah 19 subsection — 17 entitas PRD v1 + 2 entitas ⚙ pendukung desain (ClassSubject §2.6, ScheduleEntry §2.7). Total entitas dokumen = 61 (17 + 23 + 12 + 4 ⚙ + 5 baru).
>
> **Catatan v1.1:** semua tabel tidak lagi memuat `school_id` (single-school, prd04 §16.3(g)). Tabel yang memakai tahun ajaran kini mereferensi `AcademicYear` via `academic_year_id`.

### 2.1 SchoolProfile — tabel `school_profile` (profil SATU sekolah)

- `id: String @id`
- `npsn: String @unique` — nomor pokok sekolah nasional (validasi 8 digit)
- `nss: String?` — nomor statistik sekolah
- `name: String`
- `school_type: SchoolType` — SMA / SMK
- `address: String`, `phone: String?`, `email: String?`, `logo_url: String?`
- `current_academic_year_id: String?` (FK → AcademicYear) — tahun ajaran aktif
- `timezone: String @default("Asia/Jakarta")`
- `settings: Json?` — ambang alpa, format rapor, kode QR durasi, dsb.
- **Relasi:** 1-N `AcademicYear` (riwayat tahun ajaran); 1-N `UserRole`; 1-N `PpdbApplicant`; 1-N `DataRetentionPolicy`.
- **Catatan v1.1:** `status` (SchoolStatus), `subscription_plan`, `active_academic_year` DIHAPUS (single-school — tanpa billing/tenant; tahun ajaran kini via `AcademicYear`).

### 2.2 User — tabel `user` (identitas login, auth in-house)

- `id: String @id` — id internal (cuid), BUKAN id penyedia auth eksternal
- `email: String? @unique`
- `username: String? @unique` — login "Email atau Username" (prd04 §5.P)
- `password_hash: String` — Argon2id
- `must_change_password: Boolean @default(true)` — wajib ganti password saat login pertama
- `failed_login_attempts: Int @default(0)` — lockout 15 mnt setelah 5 gagal
- `full_name: String`
- `phone: String?`, `avatar_url: String?`
- `is_active: Boolean @default(true)`
- `last_login_at: DateTime?`
- `preferred_language: String? @default("id")`
- **Relasi:** 1-N `UserRole`; 1-N `ParentGuardian` (sebagai wali); 1-N `Notification`.

### 2.3 UserRole — tabel `user_role` (MAPPING — satu-satunya otoritas role)

- `id: String @id`
- `user_id: String` (FK → User)
- `role: Role` — enum Role (bagian 5)
- `status: MembershipStatus @default(INVITED)` — INVITED / ACTIVE / DISABLED
- `invited_by: String?` (FK → User), `joined_at: DateTime?`
- `@@unique([user_id, role])`
- **Relasi:** N-1 User; 1-N (sebagai "aktor") ke AuditLog.
- **Catatan v1.1:** `school_id` & `active_school` DIHAPUS (single-school, prd04 §4.3).

### 2.4 Class — tabel `class` (rombongan belajar)

- `name: String` — "X IPA 1"
- `grade_level: Int` — 10/11/12
- `academic_year_id: String` (FK → AcademicYear)
- `homeroom_teacher_id: String?` (FK → User) — wali kelas (scope override untuk role GURU)
- `is_active: Boolean @default(true)`
- **Relasi:** 1-N `Enrollment`, 1-N `ClassSubject`, 1-N `ScheduleEntry`, 1-N `Grade` (per kelas), 1-N `ExamSession` (sasaran).

### 2.5 Subject — tabel `subject` (mata pelajaran)

- `code: String` — "MAT-11", `name: String`
- `category: SubjectCategory` — WAJIB / PILIHAN / KEJURUAN (SMK)
- `is_competency_based: Boolean @default(false)` — penanda mapel dengan capaian kompetensi (Kurikulum Merdeka/SMK)
- `@@unique([code])`
- **Relasi:** 1-N `ClassSubject`, 1-N `Question` (bank soal per mapel), 1-N `Grade`.

### 2.6 ClassSubject ⚙ — tabel `class_subject` (guru mengajar mapel di kelas)

- `class_id: String` (FK → Class), `subject_id: String` (FK → Subject)
- `teacher_id: String` (FK → User) — guru pengampu
- `semester: String` — "GANJIL"/"GENAP" atau "2026/2027-GANJIL"
- `@@unique([class_id, subject_id, semester])`
- **Relasi:** N-1 Class; N-1 Subject; N-1 User; 1-N `Assignment` (tugas per kelas-mapel), 1-N `Material`.

### 2.7 ScheduleEntry ⚙ — tabel `schedule_entry` (jadwal pelajaran)

- `class_id: String` (FK → Class), `subject_id: String` (FK → Subject)
- `teacher_id: String` (FK → User)
- `day_of_week: Int` (1–7), `start_period: Int`, `end_period: Int`
- `room: String?`
- `academic_year: String` — denormalisasi dari Class→AcademicYear saat tulis (filter historis jadwal)
- **Relasi:** N-1 Class; N-1 Subject; N-1 User.

### 2.8 Enrollment — tabel `enrollment` (siswa dalam kelas)

- `student_id: String` (FK → User)
- `class_id: String` (FK → Class)
- `academic_year_id: String` (FK → AcademicYear)
- `status: EnrollmentStatus @default(ACTIVE)` — ACTIVE / TRANSFERRED / GRADUATED / DROPPED / PROMOTED / REPEATED (PROMOTED/REPEATED hasil rollover tahun lama)
- `@@unique([student_id, class_id, academic_year_id])`
- **Relasi:** N-1 User (siswa); N-1 Class; N-1 AcademicYear; 1-N `Grade`, 1-N `AttendanceRecord`.

### 2.9 Material — tabel `material` (materi pembelajaran)

- `class_subject_id: String` (FK → ClassSubject)
- `title: String`, `description: String?`
- `type: MaterialType` — DOCUMENT / VIDEO / LINK
- `content_url: String` — path di bucket `materials`
- `file_size: Int?`, `is_published: Boolean @default(false)`
- `created_by: String` (FK → User)
- **Relasi:** N-1 ClassSubject; N-1 User.

### 2.10 Assignment — tabel `assignment` (tugas)

- `class_subject_id: String` (FK → ClassSubject)
- `title: String`, `instructions: String?`
- `due_at: DateTime`, `allow_late: Boolean @default(false)`
- `max_score: Int @default(100)`
- `attachment_url: String?`
- `status: AssignmentStatus @default(DRAFT)` — DRAFT / PUBLISHED / CLOSED
- **Relasi:** 1-N `Submission`; N-1 ClassSubject.

### 2.11 Submission — tabel `submission` (jawaban tugas siswa)

- `assignment_id: String` (FK → Assignment)
- `student_id: String` (FK → User)
- `content: String?` (teks), `attachment_url: String?` (bucket `submissions`)
- `submitted_at: DateTime?`
- `status: SubmissionStatus @default(DRAFT)` — DRAFT / SUBMITTED / LATE / GRADED / RETURNED
- `score: Int?`, `feedback: String?`, `graded_by: String?` (FK → User), `graded_at: DateTime?`
- `@@unique([assignment_id, student_id])`
- **Relasi:** N-1 Assignment; N-1 User (siswa); N-1 User (graded_by).

### 2.12 Quiz — tabel `quiz` (kuis harian)

- `class_subject_id: String` (FK → ClassSubject)
- `title: String`, `description: String?`
- `duration_min: Int`, `open_at: DateTime?`, `close_at: DateTime?`
- `shuffle_questions: Boolean @default(false)`
- `status: AssessmentStatus @default(DRAFT)` — DRAFT / PUBLISHED / ONGOING / CLOSED
- `created_by: String` (FK → User)
- **Relasi:** 1-N `Question` (via bank soal atau kuis), 1-N `QuizAttempt`.

### 2.13 Question — tabel `question` (bank soal, dipakai kuis & ujian)

- `subject_id: String?` (FK → Subject) — untuk bank soal per mapel
- `quiz_id: String?` (FK → Quiz), `exam_package_id: String?` (FK → ExamPackage) — relasi opsional; soal bisa milik bank dan dipilih ke paket
- `type: QuestionType` — PILIHAN_GANDA / ESAI / ISIAN_SINGKAT / MENJODOHKAN
- `text: String`, `options: Json?` — array opsi untuk PG/menjodohkan
- `correct_answer: String?` — kunci PG/isian (hash opsional untuk keamanan)
- `explanation: String?`
- `difficulty: Difficulty` — MUDAH / SEDANG / SULIT
- `tags: String[]` — bab, kompetensi
- **Relasi:** N-1 Subject; N-1 Quiz; N-1 ExamPackage; 1-N `ExamAnswerLog` (referensi soal).

### 2.14 QuizAttempt — tabel `quiz_attempt`

- `quiz_id: String` (FK → Quiz), `student_id: String` (FK → User)
- `started_at: DateTime`, `submitted_at: DateTime?`
- `status: AttemptStatus @default(IN_PROGRESS)` — IN_PROGRESS / SUBMITTED / AUTO_SUBMITTED / EXPIRED
- `score: Int?`, `answers: Json?`
- **Relasi:** N-1 Quiz; N-1 User.

### 2.15 Attendance — tabel `attendance` (absensi manual v1, dipertahankan)

- `class_subject_id: String?` (FK → ClassSubject) — konteks mapel; null = harian
- `student_id: String` (FK → User), `recorded_by: String` (FK → User)
- `date: DateTime` (diindex)
- `status: AttendanceStatus` — HADIR / IZIN / SAKIT / ALPA / TERLAMBAT
- `note: String?`
- `method: AttendanceMethod @default(MANUAL)` — MANUAL / QR_CODE / GEOFENCING
- `@@unique([student_id, class_subject_id, date])`
- **Relasi:** N-1 User (siswa); N-1 User (recorded_by); N-1 ClassSubject.

### 2.16 Grade — tabel `grade` (nilai)

- `student_id: String` (FK → User), `class_subject_id: String` (FK → ClassSubject)
- `semester: String`
- `academic_year: String` — denormalisasi dari ClassSubject→Class saat tulis; dipakai filter historis
- `type: GradeType` — TUGAS / KUIS / UJIAN / PRAKTIK / SIKAP / SUMATIF
- `source_id: String?` — referensi Assignment/Quiz/ExamAttempt (polymorphic via string)
- `score: Int`, `weight: Int @default(1)`, `note: String?`
- `@@unique([student_id, class_subject_id, semester, type, source_id])`
- **Relasi:** N-1 User; N-1 ClassSubject.

### 2.17 Invoice — tabel `invoice` (tagihan)

- `student_id: String` (FK → User)
- `invoice_no: String` — nomor unik
- `type: InvoiceType` — SPP / UANG_KEGIATAN / UANG_DAFTAR / UANG_SERAGAM / LAINNYA
- `period: String?` — "2026-08" untuk SPP bulanan
- `amount: Decimal(12,2)`, `discount: Decimal(12,2) @default(0)`
- `due_date: DateTime`, `status: PaymentStatus @default(PENDING)`
- `academic_year: String` — denormalisasi saat tulis; dipakai filter historis
- `original_invoice_id: String?` (FK → Invoice) — tagihan carry-over dari tahun ajaran lama (M-ROLLOVER-T6)
- `carried_to_academic_year: String?` — tahun ajaran tujuan carry-over
- `carry_over_note: String?` — catatan carry-over (denda/grace window)
- `created_by: String` (FK → User)
- `@@unique([invoice_no])`
- **Relasi:** 1-N `Payment`; N-1 User (siswa); N-1 Invoice (original_invoice_id — self-relasi carry-over).

### 2.18 Payment — tabel `payment`

- `invoice_id: String` (FK → Invoice)
- `amount: Decimal(12,2)`, `method: PaymentMethod` — TUNAI / TRANSFER / LAINNYA
- `proof_url: String?` (bucket `payment-proofs`), `note: String?`
- `paid_at: DateTime?`, `verified_by: String?` (FK → User), `verified_at: DateTime?`
- `status: PaymentStatus @default(PENDING)` — PENDING / PAID / PARTIAL / OVERDUE / CANCELLED / REFUNDED / CARRIED_OVER
- **Relasi:** N-1 Invoice; N-1 User (verified_by).

### 2.19 PpdbApplicant — tabel `ppdb_applicant` (pendaftar siswa baru)

- `registration_no: String` — nomor pendaftaran
- `full_name: String`, `nisn: String?`, `birth_date: DateTime`, `birth_place: String`
- `gender: Gender` — L / P
- `origin_school: String?`, `phone: String`, `email: String?`
- `parent_name: String`, `parent_phone: String`
- `status: PpdbStatus @default(SUBMITTED)` — DRAFT / SUBMITTED / VERIFIED / REJECTED / SELECTED / WAITLIST / ENROLLED
- `documents: Json?` — daftar {type, url} di bucket `ppdb-documents`
- `selection_score: Int?` — hasil seleksi (manual/kriteria)
- `user_id: String?` (FK → User) — akun siswa aktif setelah ENROLLED
- `consent_id: String?` (FK → ParentalConsent)
- **Relasi:** N-1 SchoolProfile; N-1 User (user_id, setelah lolos).

---

## 3. Entitas v2 (23)

### 3.1 Exam — tabel `exam` (ujian resmi: PTS/PAS/PAT/Ujian Sekolah)

- `title: String`, `description: String?`
- `type: ExamType` — PTS / PAS / PAT / UJIAN_SEKOLAH / UKK / LAINNYA
- `subject_id: String` (FK → Subject)
- `duration_min: Int`
- `status: AssessmentStatus @default(DRAFT)` — DRAFT / PUBLISHED / ONGOING / CLOSED / ARCHIVED
- `created_by: String` (FK → User)
- **Relasi:** 1-N `ExamPackage`, 1-N `ExamSession`.

### 3.2 ExamPackage — tabel `exam_package` (paket soal A/B/C)

- `exam_id: String` (FK → Exam)
- `name: String` — "Paket A"
- `total_score: Int @default(100)`
- `shuffle_options: Boolean @default(true)`
- **Relasi:** N-1 Exam; N-M `Question` (relasi join via `Question.exam_package_id`); 1-N `ExamAttempt` (paket yang diterima siswa).

### 3.3 ExamSession — tabel `exam_session` (jadwal/sesi ujian)

- `exam_id: String` (FK → Exam)
- `name: String` — "Shift 1"
- `starts_at: DateTime`, `ends_at: DateTime`
- `target_class_id: String?` (FK → Class) — null = seluruh angkatan
- `room: String?` (fisik/virtual)
- `is_serentak: Boolean @default(true)` — pembuka akses otomatis sesuai jadwal
- `access_token: String? @unique` — token ujian sesi: **6 karakter alfanumerik uppercase tanpa karakter ambigu (hapus 0, O, 1, I)**; disimpan ter-hash (SHA-256) saat generate; diisi via POST /exam/sessions/:id/token
- `token_expires_at: DateTime?` — default = `ends_at` sesi; regenerate oleh pengawas meng-invalidasi token lama
- `token_generated_by: String?` (FK → User) — pengawas/panitia yang generate
- **Relasi:** N-1 Exam; N-1 Class; 1-N `ExamAttempt`.
- **Catatan penting:** token ujian TIDAK boleh di-reuse dari `AttendanceQrToken` — mekanisme, format (6 karakter vs QR), dan masa berlaku (sesi vs 5–10 menit) terpisah; validasi "sekali pakai" dijamin `ExamAttempt.token_used` + unique `(exam_session_id, student_id)` + status `IN_PROGRESS` (satu akun satu sesi).

### 3.4 ExamAttempt ⚙ — tabel `exam_attempt` (sesi jawab siswa)

- `exam_session_id: String` (FK → ExamSession)
- `student_id: String` (FK → User)
- `exam_package_id: String` (FK → ExamPackage)
- `token_used: String` — token sesi yang dipakai
- `started_at: DateTime`, `submitted_at: DateTime?`
- `status: AttemptStatus` — IN_PROGRESS / SUBMITTED / AUTO_SUBMITTED / EXPIRED / FLAGGED
- `score_auto: Int?` (skor otomatis PG/isian), `score_manual: Int?` (esai)
- `device_info: Json?`, `ip_address: String?`
- `@@unique([exam_session_id, student_id])`
- **Relasi:** N-1 ExamSession; N-1 User; N-1 ExamPackage; 1-N `ExamAnswerLog`.

### 3.5 ExamAnswerLog — tabel `exam_answer_log` (append-only, auditability prd02 §2.3)

- `attempt_id: String` (FK → ExamAttempt)
- `question_id: String` (FK → Question)
- `answer: String?`, `is_auto_saved: Boolean @default(false)`
- `saved_at: DateTime` (server time, bukan client)
- `idempotency_key: String?` — untuk autosave idempotent
- **Relasi:** N-1 ExamAttempt; N-1 Question.

### 3.6 AttendanceSession — tabel `attendance_session` (sesi absensi QR/geofencing)

- `class_subject_id: String?` (FK → ClassSubject) — null = sesi harian gerbang
- `title: String` — "Absensi Matematika XI IPA 1"
- `method: AttendanceMethod` — QR_CODE / GEOFENCING / MANUAL
- `starts_at: DateTime`, `ends_at: DateTime`
- `created_by: String` (FK → User)
- **Relasi:** 1-N `AttendanceQrToken`; 1-N `AttendanceRecord`.

### 3.7 AttendanceQrToken — tabel `attendance_qr_token` (token sekali pakai)

- `attendance_session_id: String` (FK → AttendanceSession)
- `token: String @unique` — hash token QR
- `expires_at: DateTime` (5–10 menit, prd02 §3.1)
- `used_at: DateTime?`, `used_by: String?` (FK → User) — sekali pakai
- **Relasi:** N-1 AttendanceSession.

### 3.8 AttendanceRecord — tabel `attendance_record` (hasil scan/check-in)

- `attendance_session_id: String` (FK → AttendanceSession)
- `student_id: String` (FK → User)
- `recorded_at: DateTime` (server time)
- `method: AttendanceMethod`, `status: AttendanceStatus @default(HADIR)`
- `latitude: Decimal?`, `longitude: Decimal?` (geofencing)
- `idempotency_key: String?` (queue offline, G10)
- `@@unique([attendance_session_id, student_id])`
- **Relasi:** N-1 AttendanceSession; N-1 User.

### 3.9 CounselingNote — tabel `counseling_note` (BK — akses super ketat, G14)

- `student_id: String` (FK → User)
- `counselor_id: String` (FK → User) — guru BK
- `date: DateTime`, `topic: String`, `note: String` (field-level access: hanya BK/WAKEPSEK/KEPSEK)
- `follow_up: String?`, `is_confidential: Boolean @default(true)`
- **Relasi:** N-1 User (siswa); N-1 User (counselor).

### 3.10 DisciplinePoint — tabel `discipline_point` (katalog pelanggaran & poin)

- `code: String`, `description: String`
- `points: Int`, `severity: DisciplineSeverity` — RINGAN / SEDANG / BERAT
- **Relasi:** 1-N `DisciplineRecord`.

### 3.11 DisciplineRecord — tabel `discipline_record` (pelanggaran siswa)

- `student_id: String` (FK → User), `point_id: String` (FK → DisciplinePoint)
- `recorded_by: String` (FK → User), `date: DateTime`
- `note: String?`, `parent_notified: Boolean @default(false)`
- **Relasi:** N-1 User (siswa); N-1 DisciplinePoint; N-1 User (recorded_by).

### 3.12 Extracurricular — tabel `extracurricular` (ekskul)

- `name: String`, `description: String?`, `coach_id: String?` (FK → User)
- `schedule: Json?` — { day, time }[]
- **Relasi:** 1-N `ExtracurricularEnrollment`, 1-N `Achievement`.

### 3.13 ExtracurricularEnrollment — tabel `extracurricular_enrollment`

- `extracurricular_id: String` (FK → Extracurricular), `student_id: String` (FK → User)
- `status: EnrollmentStatus @default(ACTIVE)`
- `@@unique([extracurricular_id, student_id])`
- **Relasi:** N-1 Extracurricular; N-1 User.

### 3.14 Achievement — tabel `achievement` (prestasi/piagam)

- `student_id: String` (FK → User)
- `extracurricular_id: String?` (FK → Extracurricular)
- `title: String`, `level: AchievementLevel` — SEKOLAH / KABUPATEN / PROVINSI / NASIONAL / INTERNASIONAL
- `date: DateTime`, `certificate_url: String?`
- **Relasi:** N-1 User; N-1 Extracurricular.

### 3.15 Staff — tabel `staff` (data induk guru & staf)

- `user_id: String?` (FK → User) — terhubung akun; null jika belum dibuatkan akun
- `nip: String?`, `employee_no: String?`
- `position: String` — GURU / OPERATOR / KEUANGAN / BK / KEPSEK / WAKEPSEK / LAINNYA
- `education: String?`, `certification: String?` (sertifikasi guru)
- `hire_date: DateTime?`, `status: StaffStatus @default(ACTIVE)`
- **Relasi:** N-1 User; 1-N `StaffAttendance`.

### 3.16 StaffAttendance — tabel `staff_attendance`

- `staff_id: String` (FK → Staff)
- `date: DateTime`, `check_in_at: DateTime?`, `check_out_at: DateTime?`
- `status: AttendanceStatus`, `method: AttendanceMethod`, `note: String?`
- `@@unique([staff_id, date])`
- **Relasi:** N-1 Staff.

### 3.17 Asset — tabel `asset` (inventaris)

- `code: String`, `name: String`, `category: AssetCategory` — RUANG / LAB / ALAT / LAINNYA
- `condition: AssetCondition` — BAIK / RUSAK_RINGAN / RUSAK_BERAT / MAINTENANCE
- `status: AssetStatus @default(AVAILABLE)` — AVAILABLE / BOOKED / MAINTENANCE / RETIRED
- `quantity: Int @default(1)`, `location: String?`
- **Relasi:** 1-N `AssetBooking`.

### 3.18 AssetBooking — tabel `asset_booking` (peminjaman ruang/alat)

- `asset_id: String` (FK → Asset), `booked_by: String` (FK → User)
- `start_at: DateTime`, `end_at: DateTime`, `purpose: String`
- `status: BookingStatus` — PENDING / APPROVED / REJECTED / CANCELLED / COMPLETED
- `approved_by: String?` (FK → User)
- **Relasi:** N-1 Asset; N-1 User.

### 3.19 LibraryBook — tabel `library_book` (katalog)

- `isbn: String?`, `title: String`, `author: String`, `publisher: String?`
- `category: String?`, `total_copies: Int @default(1)`, `available_copies: Int @default(1)`
- **Relasi:** 1-N `LibraryLoan`.

### 3.20 LibraryLoan — tabel `library_loan`

- `book_id: String` (FK → LibraryBook), `student_id: String` (FK → User)
- `borrowed_at: DateTime`, `due_at: DateTime`, `returned_at: DateTime?`
- `status: LibraryLoanStatus` — BORROWED / RETURNED / OVERDUE / LOST
- **Relasi:** N-1 LibraryBook; N-1 User.

### 3.21 Announcement — tabel `announcement` (pengumuman sekolah)

- `title: String`, `body: String`
- `target_role: Role[]` — broadcast ke role tertentu
- `pinned: Boolean @default(false)`, `published_at: DateTime?`
- `created_by: String` (FK → User)
- **Relasi:** N-1 User.

### 3.22 OfficialLetter — tabel `official_letter` (surat-menyurat)

- `letter_no: String?`, `type: LetterType` — KETERANGAN / IZIN / UNDANGAN / LAINNYA
- `subject: String`, `body: String`
- `status: LetterStatus` — DRAFT / SUBMITTED / APPROVED / REJECTED / SIGNED
- `requester_id: String` (FK → User), `approver_id: String?` (FK → User)
- `document_url: String?` (bucket `official-letters`), `signed_url: String?`
- **Relasi:** N-1 User (requester); N-1 User (approver).

### 3.23 ParentGuardian — tabel `parent_guardian`

- `user_id: String?` (FK → User) — akun portal wali murid; null jika hanya data kontak
- `full_name: String`, `phone: String`, `email: String?`
- **Relasi:** 1-N `ParentStudentLink`.

### 3.24 ParentStudentLink — tabel `parent_student_link`

- `parent_id: String` (FK → ParentGuardian), `student_id: String` (FK → User)
- `relationship: String` — AYAH / IBU / WALI
- `@@unique([parent_id, student_id])`
- **Relasi:** N-1 ParentGuardian; N-1 User.

### 3.25 Notification ⚙ — tabel `notification` (pusat notifikasi per user)

- `id: String @id`
- `user_id: String` (FK → User) — penerima
- `type: NotificationType` — enum NotificationType (bagian 5)
- `title: String`, `body: String`
- `data: Json?` — payload kontekstual (assignmentId, invoiceId, dsb.)
- `read_at: DateTime?` — null = belum dibaca
- `created_at: DateTime @default(now())` (tanpa `updated_at` — log-like)
- `@@index([user_id, read_at, created_at])` — inbox per user (hot)
- `@@index([type, created_at])` — broadcast/rekap per tipe (v1.1, menggantikan index berbasis sekolah)
- **Relasi:** N-1 User (penerima).
- **Catatan v1.1:** relasi ke School DIHAPUS (single-school). Ditulis oleh **CommunicationModule/RealtimeModule** (lihat 02-technical-architecture §4.1) + Socket.IO; dipakai oleh event `notification:new` (02-technical-architecture §7.2).

---

## 4. Entitas v3 (12) + 5 baru v1.1

### 4.1 Internship — tabel `internship` (PKL/Prakerin, G1)

- `student_id: String` (FK → User)
- `partner_id: String` (FK → InternshipPartner)
- `academic_year_id: String` (FK → AcademicYear), `start_date: DateTime`, `end_date: DateTime`
- `school_mentor_id: String?` (FK → User) — guru pembimbing
- `industry_mentor_id: String?` (FK → IndustryMentor)
- `status: InternshipStatus` — PLACED / ONGOING / COMPLETED / TERMINATED
- **Relasi:** N-1 User; N-1 InternshipPartner; N-1 IndustryMentor; N-1 AcademicYear; 1-N `InternshipJournal`.

### 4.2 InternshipJournal — tabel `internship_journal` (jurnal harian PKL)

- `internship_id: String` (FK → Internship)
- `entry_date: DateTime`, `activity: String`, `note: String?`
- `verified_by_mentor: Boolean @default(false)`
- **Relasi:** N-1 Internship.

### 4.3 InternshipPartner — tabel `internship_partner` (mitra DUDI)

- `name: String`, `industry_type: String?`, `address: String?`, `contact_person: String?`, `phone: String?`
- `agreement_year: String?` — riwayat kerja sama per tahun
- **Relasi:** 1-N `Internship`; 1-N `IndustryMentor`.

### 4.4 IndustryMentor — tabel `industry_mentor` (pembimbing industri)

- `partner_id: String` (FK → InternshipPartner)
- `user_id: String?` (FK → User) — akun khusus non-guru (role PEMBIMBING_INDUSTRI)
- `full_name: String`, `position: String?`, `phone: String?`
- **Relasi:** N-1 InternshipPartner; N-1 User; 1-N `Internship`.

### 4.5 CompetencyTest — tabel `competency_test` (UKK, G1)

- `title: String`, `competency_standard: String` — standar kejuruan
- `student_id: String` (FK → User)
- `examiner_id: String?` (FK → User) — penguji (internal/eksternal, role PENGUJI_EKSTERNAL)
- `scheduled_at: DateTime?`, `status: CompetencyTestStatus` — SCHEDULED / ONGOING / GRADED / PASSED / FAILED
- `final_score: Int?`, `certificate_url: String?`
- **Relasi:** N-1 User (siswa); N-1 User (examiner); 1-N `CompetencyRubricItem` (hasil penilaian).

### 4.6 CompetencyRubricItem — tabel `competency_rubric_item` (checklist kompetensi)

- `competency_test_id: String` (FK → CompetencyTest)
- `criterion: String` — aspek kompetensi
- `max_score: Int`, `score: Int?` (diisi penguji)
- `comment: String?`
- **Relasi:** N-1 CompetencyTest.

### 4.7 DataExportLog — tabel `data_export_log` (jejak ekspor Dapodik/ANBK, G4)

- `export_type: ExportType` — DAPODIK / ANBK / RAPOR / NILAI
- `requested_by: String` (FK → User)
- `status: JobStatus` — PENDING / PROCESSING / COMPLETED / FAILED
- `file_url: String?` (bucket `exports`), `record_count: Int?`
- `started_at: DateTime?`, `finished_at: DateTime?`
- **Relasi:** N-1 User.

### 4.8 DataRetentionPolicy — tabel `data_retention_policy` (G12)

- `entity: String` — "student", "attendance", "counseling_note", dst.
- `retention_months: Int` — mis. 60 bulan (5 tahun, prd03 §4.2)
- `action: RetentionAction` — ARCHIVE / DELETE / ANONYMIZE
- `enabled: Boolean @default(true)`
- **Relasi:** N-1 SchoolProfile.

### 4.9 ParentalConsent — tabel `parental_consent` (G13)

- `student_id: String?` (FK → User) — siswa aktif; null saat PPDB (belum jadi User)
- `ppdb_applicant_id: String?` (FK → PpdbApplicant)
- `parent_name: String`, `consent_type: ConsentType` — DATA_CHILD / PUBLICATION / MEDICAL
- `status: ConsentStatus` — GRANTED / REVOKED / EXPIRED
- `granted_at: DateTime`, `revoked_at: DateTime?`
- `document_url: String?` (scan tanda tangan)
- **Relasi:** N-1 User (student); N-1 PpdbApplicant.

### 4.10 ImportBatch — tabel `import_batch` (migrasi data G9)

- `import_type: ImportType` — STUDENT / TEACHER / CLASS / ASSIGNMENT
- `filename: String`, `status: JobStatus` — PENDING / PROCESSING / COMPLETED / FAILED
- `total_rows: Int?`, `success_rows: Int?`, `failed_rows: Int?`
- `imported_by: String` (FK → User), `started_at: DateTime?`, `finished_at: DateTime?`
- **Relasi:** 1-N `ImportError`; N-1 User.

### 4.11 ImportError — tabel `import_error`

- `import_batch_id: String` (FK → ImportBatch)
- `row_number: Int`, `field: String?`, `message: String`, `raw_row: Json?`
- **Relasi:** N-1 ImportBatch.

### 4.12 AuditLog — tabel `audit_log` (audit trail generik, G14 — menggantikan audit parsial v1–v2)

- `actor_id: String?` (FK → User), `actor_role: Role?`
- `action: AuditAction` — CREATE / UPDATE / DELETE / VIEW / EXPORT / LOGIN / LOCKOUT
- `entity: String`, `entity_id: String`
- `before: Json?`, `after: Json?` — snapshot ringkas
- `ip_address: String?`, `created_at: DateTime @default(now())`
- **Relasi:** N-1 User (actor).

### 4.13 FeatureFlag — tabel `feature_flag` (global — saklar fitur aplikasi, prd04 §5.N)

- `id: String @id`
- `key: String @unique` — mis. "LMS_BASE", "LMS_EXAM", "PAYROLL", "LMS_LIVE_CLASS"
- `kategori: String` — LMS / AKADEMIK / KESISWAAN / KEUANGAN / PLATFORM / SMK / dsb.
- `deskripsi: String`
- `default_enabled: Boolean @default(false)`
- `config_schema: Json?` — skema konfigurasi per flag (mis. radius geofence, provider gateway)
- `locked: Boolean @default(false)` — fitur DITUNDA dikunci agar tidak bisa diaktifkan
- `is_system: Boolean @default(false)` — flag inti (mis. LMS_BASE) tidak bisa dimatikan
- **Relasi:** 1-N `AppFeatureSetting`.
- **Catatan:** dikelola SUPERADMIN (admin sistem sekolah); perubahan dicatat di `AuditLog`.

### 4.14 AppFeatureSetting — tabel `app_feature_setting` (nilai flag per aplikasi)

- `id: String @id`
- `feature_key: String` (FK → FeatureFlag.key) — relasi 1-1 via key unik
- `enabled: Boolean @default(true)`
- `config: Json?`
- `updated_by: String?` (FK → User)
- `updated_at: DateTime @updatedAt`
- `@@unique([feature_key])`
- **Relasi:** N-1 FeatureFlag; N-1 User (updated_by).
- **Catatan:** pengganti toggle per sekolah (tanpa dimensi sekolah); tiap perubahan di-log di `AuditLog`.

### 4.15 AcademicYear — tabel `academic_year` (tahun ajaran, v1.1)

- `id: String @id`
- `code: String @unique` — mis. "2026/2027"
- `name: String` — mis. "Tahun Ajaran 2026/2027"
- `start_date: DateTime`, `end_date: DateTime`
- `status: AcademicYearStatus @default(DRAFT)` — DRAFT / OPEN / CLOSING / CLOSED
- `created_by: String?` (FK → User)
- **Relasi:** 1-N `Class`; 1-N `Enrollment`; 1-N `Internship`; 1-N `RolloverRun`; 1-N `Alumni` (tahun kelulusan).
- **Catatan:** riwayat tahun ajaran direferensikan dari `SchoolProfile.current_academic_year_id`.

### 4.16 RolloverRun — tabel `rollover_run` (rollover tahun ajaran, v1.1)

- `id: String @id`
- `academic_year_id: String` (FK → AcademicYear) — tahun yang ditutup/di-rollover
- `new_academic_year_id: String?` (FK → AcademicYear) — tahun baru hasil rollover
- `status: RolloverRunStatus @default(DRAFT)` — DRAFT / PREVIEW / RUNNING / DONE / ROLLED_BACK / FAILED
- `precheck_result: Json?` — hasil pre-check sebelum eksekusi
- `summary: Json?` — ringkasan eksekusi
- `step_state: Json?` — state per langkah (untuk resume)
- `executed_by: String?` (FK → User), `executed_at: DateTime?`
- `rolled_back_by: String?` (FK → User), `rolled_back_at: DateTime?`, `rollback_reason: String?`
- `idempotency_key: String @unique` — cegah eksekusi ganda
- `@@unique([academic_year_id])`
- **Relasi:** N-1 AcademicYear (academic_year_id); N-1 AcademicYear (new_academic_year_id); N-1 User (executed_by/rolled_back_by).

### 4.17 Alumni — tabel `alumni` (lulusan — hasil rollover/kelulusan, v1.1)

- `id: String @id`
- `student_id: String` (FK → User) — siswa yang lulus
- `graduation_academic_year_id: String` (FK → AcademicYear) — tahun ajaran kelulusan
- `final_nisn: String?` — NISN terakhir saat lulus
- `graduation_date: DateTime?` — tanggal kelulusan
- `status: AlumniStatus @default(ACTIVE)` — ACTIVE / ARCHIVED
- `@@index([graduation_academic_year_id])` — filter alumni per angkatan
- **Relasi:** N-1 User (student); N-1 AcademicYear (graduation_academic_year_id).

---

## 5. Enum Values

| Enum                   | Nilai                                                                                                                                                                                                             |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Role`                 | SISWA, GURU, BK, KAPRODI, KEUANGAN, OPERATOR, WAKEPSEK, KEPSEK, AUDITOR, SUPERADMIN, CALON_SISWA, WALI_MURID, PEMBIMBING_INDUSTRI, PENGUJI_EKSTERNAL                                                              |
| `SchoolType`           | SMA, SMK                                                                                                                                                                                                          |
| `MembershipStatus`     | INVITED, ACTIVE, DISABLED                                                                                                                                                                                         |
| `SubjectCategory`      | WAJIB, PILIHAN, KEJURUAN                                                                                                                                                                                          |
| `EnrollmentStatus`     | ACTIVE, TRANSFERRED, GRADUATED, DROPPED, PROMOTED, REPEATED                                                                                                                                                       |
| `MaterialType`         | DOCUMENT, VIDEO, LINK                                                                                                                                                                                             |
| `AssignmentStatus`     | DRAFT, PUBLISHED, CLOSED                                                                                                                                                                                          |
| `SubmissionStatus`     | DRAFT, SUBMITTED, LATE, GRADED, RETURNED                                                                                                                                                                          |
| `QuestionType`         | PILIHAN_GANDA, ESAI, ISIAN_SINGKAT, MENJODOHKAN                                                                                                                                                                   |
| `Difficulty`           | MUDAH, SEDANG, SULIT                                                                                                                                                                                              |
| `AssessmentStatus`     | DRAFT, PUBLISHED, ONGOING, CLOSED, ARCHIVED                                                                                                                                                                       |
| `AttemptStatus`        | IN_PROGRESS, SUBMITTED, AUTO_SUBMITTED, EXPIRED, FLAGGED                                                                                                                                                          |
| `AttendanceStatus`     | HADIR, IZIN, SAKIT, ALPA, TERLAMBAT                                                                                                                                                                               |
| `AttendanceMethod`     | MANUAL, QR_CODE, GEOFENCING, RFID (cadangan)                                                                                                                                                                      |
| `GradeType`            | TUGAS, KUIS, UJIAN, PRAKTIK, SIKAP, SUMATIF                                                                                                                                                                       |
| `InvoiceType`          | SPP, UANG_KEGIATAN, UANG_DAFTAR, UANG_SERAGAM, LAINNYA                                                                                                                                                            |
| `PaymentStatus`        | PENDING, PAID, PARTIAL, OVERDUE, CANCELLED, REFUNDED, CARRIED_OVER                                                                                                                                                |
| `PaymentMethod`        | TUNAI, TRANSFER, LAINNYA                                                                                                                                                                                          |
| `Gender`               | L, P                                                                                                                                                                                                              |
| `PpdbStatus`           | DRAFT, SUBMITTED, VERIFIED, REJECTED, SELECTED, WAITLIST, ENROLLED                                                                                                                                                |
| `ExamType`             | PTS, PAS, PAT, UJIAN_SEKOLAH, UKK, LAINNYA                                                                                                                                                                        |
| `DisciplineSeverity`   | RINGAN, SEDANG, BERAT                                                                                                                                                                                             |
| `AchievementLevel`     | SEKOLAH, KABUPATEN, PROVINSI, NASIONAL, INTERNASIONAL                                                                                                                                                             |
| `StaffStatus`          | ACTIVE, INACTIVE, RESIGNED                                                                                                                                                                                        |
| `AssetCategory`        | RUANG, LAB, ALAT, LAINNYA                                                                                                                                                                                         |
| `AssetCondition`       | BAIK, RUSAK_RINGAN, RUSAK_BERAT, MAINTENANCE                                                                                                                                                                      |
| `AssetStatus`          | AVAILABLE, BOOKED, MAINTENANCE, RETIRED                                                                                                                                                                           |
| `BookingStatus`        | PENDING, APPROVED, REJECTED, CANCELLED, COMPLETED                                                                                                                                                                 |
| `LibraryLoanStatus`    | BORROWED, RETURNED, OVERDUE, LOST                                                                                                                                                                                 |
| `LetterType`           | KETERANGAN, IZIN, UNDANGAN, LAINNYA                                                                                                                                                                               |
| `LetterStatus`         | DRAFT, SUBMITTED, APPROVED, REJECTED, SIGNED                                                                                                                                                                      |
| `InternshipStatus`     | PLACED, ONGOING, COMPLETED, TERMINATED                                                                                                                                                                            |
| `CompetencyTestStatus` | SCHEDULED, ONGOING, GRADED, PASSED, FAILED                                                                                                                                                                        |
| `ExportType`           | DAPODIK, ANBK, RAPOR, NILAI                                                                                                                                                                                       |
| `RetentionAction`      | ARCHIVE, DELETE, ANONYMIZE                                                                                                                                                                                        |
| `ConsentType`          | DATA_CHILD, PUBLICATION, MEDICAL                                                                                                                                                                                  |
| `ConsentStatus`        | GRANTED, REVOKED, EXPIRED                                                                                                                                                                                         |
| `ImportType`           | STUDENT, TEACHER, CLASS, ASSIGNMENT                                                                                                                                                                               |
| `JobStatus`            | PENDING, PROCESSING, COMPLETED, FAILED                                                                                                                                                                            |
| `AuditAction`          | CREATE, UPDATE, DELETE, VIEW, EXPORT, LOGIN, LOCKOUT                                                                                                                                                              |
| `AcademicYearStatus`   | DRAFT, OPEN, CLOSING, CLOSED                                                                                                                                                                                      |
| `RolloverRunStatus`    | DRAFT, PREVIEW, RUNNING, DONE, ROLLED_BACK, FAILED                                                                                                                                                                |
| `RolloverAction`       | PROMOTED, REPEATED, GRADUATED, TRANSFERRED, DROPPED                                                                                                                                                               |
| `AlumniStatus`         | ACTIVE, ARCHIVED                                                                                                                                                                                                  |
| `NotificationType`     | TASK_NEW, TASK_GRADED, EXAM_START, EXAM_AUTOSUBMIT, ATTENDANCE_ALPA, INVOICE_DUE, PAYMENT_CONFIRMED, PPDB_STATUS, ANNOUNCEMENT, LETTER_STATUS, LIBRARY_DUE, ASSET_APPROVED, DISCIPLINE, BK_REMINDER, EXPORT_READY |

> **Catatan v1.2:** `SchoolStatus` DIHAPUS; enum `Role` mengikuti prd04 §3.1 lalu diperbarui per 2026-08-08 menjadi **14 role** (`GURU_BK` → `BK`, tambah `KAPRODI` & `AUDITOR` — sumber `schema.prisma:29-44`); wali kelas = scope override `Class.homeroom_teacher_id` untuk role GURU.

---

## 6. Index Strategis (Query Hotspot)

| Index                                         | Tabel                          | Alasan                                                |
| --------------------------------------------- | ------------------------------ | ----------------------------------------------------- |
| `(assignment_id, student_id)` unique          | submission                     | Submission per assignment (hot)                       |
| `(student_id, class_subject_id, date)` unique | attendance                     | Rekap absensi per siswa+mapel+hari                    |
| `(attendance_session_id, student_id)` unique  | attendance_record              | Scan per sesi                                         |
| `(exam_session_id, student_id)` unique        | exam_attempt                   | Satu siswa satu attempt per sesi                      |
| `(attempt_id, question_id)`                   | exam_answer_log                | Ambil semua jawaban per attempt (grade)               |
| `(student_id, status, due_date)`              | invoice                        | Tagihan per siswa + jatuh tempo                       |
| `(invoice_id)`                                | payment                        | Riwayat pembayaran per tagihan                        |
| `(user_id, read_at, created_at)`              | notification                   | Notifikasi center per user                            |
| `(type, created_at)`                          | notification                   | Broadcast/rekap per tipe (v1.1)                       |
| `(class_subject_id, due_at)`                  | assignment                     | Daftar tugas per kelas-mapel                          |
| `(student_id, class_subject_id, semester)`    | grade                          | Rekap nilai & rapor                                   |
| `(class_id, academic_year_id)`                | enrollment                     | Daftar siswa per kelas                                |
| `(student_id, date)`                          | attendance / attendance_record | Rekap bulanan (prd02 §3.2)                            |
| `(status, created_at)`                        | ppdb_applicant                 | Panel verifikasi OPERATOR (v1.1, tanpa kolom sekolah) |
| `(user_id, status)`                           | user_role                      | Resolve role per request auth (v1.1)                  |
| `(entity, entity_id, created_at)`             | audit_log                      | Jejak audit per record                                |
| `(user_id, status)`                           | failed_login_attempts          | Brute-force lockout (G11)                             |
| `(entity, retention_months)`                  | data_retention_policy          | Job retensi (G12) (v1.1)                              |
| `(feature_key)` unique                        | app_feature_setting            | Resolve nilai flag per request (v1.1)                 |

Tambahan GIN index untuk `tags` (Question) dan `target_role` (Announcement) bila perlu.

---

## 7. RLS & Keamanan (Opsional, Tanpa Dimensi Tenant)

### 7.1 Klasifikasi Tabel

| Kategori           | Tabel                                                              | RLS                                                                                           |
| ------------------ | ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| Profil & identitas | SchoolProfile, User                                                | Policy khusus (User: diri sendiri / minimal)                                                  |
| Standar            | Semua tabel (tanpa `school_id`)                                    | Policy berbasis role/scope (`user_role`)                                                      |
| Sensitif           | counseling_note, ppdb_applicant, parental_consent, data_export_log | Policy standar + **field/role check tambahan**                                                |
| Mapping            | user_role                                                          | Policy berdasarkan `app.user_id` sendiri                                                      |
| PPDB publik        | ppdb_applicant (saat DRAFT/SUBMITTED)                              | `@Public` API — RLS tetap menolak akses lintas; pendaftar akses via token undangan/ID rahasia |

### 7.2 Session Variable & Aktivasi (opsional)

Prisma berjalan dengan satu role database; RLS (bila diaktifkan) menggunakan satu session var identitas — **tanpa session var tenant**:

```sql
-- Interceptor/repository: di awal tiap transaksi (hanya bila RLS diaktifkan)
SELECT set_config('app.user_id', :userId, true);   -- scope transaksi
-- Prisma: operasi dibungkus $transaction dengan SET LOCAL di awal
```

### 7.3 Contoh Policy (deskriptif, ringkas)

```sql
-- (1) RLS opsional berbasis role/scope — mis. assignment: role pengajar/admin
-- Tabel role aktual: "user_role" (schema @@map). Helper app.current_user_id()
-- mengembalikan text (PK user_* bertipe String/cuid) — jangan pakai ::uuid.
CREATE POLICY assignment_role_scope ON assignment
  USING (EXISTS (
    SELECT 1 FROM "user_role" ur
    WHERE ur.user_id = app.current_user_id()
      AND ur.status = 'ACTIVE'
      AND ur.role IN ('GURU','OPERATOR','WAKEPSEK','KEPSEK','SUPERADMIN')));

-- (2) Tabel sensitif BK — role check BK/WAKEPSEK/KEPSEK
CREATE POLICY counseling_limited_roles ON counseling_note
  USING (EXISTS (
    SELECT 1 FROM "user_role" ur
    WHERE ur.user_id = app.current_user_id()
      AND ur.status = 'ACTIVE'
      AND ur.role IN ('BK','WAKEPSEK','KEPSEK')));

-- (3) User — hanya diri sendiri
CREATE POLICY user_self_read ON "user"
  USING (id = app.current_user_id());

-- (4) Storage — lihat §8 02-technical-architecture.md (policy per bucket via path {module}/{entity_id}/{file})
```

Prinsip: **RLS opsional lapis kedua**; guard NestJS (`@RequirePermission` + scope SENDIRI/KELAS/SEKOLAH) adalah lapis utama (prd04 §16.3(g)). SUPERADMIN (admin sistem sekolah) & migrasi memakai role yang dapat bypass RLS dengan audit.

---

## 8. Diagram Relasi (Modul Inti)

### 8.1 Akademik

```
SchoolProfile 1──N UserRole N──1 User
SchoolProfile 1──N AcademicYear 1──N Class 1──N Enrollment N──1 User (siswa)
AcademicYear 1──N RolloverRun N──1 AcademicYear
AcademicYear 1──N Alumni N──1 User (lulusan)
Class 1──N ClassSubject N──1 Subject
ClassSubject N──1 User (teacher)
Class 1──N ScheduleEntry N──1 Subject
Enrollment 1──N Grade N──1 ClassSubject
ClassSubject 1──N Assignment 1──N Submission N──1 User (siswa)
ClassSubject 1──N Material
FeatureFlag 1──N AppFeatureSetting
```

### 8.2 Ujian Online

```
Exam 1──N ExamPackage
Exam 1──N ExamSession 1──N ExamAttempt N──1 User (siswa)
ExamSession N──1 Class
ExamAttempt 1──N ExamAnswerLog N──1 Question
ExamPackage N──1 Question (bank soal)
ExamAttempt N──1 ExamPackage
```

### 8.3 Absensi

```
AttendanceSession 1──N AttendanceQrToken (token sekali pakai)
AttendanceSession 1──N AttendanceRecord N──1 User (siswa)
ClassSubject 0..1──N AttendanceSession
ClassSubject 1──N Attendance (manual v1)
User (siswa) 1──N AttendanceRecord (rekap via index student_id+date)
```

### 8.4 Keuangan

```
Student (User) 1──N Invoice 1──N Payment
Invoice N──1 User (created_by)
Payment N──1 User (verified_by)
```

### 8.5 PPDB & Consent

```
PpdbApplicant N──1 SchoolProfile
PpdbApplicant 0..1──1 ParentalConsent (G13)
PpdbApplicant 0..1──1 User (akun siswa setelah ENROLLED)
ParentalConsent 0..1──N User (siswa aktif)
```

### 8.6 SMK/PKL/UKK (Fase 3)

```
InternshipPartner 1──N IndustryMentor N──1 User (role PEMBIMBING_INDUSTRI)
InternshipPartner 1──N Internship N──1 User (siswa)
Internship N──1 IndustryMentor
Internship N──1 AcademicYear
Internship 1──N InternshipJournal
CompetencyTest N──1 User (siswa) · N──1 User (penguji)
CompetencyTest 1──N CompetencyRubricItem
```

---

## 9. Catatan Desain

- **Polimorfisme** (`Grade.source_id`, `Question.exam_package_id`) memakai string reference, bukan FK fisik, karena sumber bisa Assignment/Quiz/ExamAttempt — dijamin konsisten oleh service layer + AuditLog.
- **Nama tabel** memakai snake_case (Prisma `@@map`); field camelCase.
- **Decimal** untuk uang (`Decimal(12,2)`) — hindari float.
- **`school_id` eksplisit DIHAPUS** di semua tabel (single-school, prd04 §16.3(g)); akses data dikontrol permission + scope RBAC (SENDIRI/KELAS/SEKOLAH) di aplikasi.
- **RLS opsional** tanpa session var tenant (hanya `app.user_id`); lapis utama tetap guard NestJS.
- **Jumlah entitas: desain awal 61** (56 v1.0 + FeatureFlag, AppFeatureSetting, AcademicYear, RolloverRun, Alumni); **implementasi aktual 90 model + 62 enum** per 2026-08-08 (lihat Catatan Pembaruan di header).
- **Perubahan skema** memakai Prisma Migrate; file RLS opsional dikelola di `packages/database/prisma/rls/*.sql` dan dijalankan di migrasi (lihat 05-implementation-plan F0-T5).
