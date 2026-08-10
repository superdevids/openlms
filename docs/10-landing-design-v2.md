# Spesifikasi Desain Landing v2 — Playful × Professional × Creative

**Versi:** 2.0
**Tanggal:** 9 Agustus 2026
**Status:** Final — acuan implementasi openteam-coder (redesign 10 halaman landing)
**Ruang lingkup:** halaman landing publik (home, tentang, kontak, program-keahlian, fasilitas, ekstrakurikuler, prestasi, galeri, testimoni, faq) + aset SVG playful
**Dokumen rujukan:** 07-ux-design.md [v1.1], 01-master-prd.md, globals.css (apps/web/src/app/globals.css), packages/ui (Button/Card/Badge/Accordion), components/landing/motion.tsx
**Konteks teknis:** shadcn/ui + Tailwind v4 + token CSS di globals.css; branding dinamis `--brand-*`; CSP `img-src 'self' data:` → semua ilustrasi harus SVG lokal di `/landing/playful/`.

---

## Ringkasan Eksekutif (BLUF)

**Landing v2 adalah wajah publik sekolah yang "cerdas dan hangat": hierarki profesional (typo tegas, grid teratur, CTA konsisten) dibungkus lapisan playful (blob organik, gradient lembut, ilustrasi ramah, mikro-interaksi hover) sehingga sekolah terlihat modern, kredibel, dan menyenangkan — bukan kaku, bukan kekanakan.** Sepuluh halaman memakai satu sistem token warna/tipografi/spasi yang sama, sembilan komponen aturan baku (PageHero, SectionHeading, CardPlay, StatStrip, QuoteCard, ImageTile, FaqAccordion, BadgeLevel, ChipGroup), dan 21 aset SVG playful yang siap dipasang. Mode terang dan gelap didukung penuh; kontras teks memenuhi WCAG AA di semua varian.

---

## A. Design Principles

| #   | Prinsip                                       | Penjabaran operasional untuk landing v2                                                                                                                                                                                           |
| --- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LP1 | **Playful itu dekoratif, bukan struktural**   | Kepribadian playful datang dari lapisan: blob, gradient, ilustrasi, badge warna, mikro-interaksi hover. Struktur (grid, hierarki, CTA, navigasi) tetap profesional dan konsisten. Jangan merusak grid demi ornamen.               |
| LP2 | **Satu CTA utama per layar**                  | Setiap halaman punya tepat satu CTA primer (PPDB atau kontak) di posisi konsisten: tombol `rounded-full bg-gradient-hero text-white` di hero + ulangan di blok CTA penutup. CTA sekunder selalu `variant="outline"` radius penuh. |
| LP3 | **Warna playful sebagai aksen, bukan kanvas** | Indigo brand tetap memimpin (hero, CTA, link). Amber/pink/teal dipakai untuk aksen kecil: badge level, icon chip, statistik angka, blob, garis top card. Maksimal 2 warna aksen per blok agar tidak ramai.                        |
| LP4 | **Kredibilitas terlihat**                     | Setiap halaman menampilkan sinyal profesional: angka statistik, label level prestasi, gelar/asal kutipan, info kontak nyata, FAQ terstruktur. Playful tidak boleh mengaburkan fakta.                                              |
| LP5 | **Gerakan bermakna & hemat**                  | Pakai FadeInUp/StaggerContainer/StaggerItem dari `motion.tsx` (sudah hormati prefers-reduced-motion). Durasi 0.4–0.6s, ease keluar halus. Hover hanya lift + shadow + scale kecil (1.02–1.05), tanpa perpindahan layout.          |
| LP6 | **Mobile-first, sentuh ramah**                | Layout mulai 320px; target sentuh minimal 44×44px; hero SVG turun di bawah teks pada `md` ke bawah; grid `grid-cols-1 → sm:2 → lg:3`.                                                                                             |
| LP7 | **Aksesibel by default**                      | Kontras AA, fokus keyboard terlihat (`focus-visible` bawaan), SVG dekoratif `aria-hidden="true"`, SVG informatif `role="img"` + `aria-label`, teks alternatif kosong untuk gambar dekoratif.                                      |
| LP8 | **Satu sumber token**                         | Semua warna/radius/shadow/type memakai token (tabel B, C, F). Tidak ada hex ad-hoc di komponen. Token baru dideklarasikan di globals.css (spesifikasi H).                                                                         |

---

## B. Color System

### B.1 Palet playful (dipakai SVG + aksen UI)

| Token CSS           | Light value | Dark value | Peran                                       |
| ------------------- | ----------- | ---------- | ------------------------------------------- |
| `--playful-indigo`  | `#6366f1`   | `#818cf8`  | Warna brand kedua, gradient, ikon           |
| `--playful-violet`  | `#8b5cf6`   | `#a78bfa`  | Gradien indigo→violet (BadgeLevel PROVINSI) |
| `--playful-cyan`    | `#22d3ee`   | `#22d3ee`  | Gradien hero, aksen teal muda               |
| `--playful-teal`    | `#14b8a6`   | `#2dd4bf`  | Aksen teal (StatStrip, badge)               |
| `--playful-emerald` | `#34d399`   | `#34d399`  | Gradien sukses/prestasi                     |
| `--playful-amber`   | `#fbbf24`   | `#fbbf24`  | Aksen hangat (bintang, badge NASIONAL)      |
| `--playful-orange`  | `#fb923c`   | `#fb923c`  | Gradien amber→orange                        |
| `--playful-rose`    | `#fb7185`   | `#fb7185`  | Aksen pink (blob, dekor)                    |
| `--playful-pink`    | `#f472b6`   | `#f9a8d4`  | Gradien pink→rose                           |

