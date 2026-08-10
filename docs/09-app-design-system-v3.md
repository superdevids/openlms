# Spesifikasi Desain APP v3 — Profesional × Menarik × Solutif (Redesain Seluruh FE Aplikasi)

**Versi:** 3.0
**Tanggal:** 9 Agustus 2026
**Status:** Final — acuan implementasi openteam-coder (redesain seluruh halaman aplikasi: 51 page.tsx route group role + komponen shell)
**Ruang lingkup:** SEMUA halaman di dalam `apps/web/src/app/(auth)/(siswa)(guru)(admin)(superadmin)(ortu)(calonsiswa)(pembimbing)(penguji)` + komponen `AppShell`, dashboard, tabel, form, empty/error/loading state. **BUKAN** halaman landing publik (sudah ditangani `landing-design-v2.md`) dan **BUKAN** halaman PPDB publik/wizard (mengikuti pola wizard yang sudah ada, dipoles di blueprint E.6).
**Dokumen rujukan:** `07-ux-design.md` [v1.1] (prinsip P1–P9), `landing-design-v2.md` [v2.0] (token landing — ADDITIF, tidak diubah), `globals.css` (apps/web/src/app/globals.css — token existing), `packages/ui` (Button/Card/Badge/Input/Select/Dialog/Tabs/Table/Skeleton/EmptyState/ErrorState/DataView/toast), `app-shell.tsx`, `lib/roles.ts`, `lib/dashboard.ts`, `01-master-prd.md`.
**Konteks teknis:** shadcn/ui + Tailwind v4 + token CSS di globals.css; branding dinamis `--brand-*` (GET /api/v1/app/branding); dark mode class `.dark`; CSP `img-src 'self' data:` → ilustrasi harus SVG lokal; font Plus Jakarta Sans (`--font-sans`).

---

## Ringkasan Eksekutif (BLUF)

**APP v3 membuat aplikasi terasa seperti "workspace profesional" yang hangat: halaman aplikasi memakai kanvas netral dengan kartu putih, sidebar yang terstruktur (logo + nama sekolah, section berkelompok, state aktif kuat, user card), topbar fungsional (breadcrumb + command palette + notifikasi), dan setiap data ditampilkan solutif — KPI dengan konteks/delta, tabel sticky + filter + pagination, badge status ber-warna tint, empty state yang menuntun aksi.** Semua keputusan token bersifat **additif terhadap token existing + landing v2** (tidak ada nilai yang di-overwrite). Branding sekolah tetap menjadi aksen utama lewat `--brand-*`; status semantik (success/warning/danger/info) **tidak pernah** bergantung pada brand agar makna status tetap terbaca di semua sekolah. Dokumen ini memberi resep komponen preskriptif (kelas Tailwind eksplisit), blueprint 14 halaman kunci per role, token CSS siap salin, dan quality gates yang harus lolos sebelum implementasi dianggap selesai.

---

## A. Design Principles

| #   | Prinsip                                   | Penjabaran operasional untuk APP v3                                                                                                                                                                                                                                                                                                                                        |
| --- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AP1 | **Professional — hierarki & ruang napas** | Satu h1 per halaman (PageHeader), section memakai h2 konsisten, kartu memakai h3. Kanvas aplikasi (`--app-bg`) berbeda dari landing agar "ruang kerja" terasa tenang. Spasi mengikuti skala 4px (bagian C). Tidak ada dua bahasa visual: landing playful, aplikasi fokus — brand aksen dipakai secukupnya (sidebar active, primary button, link), bukan gradient hero.     |
| AP2 | **Menarik — mikro-interaksi & data**      | Setiap interaktif punya state hover/focus/active/disabled (bagian F). KPI tidak lagi "angka telanjang": diberi ikon + tint + delta + link konteks. Data divisualkan dengan sparkline ringan (SVG murni, tanpa dependency). Badge status memakai warna tint + teks berwarna (bukan solid) agar enak dibaca dan tetap AA.                                                    |
| AP3 | **Solutif — task-focused**                | Urutan konten dashboard mengikuti prioritas tugas: tenggat hari ini/hari ini di paling atas, lalu jadwal, lalu ringkasan. Empty state selalu menyertakan penjelasan + CTA menuju aksi yang menyelesaikannya. Error state menyertakan alasan + tombol coba lagi + requestId. Form menyembunyikan kompleksitas: section berkelompok + validation alert + sticky footer aksi. |
| AP4 | **Satu sumber token**                     | Tidak ada hex ad-hoc baru di komponen. Semua token v3 dideklarasikan di `globals.css` (bagian H) dan dipakai via utilitas Tailwind hasil `@theme inline`. Token landing v2 & semantic shadcn TIDAK diubah — hanya ditambah.                                                                                                                                                |
| AP5 | **Aksesibel by default**                  | WCAG AA di semua pairing; target sentuh ≥44×44px; focus-visible jelas; skip-link; sidebar → drawer di mobile; reduced-motion dihormati (bagian F & G).                                                                                                                                                                                                                     |
| AP6 | **Konsisten antar role**                  | 8 route group memakai shell & komponen yang sama (AppShell v2 + PageHeader + StatCard + DataTable + StatusBadge). KPI duplikat (admin/superadmin) di-shared ke satu komponen `StatCard`; tidak ada h1 manual lagi di halaman.                                                                                                                                              |

---

## B. Color & Token

### B.1 Keputusan utama: brand vs semantic

| Area                                                                          | Sumber warna                                      | Alasan                                                                                                                                                      |
| ----------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Aksen utama (primary button, link, sidebar active, focus ring, chip ikon KPI) | `--brand-primary` (runtime branding sekolah)      | Sekolah memilih identitasnya; aplikasi mengikuti brand agar konsisten dengan landing dan logo. Semua turunan brand memakai opacity/tint, bukan warna kedua. |
| Status (success/warning/danger/info)                                          | Token semantik tetap (bukan brand)                | Makna status harus identik di semua sekolah. Kalau status ikut brand, merah bisa jadi biru dan membingungkan.                                               |
| Kanvas & permukaan aplikasi                                                   | Token v3 baru (`--app-bg`, `--app-surface`, dll.) | Menciptakan identitas "workspace" yang berbeda dari landing tanpa menyentuh `--background`/`--card` yang dipakai auth/landing.                              |

### B.2 Token v3 — permukaan aplikasi (APPEND, tidak overwrite)

| Token CSS             | Light value              | Dark value            | Peran                                                 |
| --------------------- | ------------------------ | --------------------- | ----------------------------------------------------- |
| `--app-bg`            | `#f4f5f7`                | `#0b0d10`             | Kanvas halaman aplikasi (wrapper AppShell)            |
| `--app-surface`       | `#ffffff`                | `#15181d`             | Kartu/panel di atas `--app-bg` (hampir sama dgn card) |
| `--app-surface-2`     | `#eef0f3`                | `#1d2127`             | Well, area hover, baris alternatif, input group bg    |
| `--app-border-subtle` | `#e4e7eb`                | `#232830`             | Border halus di dalam kartu (divider, chip)           |
| `--topbar`            | `rgba(255,255,255,0.85)` | `rgba(11,13,16,0.85)` | Background topbar (sticky, backdrop-blur)             |

### B.3 Token v3 — Sidebar (konvensi shadcn/ui sidebar)

| Token CSS                      | Light value                     | Dark value | Peran                                       |
| ------------------------------ | ------------------------------- | ---------- | ------------------------------------------- |
| `--sidebar`                    | `#fbfbfc`                       | `#0e1115`  | Background sidebar                          |
| `--sidebar-foreground`         | `#18181b`                       | `#fafafa`  | Teks menu                                   |
| `--sidebar-border`             | `#e5e7eb`                       | `#20252c`  | Border kanan sidebar + divider grup         |
| `--sidebar-primary`            | `var(--brand-primary, #2563eb)` | sama       | Warna indikator & teks state aktif          |
| `--sidebar-primary-foreground` | `#ffffff`                       | `#ffffff`  | Teks di atas primary                        |
| `--sidebar-accent`             | `#eef2ff`                       | `#1b2230`  | Background item aktif (tint brand, light)   |
| `--sidebar-accent-foreground`  | `#1d4ed8`                       | `#93c5fd`  | Teks item aktif (kontras AA di atas accent) |
| `--sidebar-ring`               | `var(--brand-primary, #2563eb)` | sama       | Focus ring item sidebar                     |

