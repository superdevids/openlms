import type { Metadata } from "next";
import Link from "next/link";
import { type JSX, type ReactNode } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@opensis/ui";
import { FadeInUp, StaggerContainer, StaggerItem } from "@/components/landing/motion";
import { ContactForm } from "@/components/landing/contact-form";
import { safeUrl } from "@/lib/safe-url";
import { APP_NAME } from "@/lib/constants";
import { getContact } from "@/lib/landing-pages";

/**
 * Halaman Hubungi Kami — PAGE MANDIRI (redesign landing v2, E.3).
 * Data via helper lib/landing-pages (GET /public/contact): telepon/email/
 * alamat/jam layanan, kanal sosial media, peta (mapsEmbedUrl via safeUrl),
 * dan form kontak DEMO (statis, tidak mengirim API — komponen ContactForm).
 * ISR 30s; fallback aman bila API offline.
 * Header/footer otomatis dari layout (landing).
 * Token landing v2 (--surface-soft, --gradient-*, --playful-*, --shadow-*)
 * dideklarasikan di globals.css oleh blok "Landing v2 tokens".
 */

export const revalidate = 30;

const STRIP_GRADIENTS = [
  "var(--gradient-indigo)",
  "var(--gradient-pink)",
  "var(--gradient-teal)",
  "var(--gradient-amber)"
];

/** Badge eyebrow playful (D.2) — gradient pill dengan ikon SVG kecil. */
function Eyebrow({
  children,
  icon = "/landing/playful/play-spark.svg",
  gradient = "var(--gradient-indigo)"
}: {
  children: ReactNode;
  icon?: string;
  gradient?: string;
}): JSX.Element {
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide text-white"
      style={{ backgroundImage: gradient }}
    >
      <img src={icon} alt="" aria-hidden="true" className="h-3.5 w-3.5" />
      {children}
    </span>
  );
}

/** Kartu info kontak playful (D.3): strip gradient + icon chip play-contact. */
function ContactCard({
  title,
  value,
  index = 0
}: {
  title: string;
  value: string;
  index?: number;
}): JSX.Element {
  const gradient = STRIP_GRADIENTS[index % STRIP_GRADIENTS.length];
  return (
    <Card className="group relative h-full overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-lift)]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-0 h-1.5"
        style={{ backgroundImage: gradient }}
      />
      <CardContent className="flex h-full flex-col p-6">
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)] transition-transform duration-300 group-hover:scale-105"
          style={{ backgroundImage: gradient }}
        >
          <img
            src="/landing/playful/play-contact.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </span>
        <h3 className="mt-4 text-xl font-bold text-foreground">{title}</h3>
        <p className="mt-2 flex-1 break-words text-sm leading-relaxed text-muted-foreground">
          {value}
        </p>
      </CardContent>
    </Card>
  );
}

export const metadata: Metadata = {
  title: `Hubungi Kami — ${APP_NAME}`,
  description: "Informasi kontak, alamat, jam layanan, dan kanal sosial media sekolah."
};