### B.2 Permukaan & gradient (token baru untuk landing)

| Token CSS              | Light value                                                      | Dark value                                                       | Peran                                                                   |
| ---------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `--surface-soft`       | `#f6f7fc`                                                        | `#101218`                                                        | Background halaman landing (subtitusi `--background` di halaman publik) |
| `--surface-soft-2`     | `#eef0f8`                                                        | `#181b24`                                                        | Background blok selang-seling / panel                                   |
| `--surface-card-soft`  | `#ffffff`                                                        | `#161922`                                                        | Kartu di atas `--surface-soft`                                          |
| `--gradient-hero`      | `linear-gradient(135deg, #4f46e5 0%, #6366f1 42%, #22d3ee 100%)` | `linear-gradient(135deg, #312e81 0%, #4338ca 45%, #0e7490 100%)` | CTA primer, hero gelap, StatStrip                                       |
| `--gradient-hero-soft` | `linear-gradient(180deg, #eef2ff 0%, #f6f7fc 100%)`              | `linear-gradient(180deg, #141724 0%, #101218 100%)`              | Background hero terang / header halaman                                 |
| `--gradient-amber`     | `linear-gradient(135deg, #f59e0b, #f97316)`                      | sama                                                             | Badge NASIONAL, aksen hangat                                            |
| `--gradient-pink`      | `linear-gradient(135deg, #ec4899, #fb7185)`                      | sama                                                             | Badge/ikon kreatif (ekstrakurikuler)                                    |
| `--gradient-teal`      | `linear-gradient(135deg, #10b981, #06b6d4)`                      | sama                                                             | Badge INTERNASIONAL, aksen teal                                         |
| `--gradient-indigo`    | `linear-gradient(135deg, #6366f1, #8b5cf6)`                      | sama                                                             | Icon chip, BadgeLevel PROVINSI                                          |
| `--gradient-text`      | `linear-gradient(135deg, #4f46e5, #06b6d4)`                      | `linear-gradient(135deg, #a5b4fc, #22d3ee)`                      | Angka statistik & kata kunci (background-clip: text)                    |

### B.3 Teks aksen (kontras aman WCAG AA)

| Token CSS              | Light value | Dark value | Dipakai untuk            |
| ---------------------- | ----------- | ---------- | ------------------------ |
| `--accent-indigo-text` | `#4338ca`   | `#a5b4fc`  | Link/teks brand sekunder |
| `--accent-amber-text`  | `#92400e`   | `#fcd34d`  | Label hangat, bintang    |
| `--accent-pink-text`   | `#be185d`   | `#f9a8d4`  | Label kreatif            |
| `--accent-teal-text`   | `#0f766e`   | `#5eead4`  | Label teal               |

### B.4 Semantik & kontras (checklist wajib)