Aturan pakai: item aktif = `bg-sidebar-accent text-sidebar-accent-foreground font-semibold` + indikator kiri `before:` bar 3px `bg-sidebar-primary`. Hover item non-aktif = `hover:bg-sidebar-accent/60 hover:text-sidebar-foreground`.

### B.4 Token v3 — Status (tinted, bukan solid)

Badge lama solid (`bg-success-700 text-white`) diganti **tint + teks gelap di light / terang di dark** agar lebih mudah dibaca dan tidak "menjerit".

| Status  | Token                                  | Light value | Dark value | Dipakai untuk                              |
| ------- | -------------------------------------- | ----------- | ---------- | ------------------------------------------ |
| success | `--status-success-fg`                  | `#047857`   | `#6ee7b7`  | Teks badge/ikon "LUNAS, HADIR, PUBLISHED"  |
| success | `--status-success-bg`                  | `#ecfdf5`   | `#0d3328`  | Background badge                           |
| success | `--status-success-border`              | `#a7f3d0`   | `#1f6b4f`  | Border badge (opsional, untuk badge besar) |
| warning | `--status-warning-fg`                  | `#b45309`   | `#fcd34d`  | "PENDING, PARTIAL/CICILAN, IZIN, DRAFT"    |
| warning | `--status-warning-bg`                  | `#fffbeb`   | `#3a2a10`  | Background badge                           |
| warning | `--status-warning-border`              | `#fde68a`   | `#8a5a12`  | Border badge                               |
| danger  | `--status-danger-fg`                   | `#b91c1c`   | `#fca5a5`  | "OVERDUE, ALPA, DISABLED, TERLAMBAT"       |
| danger  | `--status-danger-bg`                   | `#fef2f2`   | `#3c1414`  | Background badge                           |
| danger  | `--status-danger-border`               | `#fecaca`   | `#8c2f2f`  | Border badge                               |
| info    | `--status-info-fg`                     | `#0369a1`   | `#7dd3fc`  | "ONGOING, REFUND, DIPROSES"                |
| info    | `--status-info-bg`                     | `#f0f9ff`   | `#0c2f45`  | Background badge                           |
| info    | `--status-info-border`                 | `#bae6fd`   | `#1c5b80`  | Border badge                               |
| neutral | (pakai `--muted`/`--muted-foreground`) | —           | —          | "DRAFT ringan, SEKOLAH, locked"            |

Kontras dijamin: semua pasangan fg/bg ≥ 4.5:1 (bagian H sudah dipilih dari palet Tailwind yang lolos AA).

### B.5 Token v3 — Focus ring, shadow, radius

| Token                   | Light value                                                          | Dark value                                               | Peran                               |
| ----------------------- | -------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------------------- |
| `--focus-ring`          | `var(--brand-primary, #2563eb)`                                      | `var(--brand-primary, #3b82f6)`                          | Warna outline fokus (focus-visible) |
| `--shadow-app-card`     | `0 1px 2px rgb(9 11 15 / 0.04), 0 1px 3px rgb(9 11 15 / 0.06)`       | `0 1px 2px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.4)` | Kartu default                       |
| `--shadow-app-floating` | `0 8px 24px -4px rgb(9 11 15 / 0.12), 0 2px 8px rgb(9 11 15 / 0.08)` | `0 8px 24px -4px rgb(0 0 0 / 0.6)`                       | Dropdown, command palette, popover  |
| `--shadow-app-sticky`   | `0 -4px 16px rgb(9 11 15 / 0.06)`                                    | `0 -4px 16px rgb(0 0 0 / 0.5)`                           | Sticky footer form, topbar          |

Radius: tetap mengikuti `--radius`/`--radius-brand` (0.5rem default). Komponen v3 TIDAK memakai `rounded-full`/`rounded-3xl` (itu bahasa landing). Kecuali StatusBadge kecil boleh `rounded-full` karena pill. Konsistensi: kartu `rounded-lg`, button/input `rounded-md`, tabel `rounded-lg` wrapper.

---

## C. Typography & Spacing

### C.1 Skala tipografi aplikasi (berbeda dari landing — lebih ringkas)

| Role                 | Class Tailwind                                                             | Size    | Weight | Line-height       | Pemakaian                                    |
| -------------------- | -------------------------------------------------------------------------- | ------- | ------ | ----------------- | -------------------------------------------- |
| Page title (h1)      | `text-2xl md:text-3xl font-bold tracking-tight`                            | 24/30px | 700    | `leading-tight`   | Judul halaman (PageHeader)                   |
| Page description     | `text-sm text-muted-foreground`                                            | 14px    | 400    | `leading-relaxed` | Subtitle PageHeader                          |
| Section title (h2)   | `text-base font-semibold tracking-tight`                                   | 16px    | 600    | `leading-snug`    | Judul blok/section di halaman                |
| Card title           | `text-sm font-semibold`                                                    | 14px    | 600    | `leading-snug`    | Judul kartu (CardTitle)                      |
| Card description     | `text-xs text-muted-foreground`                                            | 12px    | 400    | `leading-relaxed` | Deskripsi kartu                              |
| Body (app)           | `text-sm`                                                                  | 14px    | 400    | `leading-relaxed` | Isi umum, sel tabel                          |
| Body small           | `text-xs`                                                                  | 12px    | 400    | `leading-relaxed` | Meta, hint, footer kartu                     |
| Caption / meta       | `text-xs text-muted-foreground`                                            | 12px    | 400    | `leading-4`       | Waktu relatif, label kecil                   |
| KPI number           | `text-2xl md:text-3xl font-bold tabular-nums tracking-tight`               | 24/30px | 700    | `leading-none`    | Angka StatCard                               |
| KPI delta            | `text-xs font-semibold`                                                    | 12px    | 600    | `leading-4`       | Perubahan +/− di StatCard                    |
| Table header         | `text-xs font-semibold uppercase tracking-wide text-muted-foreground`      | 12px    | 600    | `leading-4`       | Header kolom DataTable                       |
| Table cell           | `text-sm`                                                                  | 14px    | 400    | `leading-5`       | Sel DataTable                                |
| Eyebrow (dalam card) | `text-[11px] font-semibold uppercase tracking-wider text-muted-foreground` | 11px    | 600    | `leading-4`       | Label kecil di atas konten (mis. "HARI INI") |

Aturan: tidak ada teks isi < 12px; angka uang/nilai memakai `tabular-nums`; heading berurutan (satu h1 → h2 section → h3 card); jangan pakai `font-light` untuk body di atas kanvas.

### C.2 Spacing (skala 4px)

| Konteks            | Nilai                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Container aplikasi | `mx-auto max-w-7xl px-4 md:px-6` (naik dari max-w-6xl; full-width opsional utk admin data `max-w-none`) |
| Stack antar blok   | `space-y-6` (halaman), `space-y-4` (dalam card)                                                         |
| Grid kartu         | `gap-3 sm:gap-4` (KPI), `gap-4` (kartu navigasi)                                                        |
| Padding kartu      | `p-5` (default), `p-4` (dense/tabel), `p-6` (kartu hero/form)                                           |
| Ritme dalam kartu  | ikon → `mb-3` → judul → `mt-1` → deskripsi → `mt-4` → konten → `mt-4` → footer aksi                     |
| Kontrol form       | `space-y-1.5` per field (Label + Input), `gap-4 sm:grid-cols-2` antar field                             |
| Sticky footer form | `border-t border-border bg-app-surface px-6 py-4 flex justify-end gap-2`                                |

### C.3 Densitas tabel data

- Baris: `px-3 py-2.5` (cell), header `px-3 py-2.5`; tinggi baris ±40px.
- Sticky header: `sticky top-0 z-10 bg-muted` pada `thead` + wrapper `max-h-[560px] overflow-auto`.
- Alternatif baris: `odd:bg-app-surface-2/40` bila tabel panjang (>20 baris) — default tanpa zebra agar bersih.
- Pagination di bawah: `flex items-center justify-between border-t border-border px-4 py-3`.

