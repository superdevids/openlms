"use client";

import { useState, type FormEvent, type JSX } from "react";

import {
  Alert,
  AlertDescription,
  AlertTitle,
  Button,
  Input,
  Label,
  Textarea,
  toast
} from "@opensis/ui";

/**
 * Formulir kontak DEMO — statis, TIDAK mengirim API. Menampilkan pesan info
 * (Alert + toast) bahwa halaman ini contoh; kontak resmi tetap lewat
 * WhatsApp/telepon/email yang ditampilkan di seksi Hubungi Kami.
 */
export function ContactForm(): JSX.Element {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [pesan, setPesan] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>): void => {
    e.preventDefault();
    setSubmitted(true);
    toast({
      variant: "info",
      title: "Formulir demo",
      description:
        "Data tidak dikirim ke server. Silakan hubungi sekolah melalui WhatsApp, telepon, atau email yang tertera."
    });
  };

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="contact-name">Nama</Label>
          <Input
            id="contact-name"
            name="nama"
            required
            autoComplete="name"
            placeholder="Nama lengkap"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="contact-email">Email</Label>
          <Input
            id="contact-email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="nama@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="contact-message">Pesan</Label>
        <Textarea
          id="contact-message"
          name="pesan"
          required
          rows={4}
          placeholder="Tulis pesan Anda..."
          value={pesan}
          onChange={(e) => setPesan(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg">
          Kirim Pesan
        </Button>
        <span className="text-sm text-muted-foreground">
          Halaman contoh — pesan tidak benar-benar terkirim.
        </span>
      </div>
      {submitted ? (
        <Alert variant="info">
          <AlertTitle>Terima kasih!</AlertTitle>
          <AlertDescription>
            Ini formulir demo — data tidak dikirim. Untuk pertanyaan resmi, hubungi sekolah lewat
            WhatsApp, telepon, atau email pada seksi Hubungi Kami.
          </AlertDescription>
        </Alert>
      ) : null}
    </form>
  );
}