| Pairing                                              | Rasio ± | Status                                                 |
| ---------------------------------------------------- | ------- | ------------------------------------------------------ |
| `#171717` on `#ffffff` / `--surface-card-soft`       | ~19:1   | AA (teks biasa)                                        |
| `#6b7280` (`--muted-foreground`) on `#ffffff`        | ~4.8:1  | AA (teks kecil)                                        |
| `#fafafa` on `--gradient-hero` (indigo area)         | ~5:1    | AA (teks putih di hero/CTA)                            |
| `#ffffff` on `--gradient-indigo` (#6366f1)           | ~4.9:1  | AA (ikon chip putih)                                   |
| `#78350f` on `--playful-amber` / `--gradient-amber`  | ~5.4:1  | AA — teks badge NASIONAL HARUS gelap, bukan putih      |
| `#064e3b` on `--playful-emerald` / `--gradient-teal` | ~4.6:1  | AA — teks badge INTERNASIONAL HARUS gelap              |
| `#083344` on `--playful-cyan`                        | ~4.5:1  | AA — teks badge KABUPATEN HARUS gelap                  |
| `#ffffff` on `--playful-rose` (#fb7185)              | ~3.8:1  | Hanya teks BESAR/dekoratif; teks kecil pakai `#881337` |

**Aturan teks di atas gradient:** teks putih hanya di area indigo (gelap) gradient; jangan menaruh teks kecil di ujung cyan/amber. Untuk teks pada aksen terang (amber/emerald/cyan) selalu gunakan teks gelap (kolom B.3).

**Varian gelap:** token pada kolom Dark value menggantikan nilai light otomatis saat `.dark`. Jangan ubah `--background`/`--card` global (dipakai aplikasi login/dashboard); landing memakai `--surface-*` sendiri.

---

## C. Typography (Plus Jakarta Sans — sudah di `--font-sans`)

| Role           | Class Tailwind                                       | Size    | Weight | Line-height       | Letter-spacing | Pemakaian                                         |
| -------------- | ---------------------------------------------------- | ------- | ------ | ----------------- | -------------- | ------------------------------------------------- |
| Display (hero) | `text-4xl md:text-5xl font-extrabold tracking-tight` | 36/48px | 800    | `leading-[1.1]`   | `-0.025em`     | H1 hero, angka StatStrip                          |
| H1 (halaman)   | `text-4xl font-extrabold tracking-tight`             | 36px    | 800    | `leading-[1.15]`  | `-0.025em`     | Judul header halaman                              |
| H2 (section)   | `text-3xl md:text-4xl font-bold tracking-tight`      | 30/36px | 700    | `leading-[1.2]`   | `-0.02em`      | Judul setiap section                              |
| H3 (card)      | `text-xl font-bold`                                  | 20px    | 700    | `leading-snug`    | `0`            | Judul kartu                                       |
| H4 (sub)       | `text-lg font-semibold`                              | 18px    | 600    | `leading-snug`    | `0`            | Judul kecil/panel                                 |
| Body           | `text-base`                                          | 16px    | 400    | `leading-relaxed` | `0`            | Paragraf deskripsi                                |
| Body small     | `text-sm`                                            | 14px    | 400    | `leading-relaxed` | `0`            | Keterangan kartu                                  |
| Eyebrow        | `text-xs font-bold uppercase tracking-wide`          | 12px    | 700    | `leading-4`       | `0.08em`       | Label kecil di atas H2 (SectionHeading)           |
| Caption        | `text-xs`                                            | 12px    | 500    | `leading-4`       | `0`            | Meta, pembina, tanggal                            |
| Quote          | `text-base md:text-lg font-medium italic`            | 16/18px | 500    | `leading-relaxed` | `0`            | Kutipan testimoni                                 |
| Stat number    | `text-4xl md:text-5xl font-extrabold tracking-tight` | 36/48px | 800    | `leading-none`    | `-0.025em`     | Angka di StatStrip (pakai `--gradient-text` clip) |

Aturan: maksimal 2 level heading berbeda per blok; paragraf tidak pernah lebih kecil dari 14px; jangan gunakan `font-light` untuk body di atas `--surface-soft` (kontras rendah). Kata kunci bisa diberi `bg-gradient-text bg-clip-text text-transparent` untuk sentuhan kreatif (hanya pada font ≥20px).

---

## D. Component Recipes

Semua komponen memakai primitif `packages/ui` (Card, Badge, Button, Accordion) + `motion.tsx`. Contoh kelas Tailwind di bawah adalah preskriptif.

### D.1 PageHero

**Layout:** section `relative overflow-hidden` dengan background `bg-surface-soft` ATAU `bg-gradient-hero-soft`; blob SVG absolut di pojok; grid 2 kolom di `md` (teks kiri, ilustrasi kanan); teks pakai H1/Display + lead; CTA primer `rounded-full bg-gradient-hero text-white` + sekunder `rounded-full border` (outline).

```tsx
<section className="relative overflow-hidden bg-surface-soft">
  <img
    src="/landing/playful/play-blob-1.svg"
    alt=""
    aria-hidden="true"
    className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
  />
  <img
    src="/landing/playful/play-spark.svg"
    alt=""
    aria-hidden="true"
    className="pointer-events-none absolute right-8 top-10 h-10 w-10 opacity-80"
  />
  <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
    <FadeInUp>
      <div>
        <span className="inline-flex items-center gap-2 rounded-full border border-brand-primary/30 bg-brand-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-primary">
          <img
            src="/landing/playful/play-star.svg"
            alt=""
            aria-hidden="true"
            className="h-3.5 w-3.5"
          />
          Eyebrow label
        </span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">Judul Hero</h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Deskripsi singkat.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Button
            size="lg"
            className="rounded-full bg-gradient-hero text-white shadow-soft hover:shadow-lift"
          >
            CTA Utama
          </Button>
          <Button size="lg" variant="outline" className="rounded-full">
            CTA Sekunder
          </Button>
        </div>
      </div>
    </FadeInUp>
    <FadeInUp delay={0.15}>
      <div className="relative">
        <img
          src="/landing/playful/play-hero-school.svg"
          alt="Ilustrasi ..."
          role="img"
          className="w-full"
        />
      </div>
    </FadeInUp>
  </div>
</section>
```

**Varian:** hero gelap = `bg-gradient-hero text-white` (semua teks & CTA sekunder disesuaikan: `border-white/40 text-white hover:bg-white/10`); hanya dipakai di home/prestasi untuk kontras antar halaman.

### D.2 SectionHeading

**Layout:** container `mx-auto max-w-2xl`; varian `text-center` (default) atau `text-left`; eyebrow badge + H2 + deskripsi.

```tsx
<div className="mx-auto max-w-2xl text-center">
  <span className="inline-flex items-center gap-2 rounded-full bg-gradient-indigo px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
    <img src="/landing/playful/play-spark.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5" />
    {eyebrow}
  </span>
  <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">{title}</h2>
  <p className="mt-4 text-base text-muted-foreground">{description}</p>
</div>
```

Bagian ini dibungkus `FadeInUp`; beri `mb-12` pada wrapper luar.

### D.3 CardPlay

**Layout:** Card `relative h-full overflow-hidden rounded-3xl bg-card shadow-soft`; strip gradient 6px di atas card; icon chip bulat gradient; H3 + body small + tautan "Selengkapnya" dengan panah.

```tsx
<Card className="group relative h-full overflow-hidden rounded-3xl bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
  <div
    className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-brand-primary to-playful-cyan"
    aria-hidden="true"
  />
  <CardContent className="flex h-full flex-col p-6">
    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-indigo text-white shadow-soft">
      <img src={icon} alt="" aria-hidden="true" className="h-6 w-6" />
    </div>
    <h3 className="mt-4 text-xl font-bold">{title}</h3>
    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
    <Link
      href={href}
      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-brand-primary hover:gap-2 transition-all"
    >
      Selengkapnya <span aria-hidden="true">→</span>
    </Link>
  </CardContent>
</Card>
```

Varian aksen: ganti warna strip gradient per kategori (`from-playful-amber to-playful-rose`, `from-playful-teal to-playful-cyan`). Grid pembungkus: `StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3"` + `StaggerItem className="h-full"`.

### D.4 StatStrip

**Layout:** band `bg-gradient-hero` (atau `bg-surface-soft-2` di mode terang halus); 2–4 angka besar; angka memakai `bg-gradient-text bg-clip-text text-transparent` bila di atas latar terang, atau putih bila di atas gradient gelap.

```tsx
<section className="bg-gradient-hero text-white">
  <StaggerContainer className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 py-14 md:grid-cols-4">
    {stats.map((s) => (
      <StaggerItem key={s.label} className="text-center">
        <p className="text-4xl font-extrabold tracking-tight md:text-5xl">{s.value}</p>
        <p className="mt-1 text-sm font-medium text-white/85">{s.label}</p>
      </StaggerItem>
    ))}
  </StaggerContainer>
</section>
```

**Kontras:** di atas `--gradient-hero`, angka `text-white`, label `text-white/85` (≥4.5:1 di area indigo). Varian terang: band `bg-surface-soft-2`, angka `bg-gradient-text bg-clip-text text-transparent`, label `text-muted-foreground`.

### D.5 QuoteCard

**Layout:** `figure` `relative rounded-3xl bg-card p-6 shadow-soft`; ikon kutipan (play-testimonial.svg atau glyph) di pojok; baris bintang `play-star.svg` warna `--playful-amber`; blockquote italic; figcaption avatar bundar + nama + peran.

```tsx
<figure className="flex h-full flex-col rounded-3xl bg-card p-6 shadow-soft transition-shadow hover:shadow-lift">
  <div className="flex items-center justify-between">
    <div className="flex gap-1" aria-label="Rating 5 dari 5">
      {[1, 2, 3, 4, 5].map((i) => (
        <img
          key={i}
          src="/landing/playful/play-star.svg"
          alt=""
          aria-hidden="true"
          className="h-4 w-4"
        />
      ))}
    </div>
    <img
      src="/landing/playful/play-testimonial.svg"
      alt=""
      aria-hidden="true"
      className="h-8 w-8 opacity-70"
    />
  </div>
  <blockquote className="mt-4 flex-1 text-base italic leading-relaxed text-foreground">
    “{quote}”
  </blockquote>
  <figcaption className="mt-5 flex items-center gap-3 border-t border-border pt-4">
    <img src={avatar} alt="" className="h-11 w-11 rounded-full bg-muted" />
    <div>
      <p className="text-sm font-bold">{name}</p>
      <p className="text-xs text-muted-foreground">{role}</p>
    </div>
  </figcaption>
</figure>
```

### D.6 ImageTile

**Layout:** `figure group relative overflow-hidden rounded-2xl shadow-soft`; SVG ilustrasi `aspect-[4/3] w-full object-cover` (SVG aman untuk ini karena viewBox tetap); overlay caption gradient gelap di bawah; hover zoom `scale-105` + duration 500.

```tsx
<figure className="group relative overflow-hidden rounded-2xl shadow-soft">
  <img
    src={src}
    alt={alt}
    className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-105"
  />
  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
    <p className="text-sm font-bold text-white">{caption}</p>
  </figcaption>
</figure>
```

Galeri masonry: `columns-1 sm:columns-2 lg:columns-3 gap-4` + `mb-4 break-inside-avoid`.

### D.7 FaqAccordion

**Layout:** `Accordion` dari packages/ui (Radix) `type="single" collapsible` dalam `mx-auto max-w-3xl space-y-3`; item `rounded-2xl border border-border bg-card px-5 shadow-soft`; trigger flex dengan ChevronDown rotate; konten body small.

```tsx
<Accordion type="single" collapsible className="mx-auto max-w-3xl space-y-3">
  {faqs.map((f) => (
    <AccordionItem
      key={f.q}
      value={f.q}
      className="rounded-2xl border border-border bg-card px-5 shadow-soft transition-shadow data-[state=open]:shadow-lift"
    >
      <AccordionTrigger className="flex w-full items-center justify-between gap-4 py-4 text-left text-base font-semibold">
        {f.q}
        <ChevronDown className="h-5 w-5 shrink-0 text-brand-primary transition-transform data-[state=open]:rotate-180" />
      </AccordionTrigger>
      <AccordionContent className="pb-4 text-sm leading-relaxed text-muted-foreground">
        {f.a}
      </AccordionContent>
    </AccordionItem>
  ))}
</Accordion>
```

### D.8 BadgeLevel

**Layout:** pill `rounded-full px-3 py-1 text-xs font-bold` + ikon kecil; warna per level mengikuti map (kontras AA — lihat B.4).

```tsx
const LEVEL_STYLE: Record<string, string> = {
  INTERNASIONAL: "bg-gradient-teal text-[#064e3b]",
  NASIONAL: "bg-gradient-amber text-[#78350f]",
  PROVINSI: "bg-gradient-indigo text-white",
  KABUPATEN: "bg-playful-cyan text-[#083344]",
  SEKOLAH: "bg-muted text-muted-foreground"
};
<span
  className={cn(
    "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold",
    LEVEL_STYLE[level]
  )}
>
  <img src="/landing/playful/play-check.svg" alt="" aria-hidden="true" className="h-3.5 w-3.5" />
  {level}
</span>;
```

Catatan: `text-white` HANYA untuk gradient indigo/violet (kontras 4.9:1). Badge terang (amber/emerald/cyan) wajib teks gelap.

### D.9 ChipGroup

**Layout:** baris `flex flex-wrap justify-center gap-2`; chip `rounded-full border px-4 py-2 text-sm font-medium transition-all`; aktif = `border-brand-primary bg-brand-primary text-white shadow-soft`; nonaktif = `border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary`; `aria-pressed` per tombol (pola sama dengan filter prestasi existing).

```tsx
<div className="flex flex-wrap justify-center gap-2" role="group" aria-label="Filter">
  {chips.map((c) => (
    <button
      key={c.value}
      type="button"
      aria-pressed={c.active}
      onClick={c.onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-all",
        c.active
          ? "border-brand-primary bg-brand-primary text-white shadow-soft"
          : "border-border bg-card text-foreground hover:border-brand-primary hover:text-brand-primary"
      )}
    >
      {c.label}
    </button>
  ))}
</div>
```

---

## E. Page Blueprints (10 halaman)

Konvensi: `Header landing` (landing-header.tsx) + `Footer landing` ada di semua halaman. Setiap section dibungkus `FadeInUp`/`StaggerContainer`. Spasi antar section: `py-16 md:py-20`; section selang-seling `bg-surface-soft` / `bg-background`.

### E.1 Home (`/`)

1. **PageHero** (gelap, `bg-gradient-hero`) — headline + CTA PPDB + `play-hero-school.svg` + `play-blob-2.svg` dekor.
2. **StatStrip** (terang, `bg-surface-soft-2`) — 4 statistik (siswa, guru, program, prestasi) angka `bg-gradient-text`.
3. **Program Keahlian** — SectionHeading + CardPlay grid ×3 (pakai `play-program.svg` di icon chip) + CTA "Lihat semua program".
4. **Fasilitas highlight** — SectionHeading (kiri) + ImageTile ×3 (`play-facility.svg`, `play-gallery.svg`).
5. **Ekstrakurikuler preview** — SectionHeading + CardPlay ×4 (`play-extracurricular.svg`, aksen gradient-pink/teal/amber/indigo).
6. **Prestasi preview** — SectionHeading + BadgeLevel 3 prestasi unggulan (StatStrip mini, `play-achievement.svg`).
7. **Testimoni preview** — SectionHeading + QuoteCard ×3 (`play-testimonial.svg`).
8. **CTA PPDB** — band `bg-gradient-hero` + `play-ppdb.svg` + tombol putih (`bg-white text-brand-primary rounded-full`).
9. **FAQ preview** — SectionHeading + FaqAccordion 3–4 item.
10. **Kontak strip** — info kontak singkat (alamat/email/telp) + `play-contact.svg`.

### E.2 Tentang (`/tentang`)

1. **PageHero** (terang, `bg-gradient-hero-soft`) — `play-about.svg`, eyebrow "Profil Sekolah".
2. **Visi & Misi** — 2 kolom (CardPlay besar): kartu Visi + kartu Misi, icon `play-star.svg`/`play-check.svg`.
3. **Sejarah & struktur** — teks + `play-about.svg` kecil (atau landing-about-structure.svg existing) dalam ImageTile.
4. **StatStrip** — tahun berdiri, jumlah alumni, dsb.
5. **Nilai sekolah** — grid CardPlay ×3–4 (akademik, karakter, digital, religius).
6. **CTA** — band gradient + tombol kontak.

### E.3 Kontak (`/kontak`)

1. **PageHero** (terang) — `play-contact.svg`, CTA sekunder "Hubungi via WhatsApp".
2. **Info kontak** — grid CardPlay ×3: alamat (pin), email, telepon — `play-contact.svg` di icon chip.
3. **Form kontak** — Card `rounded-3xl` + `contact-form.tsx` existing (label eksplisit, `aria-required`), status error/sukses jelas.
4. **Peta** — ImageTile placeholder (SVG lokal) + alamat lengkap.
5. **FAQ mini** — FaqAccordion 2–3 item.

### E.4 Program Keahlian (`/program-keahlian`)

1. **PageHero** (terang) — `play-program.svg`.
2. **ChipGroup** filter kompetensi (RPL, TKR, Multimedia, Akuntansi, dst.) — nonaktif = hanya UI (data filter opsional).
3. **CardPlay grid** per program — icon chip masing-masing (`landing-prog-*.svg` existing BISA dipakai di dalam chip), aksen gradient berbeda per kartu.
4. **StatStrip** — jumlah lulusan per bidang.
5. **CTA PPDB** — band gradient + `play-ppdb.svg`.

### E.5 Fasilitas (`/fasilitas`)

1. **PageHero** (terang) — `play-facility.svg`.
2. **ImageTile grid** (`sm:2 lg:3`) — lab, perpustakaan, lapangan, aula, kantin, mushola (`play-facility.svg` + existing `landing-fac-hero.svg`).
3. **Fitur list** — 2 kolom: daftar fasilitas dengan `play-check.svg` (pill hijau) vs "dalam pengembangan" (amber).
4. **CTA** — tombol kunjungi sekolah.

### E.6 Ekstrakurikuler (`/ekstrakurikuler`)

1. **PageHero** (terang) — `play-extracurricular.svg`.
2. **ChipGroup** kategori (Olahraga, Seni, Sains, Keagamaan).
3. **CardPlay grid** — tiap ekskul icon + aksen gradient (pink/teal/amber/indigo), jadwal singkat di body.
4. **StatStrip** — jumlah ekskul, anggota, prestasi.
5. **CTA** — daftar ekskul.

### E.7 Prestasi (`/prestasi`)

1. **PageHero** (gelap, `bg-gradient-hero`) — `play-achievement.svg`, badge "Prestasi" putih.
2. **StatStrip** (terang) — total medali/penghargaan per level.
3. **ChipGroup** filter level (SEMUA/INTERNASIONAL/…/SEKOLAH — reuse logika `prestasi-section.tsx`).
4. **Prestasi cards** — `prestasi-grid.tsx` + `prestasi-section.tsx` existing dipoles: CardPlay + BadgeLevel D.8.
5. **CTA** — bangga alumni / ikut kompetisi.

### E.8 Galeri (`/galeri`)

1. **PageHero** (terang) — `play-gallery.svg`.
2. **ChipGroup** kategori (Kegiatan, Lomba, Wisuda, Keseharian).
3. **ImageTile masonry** (`columns-1 sm:2 lg:3`) — `landing-gal-*.svg` existing + `play-gallery.svg` placeholder baru.
4. **CTA** — ikuti media sosial / kunjungi.

### E.9 Testimoni (`/testimoni`)

1. **PageHero** (terang) — `play-testimonial.svg`, eyebrow "Kata Mereka".
2. **Featured QuoteCard** — 1 kutipan besar (`text-lg`, gradient border) dari alumni/industri.
3. **QuoteCard grid** — 3–6 kutipan siswa/orang tua/industri + avatar `landing-tes-avatar.svg`.
4. **CTA** — jadi bagian sekolah.

### E.10 FAQ (`/faq`)

1. **PageHero** (terang) — `play-faq.svg`, eyebrow "Pusat Bantuan".
2. **ChipGroup** kategori FAQ (PPDB, akademik, pembayaran, teknis) — anchor scroll ke grup.
3. **FaqAccordion** ×3–4 grup (masing-masing 3–5 item).
4. **CTA kontak** — belum terjawab? hubungi via form/WhatsApp (`play-contact.svg`).

---

## F. Consistency Rules

### F.1 Radius

| Elemen                                                                                                      | Nilai                                                           |
| ----------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Tombol CTA & chip                                                                                           | `rounded-full`                                                  |
| Kartu (CardPlay, QuoteCard, form, accordion item)                                                           | `rounded-3xl` (atau `rounded-[1.5rem]` bila brand-radius kecil) |
| Icon chip dalam kartu                                                                                       | `rounded-2xl`                                                   |
| Gambar/ImageTile                                                                                            | `rounded-2xl`                                                   |
| Input form                                                                                                  | `rounded-xl`                                                    |
| Skala mengikuti `--radius-brand`; hanya elemen playful yang memakai `rounded-full`/`rounded-3xl` eksplisit. |

### F.2 Spacing

- Container: `mx-auto max-w-6xl px-4`.
- Spasi section: `py-16 md:py-20`; antar grid: `gap-4`–`gap-6`; CardPlay grid: `gap-5`.
- Ritme vertikal dalam kartu: ikon→`mt-4`→judul→`mt-2`→paragraf→`mt-4`→link; konsisten di semua kartu.
- Header landing: `h-16`; tinggi CTA: `h-11` (sm) / `h-12` (lg).

### F.3 Shadow

| Token                                                               | Nilai                                | Pemakaian                   |
| ------------------------------------------------------------------- | ------------------------------------ | --------------------------- |
| `--shadow-soft`                                                     | `0 8px 30px rgb(67 56 202 / 0.10)`   | Default kartu, chip aktif   |
| `--shadow-lift`                                                     | `0 20px 45px rgb(67 56 202 / 0.16)`  | Hover kartu, accordion open |
| `--shadow-blob`                                                     | `0 12px 40px rgb(34 211 238 / 0.18)` | Blob dekoratif              |
| Hover kartu: `hover:-translate-y-1 hover:shadow-lift` duration 300. |

### F.4 Icon style

- Ikon SVG dekoratif: stroke `2px`, `stroke-linecap="round"`, `stroke-linejoin="round"`, grid 24×24.
- Ikon playful (`play-*.svg`): fill gradient lembut, outline tebal ramah (`stroke-width` 8–12 pada viewBox 400).
- Ukuran dalam UI: icon chip `h-6 w-6`; ikon inline kecil `h-3.5 w-3.5`–`h-5 w-5`; blob dekor `h-56 w-56`–`h-80 w-80`, opacity 50–70%.

### F.5 Image treatment

- Hanya SVG lokal (`/landing/playful/*.svg` + existing `/landing/landing-*.svg`) — wajib karena CSP `img-src 'self' data:`.
- SVG informatif: `role="img"` + `aria-label`; dekoratif: `alt="" aria-hidden="true"`.
- ImageTile: `aspect-[4/3] object-cover`; hover `scale-105`.
- Jangan gunakan `<img>` raster baru; tidak ada dependency eksternal.

### F.6 Motion

- Hanya `motion.tsx`: `FadeInUp` (delay 0–0.2s), `StaggerContainer`+`StaggerItem` (stagger 0.08s default).
- Durasi 0.45–0.6s; `ease` default dari motion.tsx; `viewport once`.
- Hover: lift/shadow/scale kecil (1.02–1.05); tidak ada animasi layout lain tanpa alasan.
- Reduced-motion: otomatis dinonaktifkan oleh `useReducedMotion` di motion.tsx + CSS `prefers-reduced-motion` di globals.css.

### F.7 Aksesibilitas (QG-DS4/DS5)

- Kontras: patuhi tabel B.4; teks pada aksen terang = teks gelap.
- Fokus: `focus-visible` bawaan (outline `--color-ring` 2px); tombol filter `aria-pressed`; accordion keyboard-native Radix.
- Judul berurutan: satu `h1` per halaman (hero), `h2` per section, `h3` per kartu.
- Target sentuh ≥44×44px (`touch-target` bila perlu).
- Semua SVG dekoratif `aria-hidden="true"` agar tidak dibaca screen reader.

---

## G. Aset SVG Playful — `apps/web/public/landing/playful/`

Gaya: gradient lembut (#6366f1, #22d3ee, #fbbf24, #fb7185, #34d399), bentuk organik/blob, outline tebal ramah, viewBox 240–480, valid XML, ukuran kecil (<2 KB).

| File                                               | Pemakaian                                                                              |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `play-blob-1.svg` … `play-blob-4.svg`              | Blob dekoratif pojok hero/section (indigo→cyan, rose→amber, emerald→cyan, indigo→rose) |
| `play-dots.svg`, `play-grid.svg`, `play-waves.svg` | Pattern latar section (opacity rendah, aria-hidden)                                    |
| `play-hero-school.svg`                             | Hero home                                                                              |
| `play-about.svg`                                   | Hero tentang + visi misi                                                               |
| `play-contact.svg`                                 | Hero kontak + info kontak                                                              |
| `play-program.svg`                                 | Hero program keahlian + chip program                                                   |
| `play-facility.svg`                                | Hero fasilitas + ImageTile                                                             |
| `play-extracurricular.svg`                         | Hero ekstrakurikuler                                                                   |
| `play-achievement.svg`                             | Hero prestasi + badge                                                                  |
| `play-gallery.svg`                                 | Hero galeri + placeholder galeri                                                       |
| `play-testimonial.svg`                             | Hero testimoni + QuoteCard                                                             |
| `play-faq.svg`                                     | Hero FAQ                                                                               |
| `play-ppdb.svg`                                    | Band CTA PPDB                                                                          |
| `play-star.svg`                                    | Rating, eyebrow, dekorasi                                                              |
| `play-spark.svg`                                   | Dekorasi kecil, SectionHeading eyebrow                                                 |
| `play-check.svg`                                   | BadgeLevel, fitur list                                                                 |

Catatan: aset existing di `/landing/` (landing-prog-_.svg, landing-fac-hero.svg, landing-gal-_.svg, landing-tes-avatar.svg, landing-about-*.svg) tetap dipakai untuk konten spesifik — v2 tidak menghapus aset lama, hanya menambah lapisan playful.

---

## H. Token CSS — Tambahan yang HARUS masuk `globals.css` (oleh openteam-coder)

Blok berikut ditambahkan: (1) deklarasi nilai di `:root` dan `.dark`, (2) ekspos di `@theme inline` agar bisa dipakai sebagai utilitas Tailwind (`bg-surface-soft`, `bg-gradient-hero`, dst.). Jangan ubah blok token existing.

```css
/* ===== Landing v2 tokens ===== */
:root {
  --surface-soft: #f6f7fc;
  --surface-soft-2: #eef0f8;
  --surface-card-soft: #ffffff;
  --gradient-hero: linear-gradient(135deg, #4f46e5 0%, #6366f1 42%, #22d3ee 100%);
  --gradient-hero-soft: linear-gradient(180deg, #eef2ff 0%, #f6f7fc 100%);
  --gradient-amber: linear-gradient(135deg, #f59e0b, #f97316);
  --gradient-pink: linear-gradient(135deg, #ec4899, #fb7185);
  --gradient-teal: linear-gradient(135deg, #10b981, #06b6d4);
  --gradient-indigo: linear-gradient(135deg, #6366f1, #8b5cf6);
  --gradient-text: linear-gradient(135deg, #4f46e5, #06b6d4);
  --playful-indigo: #6366f1;
  --playful-violet: #8b5cf6;
  --playful-cyan: #22d3ee;
  --playful-teal: #14b8a6;
  --playful-emerald: #34d399;
  --playful-amber: #fbbf24;
  --playful-orange: #fb923c;
  --playful-rose: #fb7185;
  --playful-pink: #f472b6;
  --accent-indigo-text: #4338ca;
  --accent-amber-text: #92400e;
  --accent-pink-text: #be185d;
  --accent-teal-text: #0f766e;
  --shadow-soft: 0 8px 30px rgb(67 56 202 / 0.1);
  --shadow-lift: 0 20px 45px rgb(67 56 202 / 0.16);
  --shadow-blob: 0 12px 40px rgb(34 211 238 / 0.18);
}
.dark {
  --surface-soft: #101218;
  --surface-soft-2: #181b24;
  --surface-card-soft: #161922;
  --gradient-hero: linear-gradient(135deg, #312e81 0%, #4338ca 45%, #0e7490 100%);
  --gradient-hero-soft: linear-gradient(180deg, #141724 0%, #101218 100%);
  --gradient-text: linear-gradient(135deg, #a5b4fc, #22d3ee);
  --playful-indigo: #818cf8;
  --playful-violet: #a78bfa;
  --playful-teal: #2dd4bf;
  --playful-pink: #f9a8d4;
  --accent-indigo-text: #a5b4fc;
  --accent-amber-text: #fcd34d;
  --accent-pink-text: #f9a8d4;
  --accent-teal-text: #5eead4;
}
@theme inline {
  --color-surface-soft: var(--surface-soft);
  --color-surface-soft-2: var(--surface-soft-2);
  --color-surface-card-soft: var(--surface-card-soft);
  --color-playful-indigo: var(--playful-indigo);
  --color-playful-violet: var(--playful-violet);
  --color-playful-cyan: var(--playful-cyan);
  --color-playful-teal: var(--playful-teal);
  --color-playful-emerald: var(--playful-emerald);
  --color-playful-amber: var(--playful-amber);
  --color-playful-orange: var(--playful-orange);
  --color-playful-rose: var(--playful-rose);
  --color-playful-pink: var(--playful-pink);
  --color-accent-indigo-text: var(--accent-indigo-text);
  --color-accent-amber-text: var(--accent-amber-text);
  --color-accent-pink-text: var(--accent-pink-text);
  --color-accent-teal-text: var(--accent-teal-text);
  --shadow-soft: var(--shadow-soft);
  --shadow-lift: var(--shadow-lift);
  --shadow-blob: var(--shadow-blob);
  /* bg-gradient-hero dst. dipakai via inline style ATAU utilitas bg-[image:var(--gradient-hero)];
     bila perlu utilitas nama, tambahkan @utility di bagian components. */
}
```

Contoh pemakaian di komponen:

- `bg-surface-soft`, `bg-surface-soft-2`, `bg-playful-cyan`, `text-accent-amber-text`, `shadow-soft`, `shadow-lift`.
- Gradient: `style={{ backgroundImage: "var(--gradient-hero)" }}` untuk band/CTA (paling andal) — atau tambahkan `@utility bg-gradient-hero { background-image: var(--gradient-hero); }` di `@layer utilities` jika ingin kelas.

---

## I. Quality Gates (dicek openteam-coder sebelum selesai)

- **QG-DS1** Clear visual hierarchy: 1 h1 per halaman, CTA primer jelas.
- **QG-DS2** Consistent spacing: semua kartu memakai ritme F.2.
- **QG-DS3** Readable type: body ≥14px, heading mengikuti C.
- **QG-DS4** WCAG AA: pasangan warna sesuai B.4 (badge terang wajib teks gelap).
- **QG-DS5** Interactive states: hover/focus/active/disabled pada tombol, chip, accordion.
- **QG-DS6** Responsive: hero SVG turun di bawah teks < md; grid collapse; target sentuh 44px.
- **QG-Universal:** tidak ada raster/eksternal image (CSP), semua SVG lokal, reduced-motion dihormati.

---

## J. Handoff Implementasi (untuk openteam-coder)

1. Tambahkan token H ke `globals.css` (jangan ubah blok existing).
2. Salin seluruh isi `/landing/playful/` (21 file) — sudah ada di repo.
3. Bangun komponen D.1–D.9 (bisa dimulai dari komponen existing: `prestasi-section.tsx` → CardPlay + BadgeLevel + ChipGroup; `contact-form.tsx` → form kontak).
4. Terapkan blueprint E.1–E.10 per halaman; pakai existing `landing-header.tsx`, `landing-footer.tsx`, `motion.tsx`.
5. Verifikasi QG I; pastikan SVG dekoratif `aria-hidden`, SVG informatif `role="img"`.