---

## D. Komponen Inti Redesign (recipe preskriptif)

Semua komponen baru berada di `apps/web/src/components/` (kecuali primitif yang memang di `packages/ui`). Recipe memakai primitif existing + utilitas token v3.

### D.1 AppShell v2 (menggantikan `app-shell.tsx`)

**Layout:** `flex min-h-screen bg-app-bg` → sidebar kiri (desktop, `hidden lg:flex`), kolom kanan = topbar + main. Container konten: `mx-auto w-full max-w-7xl px-4 md:px-6 py-6`. Mobile: sidebar → drawer (pola existing, dipertahankan) + bottom nav (dipertahankan).

**Sidebar (desktop):**

```tsx
<aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex">
  {/* 1. Brand: logo bulat + nama sekolah */}
  <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-4">
    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
      <IconSchool className="h-5 w-5" />
    </div>
    <div className="min-w-0">
      <p className="truncate text-sm font-bold text-sidebar-foreground">{schoolName}</p>
      <p className="truncate text-[11px] text-muted-foreground">{academicYear}</p>
    </div>
  </div>

  {/* 2. Navigasi berkelompok */}
  <nav aria-label="Navigasi utama" className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
    {sections.map((section) => (
      <div key={section.label}>
        <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {section.label}
        </p>
        <ul className="space-y-0.5">
          {section.items.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/60"
                  )}
                >
                  {active && (
                    <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r bg-sidebar-primary" />
                  )}
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <Badge variant="danger" className="px-1.5 text-[10px]">
                      {item.badge}
                    </Badge>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    ))}
  </nav>

  {/* 3. User card bawah */}
  <div className="border-t border-sidebar-border p-3">
    <DropdownMenu>
      {" "}
      {/* atau button sederhana */}
      <div className="flex min-h-11 w-full items-center gap-3 rounded-md px-2 hover:bg-sidebar-accent/60">
        <Avatar fallback={initials(user.fullName)} />
        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-sm font-semibold text-sidebar-foreground">{user.fullName}</p>
          <p className="truncate text-[11px] text-muted-foreground">{roleLabel(primaryRole)}</p>
        </div>
        <IconChevronUp className="h-4 w-4 text-muted-foreground" />
      </div>
      {/* menu: Profil, Pengaturan, Keluar */}
    </DropdownMenu>
  </div>
</aside>
```

**Topbar (kolom kanan):**

```tsx
<header className="sticky top-0 z-30 border-b border-border bg-topbar backdrop-blur">
  <div className="flex h-16 items-center justify-between gap-3 px-4 md:px-6">
    <div className="flex min-w-0 items-center gap-3">
      <button
        className="touch-target rounded-md text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Buka menu"
        onClick={openDrawer}
      >
        <IconMenu className="h-5 w-5" />
      </button>
      {/* Breadcrumb / konteks halaman: group label + halaman aktif */}
      <nav aria-label="Breadcrumb" className="hidden min-w-0 items-center gap-1.5 text-sm sm:flex">
        <span className="font-medium text-muted-foreground">{ROLE_GROUP_LABEL[roleGroup]}</span>
        <IconChevronRight className="h-4 w-4 text-muted-foreground/60" aria-hidden="true" />
        <span className="truncate font-semibold text-foreground">{pageTitle}</span>
      </nav>
    </div>
    <div className="flex items-center gap-1.5">
      {/* Command palette trigger */}
      <button
        onClick={openCommand}
        className="hidden h-10 w-64 items-center gap-2 rounded-md border border-input bg-app-surface px-3 text-sm text-muted-foreground transition-colors hover:bg-muted md:flex"
        aria-label="Cari (Ctrl+K)"
      >
        <IconSearch className="h-4 w-4" />
        <span className="flex-1 text-left">Cari menu, siswa, tagihan…</span>
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          Ctrl K
        </kbd>
      </button>
      <button
        className="touch-target rounded-md text-muted-foreground hover:bg-muted md:hidden"
        aria-label="Cari"
        onClick={openCommand}
      >
        <IconSearch className="h-5 w-5" />
      </button>
      <ThemeToggle />
      <FontSizeToggle />
      {/* Notifikasi dengan badge */}
      <button
        className="touch-target relative rounded-md text-muted-foreground hover:bg-muted"
        aria-label={`Notifikasi${badgeCount ? `, ${badgeCount} belum dibaca` : ""}`}
        onClick={toggleNotif}
      >
        <IconBell className="h-5 w-5" />
        {badgeCount > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-white">
            {badgeCount > 9 ? "9+" : badgeCount}
          </span>
        )}
      </button>
      {/* User menu (desktop) — menggantikan teks nama telanjang */}
      <DropdownMenu>
        <button
          className="ml-1 hidden h-10 items-center gap-2 rounded-md px-2 hover:bg-muted sm:flex"
          aria-label="Menu pengguna"
        >
          <Avatar fallback={initials(user.fullName)} className="h-8 w-8 text-xs" />
          <IconChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>
        {/* items: Profil, Bantuan & FAQ, Keluar */}
      </DropdownMenu>
    </div>
  </div>
</header>
```

**Dukungan data:** tambahkan `section`/`group` di `lib/roles.ts` (field `group?: string` pada `NavItem`) dengan pemetaan per role group (tabel D.1.a). Sidebar di-render dari `visibleNav()` + grouping.

**D.1.a Grouping sidebar per role group:**

| Role group | Grup 1                          | Grup 2                                                                     | Grup 3                                                       | Grup 4 |
| ---------- | ------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------ | ------ |
| siswa      | Ringkasan (Beranda)             | Pembelajaran (Kelas, Tugas, Kuis, Ujian, Nilai)                            | Kehadiran (Absensi, Kalender)                                | —      |
| guru       | Ringkasan (Beranda)             | Mengajar (Kelas, Materi, Tugas, Bank Soal, Penilaian)                      | Kehadiran & Ujian (Absensi QR, Ujian)                        | —      |
| admin      | Ringkasan (Beranda)             | Data (Operator/Data, Landing Page)                                         | Operasional (Keuangan, Wakepsek, Kepsek, Change Log)         | —      |
| superadmin | Ringkasan (Beranda)             | Konfigurasi (Admin Sistem, Branding, Landing Page, RBAC, Dashboard Config) | Pemeliharaan (Onboarding, Rollover, Maintenance, Change Log) | —      |
| ortu       | Ringkasan (Beranda)             | Pantauan Anak (Nilai, Absensi, Tagihan)                                    | —                                                            | —      |
| calonsiswa | Ringkasan (Beranda, Pengumuman) | —                                                                          | —                                                            | —      |
| pembimbing | Ringkasan (Beranda, Siswa PKL)  | —                                                                          | —                                                            | —      |
| penguji    | Ringkasan (Beranda, Jadwal UKK) | —                                                                          | —                                                            | —      |

### D.2 PageHeader (shared — hilangkan h1 manual per halaman)

`apps/web/src/components/page/page-header.tsx`

```tsx
export function PageHeader({
  title,
  description,
  actions,
  meta
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode; // kanan: tombol primer CTA
  meta?: ReactNode; // chip konteks (tahun ajaran, periode)
}): JSX.Element {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-2xl">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
          {meta}
        </div>
        {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

Pemakaian: setiap halaman mengganti `<h1 className="text-2xl...">` manual dengan `<PageHeader title="Keuangan" description="..." actions={<Button>Buat Tagihan</Button>} />`.

### D.3 StatCard / KpiCard (shared — hilangkan KPI duplikat)

`apps/web/src/components/dashboard/stat-card.tsx`. Ini menggantikan `Kpi` lokal di admin/dashboard:164-182 DAN superadmin/dashboard:143-153 (dua-duanya dihapus, pakai komponen ini).

```tsx
export interface StatCardProps {
  label: string;
  value: string;
  icon?: ReactNode;
  /** delta: "+12%" atau "-3" — warna otomatis naik hijau / turun merah */
  delta?: { value: string; direction: "up" | "down" | "flat" };
  hint?: string; // konteks: "2 menunggu verifikasi"
  tint?: "brand" | "success" | "warning" | "danger" | "info" | "neutral";
  href?: string; // bila ada → seluruh kartu jadi Link
  sparkline?: number[]; // opsional data sparkline SVG
}