export default async function KontakPage(): Promise<JSX.Element> {
  const contact = await getContact();

  const whatsapp = contact.whatsapp?.replace(/[^0-9]/g, "") ?? "";
  const instagram = safeUrl(contact.instagram);
  const facebook = safeUrl(contact.facebook);
  const youtube = safeUrl(contact.youtube);
  const mapsEmbed = safeUrl(contact.mapsEmbedUrl);
  const hasSocials = Boolean(whatsapp || instagram || facebook || youtube);

  return (
    <div className="bg-[var(--surface-soft)]">
      {/* ================= PageHero — varian terang (gradient-hero-soft) ================= */}
      <section
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero-soft)" }}
      >
        <img
          src="/landing/playful/play-blob-2.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -left-24 -top-24 h-72 w-72 opacity-60"
        />
        <img
          src="/landing/playful/play-blob-4.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-28 -right-20 h-80 w-80 opacity-50"
        />
        <img
          src="/landing/playful/play-spark.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute right-10 top-12 h-10 w-10 opacity-80"
        />
        <img
          src="/landing/playful/play-grid.svg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute bottom-10 left-8 h-24 w-24 opacity-[0.12]"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-16 md:grid-cols-2 md:py-24">
          <FadeInUp>
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--accent-indigo-text)]/30 bg-[var(--accent-indigo-text)]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[var(--accent-indigo-text)]">
                <img
                  src="/landing/playful/play-star.svg"
                  alt=""
                  aria-hidden="true"
                  className="h-3.5 w-3.5"
                />
                Hubungi Kami
              </span>
              <h1 className="mt-4 text-4xl font-extrabold tracking-tight md:text-5xl">
                Kami Siap Membantu
              </h1>
              <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
                Informasi kontak, alamat, jam layanan, dan kanal sosial media sekolah.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {whatsapp ? (
                  <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                    <Button
                      size="lg"
                      className="rounded-full text-white shadow-[var(--shadow-soft)] transition-all duration-300 hover:shadow-[var(--shadow-lift)]"
                      style={{ backgroundImage: "var(--gradient-hero)" }}
                    >
                      Hubungi via WhatsApp
                    </Button>
                  </a>
                ) : null}
                <Link href="#form">
                  <Button size="lg" variant="outline" className="rounded-full">
                    Kirim Pesan
                  </Button>
                </Link>
              </div>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.15}>
            <div className="relative">
              <img
                src="/landing/playful/play-contact.svg"
                alt="Ilustrasi kontak sekolah: telepon, surat, dan pesan"
                role="img"
                className="mx-auto w-full max-w-md"
                loading="eager"
              />
              <img
                src="/landing/playful/play-star.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -left-2 top-8 h-8 w-8 opacity-80"
              />
              <img
                src="/landing/playful/play-dots.svg"
                alt=""
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-4 right-2 h-20 w-20 opacity-40"
              />
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* ================= Info kontak grid playful ================= */}
      <section id="kontak" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16 md:py-20">
        <FadeInUp className="mx-auto max-w-2xl text-center">
          <Eyebrow>Informasi Kontak</Eyebrow>
          <h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">
            Hubungi Kami Lewat Kanal Ini
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Pilih kanal yang paling nyaman — telepon, email, atau langsung mampir ke sekolah.
          </p>
        </FadeInUp>
        <StaggerContainer className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {contact.address ? (
            <StaggerItem className="h-full">
              <ContactCard title="Alamat" value={contact.address} index={0} />
            </StaggerItem>
          ) : null}
          {contact.phone ? (
            <StaggerItem className="h-full">
              <ContactCard title="Telepon" value={contact.phone} index={1} />
            </StaggerItem>
          ) : null}
          {contact.email ? (
            <StaggerItem className="h-full">
              <ContactCard title="Email" value={contact.email} index={2} />
            </StaggerItem>
          ) : null}
          {contact.hours ? (
            <StaggerItem className="h-full">
              <ContactCard title="Jam Layanan" value={contact.hours} index={3} />
            </StaggerItem>
          ) : null}
        </StaggerContainer>

        {/* ================= Peta + form ================= */}
        <div className="mt-12 grid gap-6 lg:grid-cols-2">
          {/* Peta + sosial media */}
          <FadeInUp>
            <div className="flex h-full flex-col gap-6">
              {mapsEmbed ? (
                <div className="overflow-hidden rounded-[1.5rem] border border-border bg-card shadow-[var(--shadow-soft)]">
                  <iframe
                    src={mapsEmbed}
                    title="Lokasi sekolah"
                    className="h-72 w-full border-0"
                    loading="lazy"
                    allowFullScreen
                    sandbox="allow-scripts"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-3 rounded-[1.5rem] border border-dashed border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
                  <img
                    src="/landing/playful/play-contact.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-16 w-20 opacity-80"
                  />
                  <p className="text-base font-semibold text-foreground">
                    Peta lokasi akan segera hadir
                  </p>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    Alamat lengkap: {contact.address || "—"} Silakan hubungi kami melalui kanal di
                    atas.
                  </p>
                </div>
              )}
              {hasSocials ? (
                <div className="rounded-[1.5rem] border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                  <p className="text-sm font-bold text-foreground">Media Sosial</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {whatsapp ? (
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-brand-primary hover:text-brand-primary"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {instagram ? (
                      <a
                        href={instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-brand-primary hover:text-brand-primary"
                      >
                        Instagram
                      </a>
                    ) : null}
                    {facebook ? (
                      <a
                        href={facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-brand-primary hover:text-brand-primary"
                      >
                        Facebook
                      </a>
                    ) : null}
                    {youtube ? (
                      <a
                        href={youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-all hover:border-brand-primary hover:text-brand-primary"
                      >
                        YouTube
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </div>
          </FadeInUp>

          {/* Form kontak demo (statis, tidak mengirim API) */}
          <FadeInUp delay={0.1}>
            <Card
              id="form"
              className="h-full scroll-mt-20 overflow-hidden rounded-[1.5rem] bg-card shadow-[var(--shadow-soft)] transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]"
            >
              <div
                aria-hidden="true"
                className="h-1.5"
                style={{ backgroundImage: "var(--gradient-hero)" }}
              />
              <CardHeader>
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-white shadow-[var(--shadow-soft)]"
                  style={{ backgroundImage: "var(--gradient-indigo)" }}
                >
                  <img
                    src="/landing/playful/play-spark.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-6 w-6"
                  />
                </span>
                <CardTitle className="mt-4">Kirim Pesan</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Formulir contoh (demo) — data tidak dikirim ke server.
                </p>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </FadeInUp>
        </div>
      </section>

      {/* ================= CTA WhatsApp ================= */}
      <section className="mx-auto max-w-6xl px-4 pb-16 md:pb-20">
        <FadeInUp>
          <div
            className="relative overflow-hidden rounded-[1.5rem] text-white shadow-[var(--shadow-lift)]"
            style={{ backgroundImage: "var(--gradient-hero)" }}
          >
            <img
              src="/landing/playful/play-blob-3.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 opacity-40"
            />
            <img
              src="/landing/playful/play-blob-1.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute -bottom-20 -left-12 h-64 w-64 opacity-30"
            />
            <img
              src="/landing/playful/play-star.svg"
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute right-10 top-8 h-8 w-8 opacity-70"
            />
            <div className="relative grid gap-8 p-8 sm:p-12 lg:grid-cols-[1.4fr_1fr] lg:items-center">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-white/40 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                  <img
                    src="/landing/playful/play-star.svg"
                    alt=""
                    aria-hidden="true"
                    className="h-3.5 w-3.5"
                  />
                  Respon Cepat
                </span>
                <h2 className="mt-3 text-3xl font-bold sm:text-4xl">
                  Butuh jawaban cepat? Chat WhatsApp
                </h2>
                <p className="mt-3 max-w-xl text-white/90">
                  Pertanyaan seputar PPDB, program keahlian, atau kunjungan sekolah bisa langsung
                  ditanyakan melalui WhatsApp.
                </p>
                <div className="mt-8 flex flex-wrap gap-3">
                  {whatsapp ? (
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                      <Button
                        size="lg"
                        className="rounded-full bg-white font-bold text-brand-primary shadow-[var(--shadow-soft)] transition-all duration-300 hover:bg-white/90 hover:shadow-[var(--shadow-lift)]"
                      >
                        Chat WhatsApp
                      </Button>
                    </a>
                  ) : null}
                  <Link href="/ppdb">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/40 bg-transparent text-white hover:bg-white/10"
                    >
                      Daftar PPDB
                    </Button>
                  </Link>
                </div>
              </div>
              <div className="hidden lg:block">
                <img
                  src="/landing/playful/play-contact.svg"
                  alt=""
                  aria-hidden="true"
                  className="mx-auto w-full max-w-sm"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </FadeInUp>
      </section>

      <div className="mx-auto max-w-6xl px-4 pb-14">
        <Link href="/">
          <Button variant="outline" size="sm" className="rounded-full">
            ← Kembali ke Beranda
          </Button>
        </Link>
      </div>
    </div>
  );
}
