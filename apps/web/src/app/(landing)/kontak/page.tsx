import type { Metadata } from "next";
import Link from "next/link";
import { type JSX } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@opensis/ui";
import { FadeInUp } from "@/components/landing/motion";
import { ContactForm } from "@/components/landing/contact-form";
import { safeUrl } from "@/lib/safe-url";
import { APP_NAME } from "@/lib/constants";
import { getContact } from "@/lib/landing-pages";

/**
 * Halaman Hubungi Kami — PAGE MANDIRI.
 * Data via helper lib/landing-pages (GET /public/contact): telepon/email/
 * alamat/jam layanan, kanal sosial media, peta (mapsEmbedUrl via safeUrl),
 * dan form kontak DEMO (statis, tidak mengirim API — komponen ContactForm).
 * ISR 30s; fallback aman bila API offline.
 * Header/footer otomatis dari layout (landing).
 */

export const revalidate = 30;

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
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-primary text-white">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-accent opacity-30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-brand-secondary opacity-40 blur-3xl" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-8 px-4 py-16 sm:py-20 lg:flex-row lg:items-center">
          <FadeInUp className="max-w-2xl flex-1">
            <Badge variant="primary" className="bg-white/15 text-white">
              Hubungi Kami
            </Badge>
            <h1 className="mt-3 text-4xl font-extrabold leading-tight sm:text-5xl">Hubungi Kami</h1>
            <p className="mt-3 text-lg font-medium text-white/90">
              Informasi kontak, alamat, jam layanan, dan kanal sosial media sekolah.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              {whatsapp ? (
                <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" variant="success">
                    Chat WhatsApp
                  </Button>
                </a>
              ) : null}
              <Link href="#form">
                <Button
                  size="lg"
                  variant="outline"
                  className="border-white/60 bg-transparent text-white hover:bg-white/10"
                >
                  Kirim Pesan
                </Button>
              </Link>
            </div>
          </FadeInUp>
          <FadeInUp delay={0.1} className="hidden shrink-0 lg:block">
            <img
              src="/landing/landing-about-contact.svg"
              alt=""
              className="h-44 w-44"
              loading="lazy"
            />
          </FadeInUp>
        </div>
      </section>

      {/* Info kontak + peta + form */}
      <section id="kontak" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-14">
        <div className="grid gap-6 lg:grid-cols-2">
          <FadeInUp>
            <Card className="h-full border-brand-primary/20">
              <CardHeader>
                <CardTitle>Informasi Kontak</CardTitle>
                <CardDescription>Alamat, jam layanan, dan kanal sosial media</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <dl className="grid gap-3 text-muted-foreground sm:grid-cols-2">
                  {contact.address ? (
                    <div>
                      <dt className="font-semibold text-foreground">Alamat</dt>
                      <dd className="mt-0.5">{contact.address}</dd>
                    </div>
                  ) : null}
                  {contact.phone ? (
                    <div>
                      <dt className="font-semibold text-foreground">Telepon</dt>
                      <dd className="mt-0.5">{contact.phone}</dd>
                    </div>
                  ) : null}
                  {contact.email ? (
                    <div>
                      <dt className="font-semibold text-foreground">Email</dt>
                      <dd className="mt-0.5 break-all">{contact.email}</dd>
                    </div>
                  ) : null}
                  {contact.hours ? (
                    <div>
                      <dt className="font-semibold text-foreground">Jam layanan</dt>
                      <dd className="mt-0.5">{contact.hours}</dd>
                    </div>
                  ) : null}
                </dl>
                {hasSocials ? (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {whatsapp ? (
                      <a
                        href={`https://wa.me/${whatsapp}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {instagram ? (
                      <a
                        href={instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Instagram
                      </a>
                    ) : null}
                    {facebook ? (
                      <a
                        href={facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        Facebook
                      </a>
                    ) : null}
                    {youtube ? (
                      <a
                        href={youtube}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full border border-border px-4 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-brand-primary hover:text-brand-primary"
                      >
                        YouTube
                      </a>
                    ) : null}
                  </div>
                ) : null}
                {whatsapp ? (
                  <div className="pt-2">
                    <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="success">Chat WhatsApp</Button>
                    </a>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {mapsEmbed ? (
              <div className="mt-4 overflow-hidden rounded-lg border border-border">
                <iframe
                  src={mapsEmbed}
                  title="Lokasi sekolah"
                  className="h-64 w-full border-0"
                  loading="lazy"
                  allowFullScreen
                  sandbox="allow-scripts allow-same-origin"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            ) : null}
          </FadeInUp>

          {/* Form kontak demo (statis, tidak mengirim API) */}
          <FadeInUp delay={0.1}>
            <Card id="form" className="h-full scroll-mt-20">
              <CardHeader>
                <CardTitle>Kirim Pesan</CardTitle>
                <CardDescription>
                  Formulir contoh (demo) — data tidak dikirim ke server.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm />
              </CardContent>
            </Card>
          </FadeInUp>
        </div>

        <div className="mt-12">
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Kembali ke Beranda
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