export function StatCard({
  label,
  value,
  icon,
  delta,
  hint,
  tint = "brand",
  href,
  sparkline
}: StatCardProps): JSX.Element {
  const tintBg = {
    brand: "bg-brand-primary/10 text-brand-primary",
    success: "bg-status-success-bg text-status-success-fg",
    warning: "bg-status-warning-bg text-status-warning-fg",
    danger: "bg-status-danger-bg text-status-danger-fg",
    info: "bg-status-info-bg text-status-info-fg",
    neutral: "bg-muted text-muted-foreground"
  }[tint];
  const content = (
    <Card className="group h-full overflow-hidden rounded-lg bg-app-surface shadow-app-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-app-floating">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-muted-foreground">{label}</p>
            <p className="mt-1.5 text-2xl font-bold tabular-nums tracking-tight md:text-3xl">
              {value}
            </p>
          </div>
          {icon ? (
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                tintBg
              )}
            >
              {icon}
            </span>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {delta ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-semibold",
                delta.direction === "up" && "bg-status-success-bg text-status-success-fg",
                delta.direction === "down" && "bg-status-danger-bg text-status-danger-fg",
                delta.direction === "flat" && "bg-muted text-muted-foreground"
              )}
            >
              {delta.direction === "up" ? (
                <IconTrendUp className="h-3.5 w-3.5" />
              ) : delta.direction === "down" ? (
                <IconTrendDown className="h-3.5 w-3.5" />
              ) : (
                <IconMinus className="h-3.5 w-3.5" />
              )}
              {delta.value}
            </span>
          ) : null}
          {hint ? <span className="truncate text-xs text-muted-foreground">{hint}</span> : null}
        </div>
        {sparkline && sparkline.length > 1 ? (
          <Sparkline data={sparkline} className="mt-3 h-8 w-full" />
        ) : null}
      </CardContent>
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {content}
    </Link>
  ) : (
    content
  );
}
```

**Sparkline (tanpa dependency):** komponen kecil render `<svg viewBox="0 0 100 32" preserveAspectRatio="none">` dengan `<polyline points={...} fill="none" stroke="var(--brand-primary)" strokeWidth="2" />` + area fill `stroke` opacity 10%. Path dihitung dari data array (normalisasi min–max). Aksesibel: `aria-hidden="true"` + nilai sebenarnya tetap di `value` teks.

Grid default KPI: `grid grid-cols-2 gap-3 lg:grid-cols-4`. Kartu navigasi lama (DashboardCards) dipertahankan, tapi di-poles: ikon chip pakai tint brand, tambah `group-hover` panah "Buka →".

### D.4 DataTable (shared)

`apps/web/src/components/data/data-table.tsx` — membungkus primitif `Table` + sticky header + pagination + toolbar filter.

```tsx
export interface DataTableColumn<T> {
  key: string;
  label: ReactNode;
  className?: string;
  render: (row: T) => ReactNode;
  /** sortKey bila kolom bisa diurutkan */
  sortKey?: string;
  hideBelow?: "sm" | "md" | "lg"; // kolom yang disembunyikan di layar kecil
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  loading?: boolean;
  empty?: { title: string; description?: string; action?: ReactNode };
  filterChips?: ReactNode; // toolbar atas
  search?: { value: string; onChange: (v: string) => void; placeholder?: string };
  pagination?: { page: number; pageSize: number; total: number; onPageChange: (p: number) => void };
  maxHeight?: string; // default "560px" → sticky header
}
```

Recipe (ringkas):

- Wrapper: `<Card className="overflow-hidden rounded-lg bg-app-surface shadow-app-card">`.
- Toolbar (bila ada search/filter): `<div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">` — search input `h-9 w-64 max-w-full rounded-md border border-input bg-background px-3 text-sm`, filter chips = `ChipGroup` (lihat D.4.a).
- Table: `<div className={cn("overflow-auto", maxHeight && "max-h-[560px]")}>` + `<Table className="min-w-full border-0">`.
- Sticky header: `thead className="sticky top-0 z-10 bg-muted"` + `TableHead className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground"`.
- Row: `hover:bg-muted/60 cursor-pointer` (bila onRowClick), sel `px-3 py-2.5 text-sm`.
- Kolom responsif: kolom dengan `hideBelow="md"` memakai `hidden md:table-cell`; `hideBelow="lg"` → `hidden lg:table-cell`.
- Pagination: `<div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">` → kiri `text-xs text-muted-foreground` ("Menampilkan 1–10 dari 124"), kanan tombol `h-9 rounded-md border border-input bg-background px-3 text-sm` Prev/Next + nomor halaman `aria-current="page"` pada halaman aktif (`bg-brand-primary/10 font-semibold text-brand-primary`).
- Empty row: bila `rows.length === 0` → render `<tr><td colSpan={columns.length}>` berisi `<EmptyStateV3 …/>` (D.9).

**D.4.a ChipGroup (filter)** — recipe sama dengan landing D.9 tapi skala aplikasi (bukan pill besar): chip `h-8 rounded-full border px-3 text-xs font-medium`; aktif `border-brand-primary bg-brand-primary text-white`; non-aktif `border-border bg-background text-muted-foreground hover:border-brand-primary hover:text-brand-primary`; `aria-pressed`.

### D.5 FormPage (shared)

`apps/web/src/components/page/form-page.tsx` — menyatukan pola form: PageHeader + Card form + section grouping + validation alert + sticky footer.

```tsx
export function FormPage({
  title, description, backHref, // breadcrumb "← Kembali"
  onSubmit, children, footer,   // footer custom bila perlu
  saveLabel = "Simpan", cancelHref, saving
}: {...}): JSX.Element {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={<Button variant="ghost" size="sm" onClick={back}>Kembali</Button>}
      />
      <form onSubmit={onSubmit} noValidate className="space-y-6">
        {/* blok section grouping (lihat D.5.a) */}
        {children}
        {/* Sticky footer */}
        <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-app-surface/95 px-4 py-4 backdrop-blur md:-mx-6 md:px-6">
          <div className="flex items-center justify-end gap-2">
            {cancelHref ? <Button type="button" variant="outline" onClick={back}>Batal</Button> : null}
            <Button type="submit" loading={saving}>{saveLabel}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
```

**D.5.a FormSection:** `<section aria-labelledby={id}>` → header `mb-4 flex items-baseline justify-between` dengan `h2 id text-base font-semibold` + optional `text-xs text-muted-foreground` (label "wajib" dsb.), lalu `<div className="grid gap-4 sm:grid-cols-2">`. Section dibungkus Card: `rounded-lg border border-border bg-app-surface p-5 shadow-app-card`.

**D.5.b ValidationAlert:** muncul di atas form bila ada error validasi: `<Alert variant="danger" className="text-sm"><AlertTitle>Periksa kembali</AlertTitle><AlertDescription>{messages.join(" • ")}</AlertDescription></Alert>` dengan `role="alert" aria-live="assertive"`. Field error diberi `aria-invalid` + `border-destructive focus-visible:ring-destructive` + teks error `text-xs text-status-danger-fg` di bawah input.

### D.6 StatusBadge (ganti Badge solid di konteks status)

`packages/ui/src/components/status-badge.tsx` (atau perluas `Badge` dengan varian tint — rekomendasi: komponen baru agar tidak merusak varian existing).

```tsx
export type StatusTone = "success" | "warning" | "danger" | "info" | "neutral";
export type StatusKey =
  | "LUNAS"
  | "PENDING"
  | "PARTIAL"
  | "OVERDUE"
  | "REFUNDED"
  | "HADIR"
  | "IZIN"
  | "SAKIT"
  | "ALPA"
  | "TERLAMBAT"
  | "PUBLISHED"
  | "DRAFT"
  | "ONGOING"
  | "DONE"
  | "ACTIVE"
  | "DISABLED"
  | "OPEN"
  | "CLOSED"
  | "ON"
  | "OFF"
  | "DIPROSES"
  | "LULUS"
  | "TIDAK_LULUS"
  | "locked";

const TONE: Record<StatusKey, StatusTone> = {
  LUNAS: "success",
  PAID: "success",
  HADIR: "success",
  PUBLISHED: "success",
  ACTIVE: "success",
  OPEN: "success",
  ON: "success",
  LULUS: "success",
  DONE: "success",
  PENDING: "warning",
  PARTIAL: "warning",
  IZIN: "warning",
  SAKIT: "warning",
  DRAFT: "warning",
  CLOSED: "warning",
  OFF: "warning",
  DIPROSES: "warning",
  OVERDUE: "danger",
  ALPA: "danger",
  TERLAMBAT: "danger",
  DISABLED: "danger",
  TIDAK_LULUS: "danger",
  REFUNDED: "info",
  ONGOING: "info",
  locked: "neutral"
};

export function StatusBadge({
  status,
  label,
  icon,
  className
}: {
  status: StatusKey | string;
  label?: string;
  icon?: ReactNode;
  className?: string;
}): JSX.Element {
  const tone = TONE[status] ?? "neutral";
  const cls = {
    success: "bg-status-success-bg text-status-success-fg",
    warning: "bg-status-warning-bg text-status-warning-fg",
    danger: "bg-status-danger-bg text-status-danger-fg",
    info: "bg-status-info-bg text-status-info-fg",
    neutral: "bg-muted text-muted-foreground"
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
        cls,
        className
      )}
    >
      {icon ?? <StatusDot tone={tone} />}
      {label ?? prettify(status)}
    </span>
  );
}
```

`StatusDot`: lingkaran 6px `bg-current opacity-70` (atau `rounded-full h-1.5 w-1.5`). **Kontras:** fg/bg dari token B.4 sudah AA. Selalu sertakan teks — warna saja tidak cukup (prinsip P3).

### D.7 CommandPalette (Cmd+K) — blueprint

`apps/web/src/components/layout/command-palette.tsx`. Perilaku: dialog modal + input pencarian + daftar hasil berkelompok; navigasi keyboard ↑↓/Enter/Esc; shortcut global `Cmd+K`/`Ctrl+K` (dan `/`). Data: menu navigasi `visibleNav()` + daftar halaman umum (Bantuan, Pengaturan) + pencarian siswa/tagihan via API (opsional, debounce 300ms).

```tsx
export function CommandPalette({
  open,
  onClose
}: {
  open: boolean;
  onClose: () => void;
}): JSX.Element {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const items = useMemo(() => buildItems(q), [q]); // [{id, group, label, href, icon}]

  // keyboard: ArrowDown/ArrowUp pindah active, Enter navigasi, Escape tutup
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <div className="flex items-center gap-2 border-b border-border px-4">
        <IconSearch className="h-5 w-5 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setActive(0);
          }}
          placeholder="Cari menu, siswa, tagihan…"
          className="h-12 border-0 bg-transparent text-base focus-visible:ring-0"
          autoFocus
        />
        <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          ESC
        </kbd>
      </div>
      <div className="max-h-[380px] overflow-y-auto p-2">
        {items.length === 0 ? (
          <EmptyStateV3
            icon={<IconSearch />}
            title="Tidak ditemukan"
            description={`Tidak ada hasil untuk "${q}"`}
          />
        ) : (
          groups.map((g) => (
            <div key={g.label}>
              <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </p>
              {g.items.map((it, i) => (
                <button
                  key={it.href}
                  onClick={() => {
                    router.push(it.href);
                    onClose();
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm",
                    i === active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" /> {it.label}
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </Dialog>
  );
}
```

Hook global: `useEffect` di AppShell mendaftarkan `keydown` untuk `(e.metaKey||e.ctrlKey) && e.key === "k"` → `setCommandOpen(true)`; fokus kembali ke trigger setelah tutup.

### D.8 NotificationPanel (polish)

Pertahankan struktur existing `notification-panel.tsx`, polish visual:

- Drawer kanan: `w-96 max-w-[92vw] bg-app-surface shadow-app-floating` + `rounded-l-xl border-l border-border` (desktop); mobile full-height sheet (existing).
- Header: judul `text-base font-semibold` + aksi "Tandai semua dibaca" `text-xs font-medium text-brand-primary hover:underline`.
- Item unread: `border-l-2 border-brand-primary bg-sidebar-accent/60` + dot indikator; read: `border-border`.
- Ikon tipe: peta type → ikon + tint (announcement=info, invoice=success/warning, submission=info).
- Empty: `EmptyStateV3` ikon `IconBell`, teks "Tidak ada notifikasi baru", tanpa CTA.
- Loading: `Skeleton` baris 3; Error: `ErrorState` ringkas.
- Semua item tombol `min-h-11` target sentuh; fokus ring `focus-visible:ring-2 ring-ring`.

### D.9 Skeleton / ErrorState / EmptyState v3

**Skeleton v3:** pertahankan primitif `Skeleton` (animate-pulse). Tambahkan varian tabel & KPI di app:

- KPI: grid 4 kolom, masing-masing `h-[120px] rounded-lg border border-border bg-app-surface p-5` berisi 2 bar skeleton.
- Tabel: header bar + 5 baris `grid grid-cols-6 gap-3` (kolom proporsional).
- Shimmer halus (opsional): tambahkan kelas `skeleton-shimmer` dengan `background: linear-gradient(90deg, var(--app-surface-2) 25%, #fff 50%, var(--app-surface-2) 75%)` + `background-size: 200% 100%` + `animation: shimmer 1.6s infinite`; `@media (prefers-reduced-motion: reduce)` nonaktif (sudah ditangani globals.css).

**ErrorState v3:** pakai `ErrorState` existing (Alert danger + retry + requestId) — cukup konsisten. Tambahkan optional `illustration` chip ikon di atas Alert: `<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-status-danger-bg text-status-danger-fg"><IconAlertTriangle/></div>`. CTA "Coba lagi" `variant="outline"`.

**EmptyStateV3** (`apps/web/src/components/page/empty-state-v3.tsx` — bungkus `EmptyState` packages/ui):

```tsx
export function EmptyStateV3({
  icon,
  title,
  description,
  action,
  className,
  compact
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}): JSX.Element {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-app-surface-2/60 px-6 py-10 text-center",
        compact && "py-6",
        className
      )}
    >
      {icon ? (
        <div className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-brand-primary/10 text-brand-primary">
          {icon}
        </div>
      ) : null}
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="max-w-sm text-xs text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
```

Solutif: setiap empty state WAJIB punya `action` bila ada aksi yang relevan (contoh: "Belum ada tagihan" → `<Button size="sm">Buat Tagihan</Button>`; "Tidak ada tugas" → tanpa aksi, teks positif).

---

## E. Page Blueprints (14 halaman kunci)

Konvensi: semua halaman role memakai `AppShell v2`; konten dimulai dengan `PageHeader`; blok memakai section `h2`; grid KPI `grid grid-cols-2 gap-3 lg:grid-cols-4`; DataTable untuk daftar >5 kolom; `StatusBadge` untuk status; `EmptyStateV3` untuk kosong.

### E.1 Dashboard Siswa (`/siswa/dashboard`)

1. **PageHeader** — `title="Selamat pagi, {nama}"` (greeting jam), `description` = ringkasan singkat: "3 tugas menunggu, 1 ujian hari ini", `actions` = tombol `Buka Kalender`.
2. **Hero tenggat (solutif #1)** — Card tint danger bila ada tugas jatuh tempo ≤24 jam: `border-status-danger-border bg-status-danger-bg/60` + judul "Tenggat hari ini" + list tugas `formatRelative` + CTA "Kerjakan →". Bila tidak ada: tampilkan card success kecil "Semua tugas aman".
3. **StatCard ×4** — Tugas belum dikerjakan (warning, delta), Rata-rata nilai (brand), Kehadiran bulan ini % (success, delta), Ujian aktif/terjadwal (info).
4. **Jadwal Hari Ini** — section h2 + list (pola existing) dipoles: tiap baris card `flex min-h-14 items-center justify-between rounded-lg border border-border bg-app-surface px-4 py-3 hover:border-brand-primary/40` + `StatusBadge` "Jam ke-X". Satu baris teratas yang sedang berlangsung diberi `border-l-2 border-brand-primary bg-sidebar-accent/50`.
5. **Kelas Saya** — grid card navigasi (pola existing, polish D.3).
6. **Ujian aktif** — card highlight (existing) dipoles ke tint info.

Urutan prioritas: **tenggat hari ini → jadwal → tugas → kelas** (AP3).

### E.2 Dashboard Guru (`/guru/dashboard`)

1. **PageHeader** — title "Beranda Guru", actions `Button size="sm" variant="outline"` "Buat Materi" + `Button` "Buat Tugas" (primary).
2. **StatCard ×4** — Submission perlu dinilai (danger, delta, href=/guru/penilaian), Kelas diampu (brand), Ujian terjadwal (info), Rata-rata nilai terbaru (success).
3. **Queue penilaian (solutif #2)** — section h2 "Perlu dinilai" + card list per tugas `flex items-center justify-between` + `StatusBadge variant="danger"` count + CTA "Buka penilaian".
4. **Kelas Saya** — grid card (existing, polish) dengan `Badge` jumlah siswa.
5. **Rekap nilai kelas** — grid card mini + `StatusBadge` rata-rata.
6. **Ujian terjadwal** — DataTable ringkas 3 kolom (Judul, Status, Waktu) + tombol Kelola.

### E.3 Admin Keuangan (`/admin/keuangan`)

1. **PageHeader** — title "Keuangan", description "Tagihan, pembayaran, denda, refund, rekonsiliasi, arus kas", actions `Button` "Buat Tagihan" (existing dialog).
2. **StatCard ×4** — Terkumpul (success, delta, sparkline), Belum dibayar (warning), Tunggakan (danger, href=/admin/keuangan), Menunggu verifikasi (info).
3. **Tabs** (existing) — dipertahankan; tab aktif diperkuat: `data-[state=active]:bg-app-surface data-[state=active]:shadow-app-card data-[state=active]:text-foreground`.
4. **Tab Tagihan** — DataTable kolom: Jenis, Periode, Jumlah, Dibayar, Jatuh Tempo, Status (`StatusBadge`), Aksi (DropdownMenu: Detail/Buat Ulang/Refund). Filter chip: SEMUA/LUNAS/CICILAN/MENUNGGAK/PENDING. Pagination + search.
5. **Tab Pembayaran/Denda/Refund/Rekon/Kas** — polish dengan `PageSection` (h2 + description) + card; Arus Kas → list item + StatCard kecil (masuk/keluar) + sparkline.

### E.4 Dashboard Superadmin (`/superadmin/dashboard`)

1. **PageHeader** — title "Statistik Sekolah", description "Ringkasan instalasi & konfigurasi", meta `StatusBadge` tahun ajaran (OPEN/CLOSED).
2. **StatCard ×4** — Siswa (brand), Guru (brand), Kelas (brand), Adopsi Fitur % (success, hint "x/y flag aktif", href=/superadmin/admin-sistem). **Gunakan `StatCard` shared — hapus `Kpi` lokal.**
3. **Tren** — Card "Tren Adopsi" + Sparkline (opsional) atau bar mini CSS.
4. **Feature Flags ringkas** — DataTable 3 kolom (Key, Kategori, Status `StatusBadge` ON/OFF/locked) + tombol "Kelola Semua".
5. **DashboardCards** — polish (D.3).

### E.5 Portal Orang Tua (`/ortu/dashboard`)

1. **PageHeader** — title "Selamat datang, {nama}", description "Anak: {nama anak}".
2. **Banner read-only** (existing) — polish: `rounded-lg border border-status-info-border bg-status-info-bg/60` + `StatusBadge info` "READ-ONLY".
3. **StatCard ×3** — Nilai tercatat, Kehadiran % (delta), Tagihan menunggak (danger bila >0, href=/ortu/tagihan).
4. **Navigasi pantauan** — grid 2 card (Absensi, Tagihan) + polish ikon.
5. Empty state "hubungkan anak" → `EmptyStateV3` + CTA "Hubungi operator sekolah".

### E.6 PPDB Wizard (`/ppdb/daftar` — publik, tanpa AppShell)

Pertahankan struktur wizard 4 langkah existing; polish visual:

1. Header terang: `bg-app-surface border-b border-border`, breadcrumb "← Halaman PPDB".
2. Card form: `max-w-2xl rounded-lg border border-border bg-app-surface p-6 shadow-app-card`.
3. `Steps` + `Progress` existing; step aktif diberi `font-semibold text-brand-primary`.
4. Field grouping memakai `FormSection`; error memakai `ValidationAlert`.
5. Footer aksi tidak sticky (halaman publik) — tetap `flex justify-between`.
6. Success screen: `IconCheck` di `bg-status-success-bg text-status-success-fg rounded-full h-14 w-14` + nomor pendaftaran `font-mono`.

### E.7 Login (split-screen) — `/login`

1. Layout: `min-h-screen grid lg:grid-cols-2 bg-app-bg`.
2. Kiri (desktop): panel brand `hidden lg:flex flex-col justify-between bg-gradient-to-br from-[var(--brand-primary)] via-[var(--brand-secondary)] to-[var(--brand-accent)] p-10 text-white` — logo + nama sekolah, headline singkat "Satu platform untuk seluruh aktivitas sekolah", 3 poin nilai (icon + teks), footer kredit. **Gradient memakai brand dinamis via CSS var, bukan hex statis.**
3. Kanan: `flex items-center justify-center p-6` + Card `w-full max-w-md rounded-lg border border-border bg-app-surface p-8 shadow-app-card` berisi `LoginForm` (existing) + `StatusBadge`/link "Lupa sandi → hubungi operator".
4. Tetap `flex min-h-screen` untuk mobile (panel kiri disembunyikan).

### E.8 Daftar Umum (contoh: Kelas Siswa `/siswa/kelas` & Tugas `/siswa/tugas`)

Pola reusable untuk semua halaman daftar:

1. **PageHeader** — title + description + actions (tombol primer kontekstual).
2. **Toolbar filter** — search input + `ChipGroup` status.
3. **DataTable** (bila kolom ≥4) ATAU grid card (bila konten kartu). Untuk daftar tugas: DataTable kolom Judul/Mapel/Tenggat (`StatusBadge` TERLAMBAT bila lewat)/Status.
4. **EmptyStateV3** + CTA bila kosong.
5. Pagination di bawah.

### E.9 Form Umum (contoh: Buat Tugas Guru `/guru/tugas`)

1. **PageHeader** — title "Buat Tugas", description, tombol kembali.
2. **FormSection "Informasi Dasar"** — Judul, Mapel (Select), Kelas (Select), Deskripsi (Textarea).
3. **FormSection "Tenggat & Pengaturan"** — Batas waktu (datetime), Lampiran (file), Opsi penilaian (Checkbox/Radio).
4. **ValidationAlert** di atas bila error.
5. **Sticky footer** — Batal + `Button loading` Simpan.

### E.10 Calon Siswa (`/calonsiswa/dashboard` + `/pengumuman`)

1. **PageHeader** — title "Beranda Calon Siswa", description "Pendaftaran & pengumuman".
2. **StatCard ×2** — Status pendaftaran (`StatusBadge` DIPROSES/LULUS/TIDAK_LULUS), Nomor pendaftaran.
3. **Pengumuman** — list card `flex gap-3` + tanggal + `StatusBadge` (BARU). Empty → EmptyStateV3.
4. CTA: "Perbarui data" → hubungi operator.

### E.11 Pembimbing Industri (`/pembimbing/dashboard` + `/siswa`)

1. **PageHeader** — title "Beranda Pembimbing".
2. **StatCard ×3** — Siswa PKL dibimbing (brand), Log aktivitas minggu ini (info), Penilaian perlu review (warning).
3. **DataTable Siswa PKL** — kolom Nama, Kelas, Industri, Status (AKTIF/SELESAI), Aksi (Detail).
4. Empty → "Belum ada siswa PKL diampu" + CTA.

### E.12 Penguji Eksternal (`/penguji/dashboard` + `/jadwal`)

1. **PageHeader** — title "Jadwal UKK", description "Sesi uji kompetensi".
2. **StatCard ×3** — Sesi hari ini (brand), Total sesi (info), Sesi selesai (success).
3. **DataTable Jadwal** — kolom Tanggal, Sesi, Kompetensi, Peserta, Status (DIPROSES/ONGOING/SELESAI `StatusBadge`), Aksi.
4. **EmptyStateV3** bila belum ada jadwal + CTA kontak koordinator.

### E.13 RBAC (`/superadmin/rbac`)

1. **PageHeader** — title "RBAC", description "Kelola role & permission", actions `Button` "Buat Role".
2. **DataTable Roles** — kolom Role, Pengguna, Permission count, Status, Aksi (Edit).
3. **Panel permission** — Card dengan daftar `Checkbox` per modul, dikelompokkan per section (Accordion).

### E.14 Change Log / Audit (`/admin/kepsek/change-logs` & `/superadmin/change-logs`)

1. **PageHeader** — title "Change Log", description "Riwayat perubahan", actions `Button variant="outline"` "Export CSV".
2. **Filter toolbar** — search + `Select` periode + `ChipGroup` tipe (SEMUA/INFO/WARNING/DANGER).
3. **DataTable** — kolom Waktu, Pengguna, Aksi, Detail, Status (tone dari severity), `max-h` + sticky header.
4. Detail baris: expandable row (`onRowClick` toggle) menampilkan before/after `code`.

---

## F. Motion & Interaction

| Konteks                    | Durasi            | Easing     | Spesifikasi                                                                                                                                             |
| -------------------------- | ----------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Micro (hover/focus/active) | 100–150ms         | `ease-out` | hover button `bg-primary/90`, hover card `-translate-y-0.5 shadow-app-floating`, chip `transition-colors`.                                              |
| Dropdown / panel / drawer  | 200–250ms         | `ease-out` | panel notifikasi & drawer sidebar: translate-x + fade; command palette: fade + scale 0.98→1.                                                            |
| Page content masuk         | 200–300ms         | `ease-out` | Hanya pada transisi halaman (jika diimplementasikan): fade 0.96→1 opacity; JANGAN stagger panjang di aplikasi (beda dari landing).                      |
| Skeleton                   | shimmer 1.6s loop | linear     | `skeleton-shimmer` (D.9); fallback `animate-pulse` existing.                                                                                            |
| Reduced motion             | —                 | —          | Wajib: `@media (prefers-reduced-motion: reduce)` (sudah ada di globals.css) → semua durasi 0.01ms; command palette/drawer tanpa slide, langsung muncul. |

Aturan: **jangan animasi layout** (height/width) untuk konten dinamis; animasi hanya opacity/transform; `will-change` hanya pada elemen yang benar-benar bergerak; setiap animasi punya `aria-hidden` bila dekoratif.

---

## G. Responsive & A11y

| Aspek           | Spesifikasi                                                                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Breakpoint      | Mobile-first. Sidebar: `hidden lg:flex`; drawer < `lg`; bottom nav `< md` (existing). Container `max-w-7xl px-4 md:px-6`.                                                                                     |
| Grid collapse   | KPI `grid-cols-2 lg:grid-cols-4`; statistik 3 → `grid-cols-1 sm:grid-cols-3`; form `sm:grid-cols-2`; daftar grid `sm:2 lg:3`.                                                                                 |
| Tabel responsif | Wrapper `overflow-auto` + sticky header; kolom opsional `hidden md:table-cell`; target: tidak ada scroll horizontal di < 640px tanpa alasan.                                                                  |
| Target sentuh   | Semua tombol/ikon `min-h-11 min-w-11` (44px) — `touch-target` existing; item bottom nav `min-h-14`.                                                                                                           |
| Kontras         | Semua pairing token bagian B lolos AA (dicek di H). Badge status tint fg/bg ≥4.5:1. Teks di atas gradient brand login: putih di area brand gelap (default primary) — pastikan brand yang dipilih gelap cukup. |
| Focus           | `focus-visible` global (outline 2px `--ring`, offset 2px) sudah ada; tambah `focus-visible:ring-2 ring-ring` pada item custom (chip, drawer, dropdown).                                                       |
| Skip link       | `skip-link` existing dipertahankan di AppShell v2, di atas topbar, target `#main`.                                                                                                                            |
| Keyboard        | Command palette ↑↓/Enter/Esc; dialog Radix fokus trap; accordion/tabs native; tabel tidak wajib tabular keyboard grid (cukup scroll).                                                                         |
| SR semantics    | Sidebar `nav aria-label="Navigasi utama"`; section `aria-labelledby`; status badge teks selalu ada (bukan warna saja); dekorasi `aria-hidden`.                                                                |
| Font scale      | `font-scale-*` existing tetap berfungsi (token rem).                                                                                                                                                          |

---

## H. Token CSS — Blok TAMBAHAN untuk `globals.css` (oleh openteam-coder)

Blok ini **ADDITIF**: tidak mengubah blok existing (`:root`/`.dark` shadcn, landing v2, `@theme inline` yang sudah ada). Cukup tempel di akhir file. Ekspos lewat `@theme inline` agar utilitas Tailwind tersedia (`bg-app-bg`, `bg-sidebar`, `text-sidebar-accent-foreground`, `bg-status-success-bg`, `text-status-danger-fg`, `border-status-info-border`, `shadow-app-card`, `shadow-app-floating`, `shadow-app-sticky`, `ring-focus-ring`).

```css
/* ===== APP v3 tokens (docs/app-design-system-v3.md §H) =====
 * Additif — tidak mengubah token existing maupun landing v2.
 * APP: permukaan workspace, sidebar (konvensi shadcn/ui), status tint,
 * focus ring, shadow aplikasi. */
:root {
  /* Permukaan aplikasi */
  --app-bg: #f4f5f7;
  --app-surface: #ffffff;
  --app-surface-2: #eef0f3;
  --app-border-subtle: #e4e7eb;
  --topbar: rgba(255, 255, 255, 0.85);

  /* Sidebar (konvensi shadcn/ui) */
  --sidebar: #fbfbfc;
  --sidebar-foreground: #18181b;
  --sidebar-border: #e5e7eb;
  --sidebar-primary: var(--brand-primary, #2563eb);
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #eef2ff;
  --sidebar-accent-foreground: #1d4ed8;
  --sidebar-ring: var(--brand-primary, #2563eb);

  /* Status tint (AA — fg/bg ≥ 4.5:1) */
  --status-success-fg: #047857;
  --status-success-bg: #ecfdf5;
  --status-success-border: #a7f3d0;
  --status-warning-fg: #b45309;
  --status-warning-bg: #fffbeb;
  --status-warning-border: #fde68a;
  --status-danger-fg: #b91c1c;
  --status-danger-bg: #fef2f2;
  --status-danger-border: #fecaca;
  --status-info-fg: #0369a1;
  --status-info-bg: #f0f9ff;
  --status-info-border: #bae6fd;

  /* Focus & shadow */
  --focus-ring: var(--brand-primary, #2563eb);
  --shadow-app-card: 0 1px 2px rgb(9 11 15 / 0.04), 0 1px 3px rgb(9 11 15 / 0.06);
  --shadow-app-floating: 0 8px 24px -4px rgb(9 11 15 / 0.12), 0 2px 8px rgb(9 11 15 / 0.08);
  --shadow-app-sticky: 0 -4px 16px rgb(9 11 15 / 0.06);
}

.dark {
  --app-bg: #0b0d10;
  --app-surface: #15181d;
  --app-surface-2: #1d2127;
  --app-border-subtle: #232830;
  --topbar: rgba(11, 13, 16, 0.85);

  --sidebar: #0e1115;
  --sidebar-foreground: #fafafa;
  --sidebar-border: #20252c;
  --sidebar-primary: var(--brand-primary, #3b82f6);
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: #1b2230;
  --sidebar-accent-foreground: #93c5fd;
  --sidebar-ring: var(--brand-primary, #3b82f6);

  --status-success-fg: #6ee7b7;
  --status-success-bg: #0d3328;
  --status-success-border: #1f6b4f;
  --status-warning-fg: #fcd34d;
  --status-warning-bg: #3a2a10;
  --status-warning-border: #8a5a12;
  --status-danger-fg: #fca5a5;
  --status-danger-bg: #3c1414;
  --status-danger-border: #8c2f2f;
  --status-info-fg: #7dd3fc;
  --status-info-bg: #0c2f45;
  --status-info-border: #1c5b80;

  --focus-ring: var(--brand-primary, #3b82f6);
  --shadow-app-card: 0 1px 2px rgb(0 0 0 / 0.5), 0 1px 3px rgb(0 0 0 / 0.4);
  --shadow-app-floating: 0 8px 24px -4px rgb(0 0 0 / 0.6);
  --shadow-app-sticky: 0 -4px 16px rgb(0 0 0 / 0.5);
}

/* Ekspos ke utilitas Tailwind (bg-app-bg, text-sidebar-*, bg-status-*, dst.) */
@theme inline {
  --color-app-bg: var(--app-bg);
  --color-app-surface: var(--app-surface);
  --color-app-surface-2: var(--app-surface-2);
  --color-app-border-subtle: var(--app-border-subtle);
  --color-topbar: var(--topbar);

  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-ring: var(--sidebar-ring);

  --color-status-success-fg: var(--status-success-fg);
  --color-status-success-bg: var(--status-success-bg);
  --color-status-success-border: var(--status-success-border);
  --color-status-warning-fg: var(--status-warning-fg);
  --color-status-warning-bg: var(--status-warning-bg);
  --color-status-warning-border: var(--status-warning-border);
  --color-status-danger-fg: var(--status-danger-fg);
  --color-status-danger-bg: var(--status-danger-bg);
  --color-status-danger-border: var(--status-danger-border);
  --color-status-info-fg: var(--status-info-fg);
  --color-status-info-bg: var(--status-info-bg);
  --color-status-info-border: var(--status-info-border);

  --color-focus-ring: var(--focus-ring);
  --shadow-app-card: var(--shadow-app-card);
  --shadow-app-floating: var(--shadow-app-floating);
  --shadow-app-sticky: var(--shadow-app-sticky);
}

/* Shimmer halus untuk skeleton (opsional; reduced-motion di globals.css) */
@layer components {
  .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--app-surface-2) 25%,
      rgba(255, 255, 255, 0.6) 50%,
      var(--app-surface-2) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.6s linear infinite;
  }
  .dark .skeleton-shimmer {
    background: linear-gradient(
      90deg,
      var(--app-surface-2) 25%,
      rgba(255, 255, 255, 0.08) 50%,
      var(--app-surface-2) 75%
    );
    background-size: 200% 100%;
    animation: skeleton-shimmer 1.6s linear infinite;
  }
  @keyframes skeleton-shimmer {
    from {
      background-position: 200% 0;
    }
    to {
      background-position: -200% 0;
    }
  }
}
```

Catatan penggunaan:

- Utilitas jadi: `bg-app-bg`, `bg-app-surface`, `bg-app-surface-2`, `border-app-border-subtle`, `bg-sidebar`, `text-sidebar-foreground`, `border-sidebar-border`, `bg-sidebar-accent`, `text-sidebar-accent-foreground`, `bg-sidebar-primary`, `text-sidebar-primary-foreground`, `bg-status-success-bg`, `text-status-success-fg`, `border-status-success-border` (dan warning/danger/info), `ring-focus-ring`, `shadow-app-card`, `shadow-app-floating`, `shadow-app-sticky`.
- Jangan hapus token lama; jangan menimpa `--color-sidebar*` lain yang mungkin muncul versi shadcn mendatang — nama ini sudah disepakati.

---

## I. Quality Gates & Handoff

### Quality gates (dicek openteam-coder sebelum selesai)

- **QG-DS1 Clear visual hierarchy:** satu h1 per halaman via PageHeader; section h2; kartu h3; CTA primer di kanan PageHeader.
- **QG-DS2 Consistent spacing:** skala C.2 dipakai semua kartu; tidak ada `space-y-*` ad-hoc baru.
- **QG-DS3 Readable type:** body ≥ 12px; skala C.1; `tabular-nums` untuk angka KPI/tabel.
- **QG-DS4 WCAG AA:** semua pairing token H ≥ 4.5:1 (sudah dipilih); badge status TINTED (bukan solid) — hapus pemakaian `bg-success-700 text-white` untuk badge status di halaman app (solid tetap boleh untuk tombol `variant="success"`).
- **QG-DS5 Interactive states:** hover/focus/active/disabled di semua item interaktif; focus-visible terlihat; target sentuh ≥44px.
- **QG-DS6 Responsive:** sidebar → drawer < lg; bottom nav < md; tabel scroll dengan sticky header; grid collapse sesuai G.
- **QG-Universal:** tidak ada dependency eksternal baru; semua ikon dari `@opensis/ui`; reduced-motion dihormati; tidak ada hex ad-hoc (semua token); no-JS fallback untuk link dasar.

### Handoff implementasi (untuk openteam-coder) — urutan yang disarankan

1. **Token dulu:** tempel blok H ke `globals.css` (jangan ubah blok existing). Verifikasi utilitas `bg-app-bg`, `bg-sidebar`, `bg-status-success-bg` tersedia.
2. **Primitif UI baru di packages/ui:** `StatusBadge` (D.6). Tambahkan varian tint pada `Badge` hanya bila diperlukan (rekomendasi: komponen baru).
3. **Komponen shared di apps/web:** `PageHeader` (D.2), `StatCard` + `Sparkline` (D.3), `DataTable` (D.4), `FormPage` + `FormSection` + `ValidationAlert` (D.5), `EmptyStateV3` (D.9), `CommandPalette` (D.7).
4. **AppShell v2:** refactor `app-shell.tsx` sesuai D.1; tambah field `group` di `lib/roles.ts` + tabel grouping D.1.a; polish `notification-panel.tsx` (D.8); pasang hook Cmd+K.
5. **Dashboard:** refactor 5 dashboard role (siswa, guru, admin, superadmin, ortu) sesuai E.1–E.5; HAPUS `Kpi` lokal di admin/dashboard & superadmin/dashboard, ganti `StatCard` (dedupe). Polish `DashboardCards` ikon chip tint brand.
6. **Daftar & form:** terapkan `DataTable` + `PageHeader` ke halaman daftar (kelas, tugas, ujian, absensi, tagihan, change logs, RBAC, dsb.); terapkan `FormPage` ke form utama (buat tugas, buat tagihan, aturan denda, dsb.).
7. **Login split-screen & PPDB polish:** E.7, E.6.
8. **Verifikasi QG-I** di tiap halaman yang diubah; cek kontras badge tint, sticky header, drawer, Cmd+K, reduced-motion.

---

## J. Daftar Gap yang Diperbaiki Spec Ini (traceability)

| Gap identifikasi (dari riset)                | Solusi di spec                                                                          |
| -------------------------------------------- | --------------------------------------------------------------------------------------- |
| Sidebar polos tanpa logo/grouping/user card  | D.1: brand header, grouping section (D.1.a), user card bawah                            |
| Header polos (logo teks, tanpa breadcrumb)   | D.1 Topbar: breadcrumb/konteks + search + notif + theme + user menu                     |
| Dashboard datar (DashboardCards uniform)     | D.3 StatCard + sparkline + delta + tint; urutan solutif E.1–E.5                         |
| KPI duplikat admin/superadmin                | D.3 shared `StatCard`; E.4 langkah 2: hapus Kpi lokal                                   |
| Tidak ada PageHeader/PageSection shared      | D.2 PageHeader + D.5.a FormSection; h1 manual dihapus                                   |
| Tabel dasar tanpa sticky/pagination/aksi     | D.4 DataTable: sticky header, pagination, filter chip, empty row, kolom aksi, responsif |
| EmptyState generik tanpa ilustrasi           | D.9 EmptyStateV3: ikon tint + CTA solutif                                               |
| Tidak ada charts/visualisasi                 | D.3 Sparkline SVG murni (tanpa dependency)                                              |
| Kontainer max-w-6xl sempit                   | C.2: `max-w-7xl` (opsional full-width admin)                                            |
| Dua bahasa visual (landing kaya vs app flat) | B.1 keputusan brand/semantic + seluruh token v3; app "workspace profesional" konsisten  |

---

_Dokumen ini adalah spesifikasi — openteam-coder yang mengimplementasikan. Perubahan desain baru = versi berikutnya di file ini._
