"use client";

import { useEffect, useRef, useState, type JSX } from "react";

import { api, errorMessage } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  Input,
  Label,
  Textarea,
  Switch,
  ConfirmDialog,
  toast,
  IconPlus,
  IconX,
  IconFile
} from "@opensis/ui";

import { PageHeader, EmptyStateV3, StatusBadge } from "@/components/ui";

/**
 * Editor Landing Page — SUPERADMIN + OPERATOR (permission landing:write:school).
 * List semua section landing + kelola berita (CRUD).
 */

interface LandingSection {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  body: string;
  imagePath: string | null;
  linkUrl: string | null;
  linkLabel: string | null;
  extra: Record<string, unknown> | null;
  sectionOrder: number;
  isPublished: boolean;
  updatedBy: string | null;
  updatedAt: string;
}

interface NewsItem {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  body: string;
  coverImagePath: string | null;
  category: string | null;
  author: string | null;
  publishedAt: string | null;
  isPublished: boolean;
  updatedAt: string;
}

interface SectionDraft {
  title: string;
  subtitle: string;
  body: string;
  linkUrl: string;
  linkLabel: string;
  extraJson: string;
  isPublished: boolean;
}

interface NewsDraft {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  category: string;
  author: string;
  isPublished: boolean;
}

const EMPTY_NEWS_DRAFT: NewsDraft = {
  title: "",
  slug: "",
  excerpt: "",
  body: "",
  category: "",
  author: "",
  isPublished: false
};

function formatTanggal(value: string | null): string {
  if (!value) return "";
  try {
    return new Intl.DateTimeFormat("id-ID", { dateStyle: "long" }).format(new Date(value));
  } catch {
    return "";
  }
}

export default function SuperadminLandingPage(): JSX.Element {
  const sectionsApi = useApi<LandingSection[]>((signal) =>
    api.get<LandingSection[]>("/admin/landing", { signal })
  );
  const newsApi = useApi<NewsItem[]>((signal) =>
    api.get<NewsItem[]>("/admin/landing/berita", { signal })
  );

  // Draf section (lokal, belum disimpan)
  const [drafts, setDrafts] = useState<Record<string, SectionDraft>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  // Draf berita + dialog
  const [newsDialogOpen, setNewsDialogOpen] = useState(false);
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [newsDraft, setNewsDraft] = useState<NewsDraft>(EMPTY_NEWS_DRAFT);
  const [newsSaving, setNewsSaving] = useState(false);
  const [deletingNews, setDeletingNews] = useState<NewsItem | null>(null);

  const sections = sectionsApi.data ?? [];
  const news = newsApi.data ?? [];

  // Inisialisasi draft section saat data dimuat.
  const synced = useRef(false);
  useEffect(() => {
    if (!synced.current && sectionsApi.data) {
      const next: Record<string, SectionDraft> = {};
      for (const s of sectionsApi.data) {
        next[s.slug] = {
          title: s.title,
          subtitle: s.subtitle ?? "",
          body: s.body,
          linkUrl: s.linkUrl ?? "",
          linkLabel: s.linkLabel ?? "",
          extraJson: s.extra ? JSON.stringify(s.extra, null, 2) : "",
          isPublished: s.isPublished
        };
      }
      setDrafts(next);
      synced.current = true;
    }
  }, [sectionsApi.data]);

  const setDraft = (slug: string, patch: Partial<SectionDraft>): void => {
    setDrafts((prev) => ({
      ...prev,
      [slug]: { ...(prev[slug] ?? EMPTY_DRAFT(slug)), ...patch }
    }));
  };

  const saveSection = async (section: LandingSection): Promise<void> => {
    const draft = drafts[section.slug];
    if (!draft) return;
    setSaving((prev) => ({ ...prev, [section.slug]: true }));
    try {
      let extra: Record<string, unknown> | undefined;
      if (draft.extraJson.trim().length > 0) {
        try {
          const parsed: unknown = JSON.parse(draft.extraJson);
          if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
            throw new Error("extra harus berupa object JSON");
          }
          extra = parsed as Record<string, unknown>;
        } catch (parseErr) {
          toast({
            variant: "error",
            title: `Extra JSON section "${section.slug}" tidak valid`,
            description: errorMessage(parseErr)
          });
          return;
        }
      }
      await api.put(`/admin/landing/${encodeURIComponent(section.slug)}`, {
        title: draft.title,
        subtitle: draft.subtitle,
        body: draft.body,
        linkUrl: draft.linkUrl.trim() || undefined,
        linkLabel: draft.linkLabel.trim() || undefined,
        extra,
        sectionOrder: section.sectionOrder,
        isPublished: draft.isPublished
      });
      toast({ variant: "success", title: `Section "${section.slug}" disimpan` });
      sectionsApi.refetch();
    } catch (err) {
      toast({
        variant: "error",
        title: "Gagal menyimpan section",
        description: errorMessage(err)
      });
    } finally {
      setSaving((prev) => ({ ...prev, [section.slug]: false }));
    }
  };

  const openCreateNews = (): void => {
    setEditingNewsId(null);
    setNewsDraft(EMPTY_NEWS_DRAFT);
    setNewsDialogOpen(true);
  };

  const openEditNews = (item: NewsItem): void => {
    setEditingNewsId(item.id);
    setNewsDraft({
      title: item.title,
      slug: item.slug,
      excerpt: item.excerpt ?? "",
      body: item.body,
      category: item.category ?? "",
      author: item.author ?? "",
      isPublished: item.isPublished
    });
    setNewsDialogOpen(true);
  };

  const saveNews = async (): Promise<void> => {
    if (!newsDraft.title.trim() || !newsDraft.body.trim()) {
      toast({ variant: "error", title: "Judul dan isi berita wajib diisi" });
      return;
    }
    setNewsSaving(true);
    try {
      const payload = {
        title: newsDraft.title.trim(),
        slug: newsDraft.slug.trim() || undefined,
        excerpt: newsDraft.excerpt.trim(),
        body: newsDraft.body,
        category: newsDraft.category.trim() || undefined,
        author: newsDraft.author.trim() || undefined,
        isPublished: newsDraft.isPublished
      };
      if (editingNewsId) {
        await api.patch(`/admin/landing/berita/${editingNewsId}`, payload);
        toast({ variant: "success", title: "Berita diperbarui" });
      } else {
        await api.post("/admin/landing/berita", payload);
        toast({ variant: "success", title: "Berita dibuat" });
      }
      setNewsDialogOpen(false);
      newsApi.refetch();
    } catch (err) {
      toast({ variant: "error", title: "Gagal menyimpan berita", description: errorMessage(err) });
    } finally {
      setNewsSaving(false);
    }
  };

  const confirmDeleteNews = async (): Promise<void> => {
    if (!deletingNews) return;
    try {
      await api.del(`/admin/landing/berita/${deletingNews.id}`);
      toast({ variant: "success", title: "Berita dihapus" });
      newsApi.refetch();
    } catch (err) {
      toast({ variant: "error", title: "Gagal menghapus berita", description: errorMessage(err) });
    }
    setDeletingNews(null);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Landing Page Sekolah"
        description={
          <>
            Kelola konten halaman depan website (hero, tentang, piagam, kontak) dan berita.
            Perubahan langsung tampil di <code>/</code>.
          </>
        }
      />

      {sectionsApi.status === "error" || newsApi.status === "error" ? (
        <Card className="rounded-lg border-border bg-app-surface shadow-app-card">
          <CardContent className="p-4 text-sm text-status-danger-fg">
            Tidak dapat memuat data landing dari API. Periksa koneksi backend dan pastikan akun
            memiliki permission <code>landing:write:school</code>.
          </CardContent>
        </Card>
      ) : null}

      {/* Section konten */}
      <section aria-labelledby="landing-sections-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="landing-sections-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Konten Halaman
            </h2>
            <p className="text-sm text-muted-foreground">
              Edit section hero, tentang, piagam, kontak — masing-masing dapat diterbitkan/draf.
            </p>
          </div>
        </div>
        {sections.length === 0 ? (
          <EmptyStateV3
            className="mt-4"
            icon={<IconX className="h-5 w-5" />}
            title="Belum ada section"
            desc="Jalankan seed atau buat section melalui API."
          />
        ) : (
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {sections.map((section) => {
              const draft = drafts[section.slug] ?? EMPTY_DRAFT(section.slug);
              return (
                <Card
                  key={section.id}
                  className="rounded-lg border-border bg-app-surface shadow-app-card"
                >
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="primary">
                        <code className="text-xs">{section.slug}</code>
                      </Badge>
                      <Switch
                        checked={draft.isPublished}
                        onCheckedChange={(v) => setDraft(section.slug, { isPublished: v })}
                        label={draft.isPublished ? "Terbit" : "Draf"}
                      />
                    </div>
                    <CardDescription>
                      Urutan {section.sectionOrder} · Diperbarui {formatTanggal(section.updatedAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor={`landing-title-${section.slug}`}>Judul</Label>
                      <Input
                        id={`landing-title-${section.slug}`}
                        value={draft.title}
                        maxLength={200}
                        onChange={(e) => setDraft(section.slug, { title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`landing-subtitle-${section.slug}`}>Subjudul</Label>
                      <Input
                        id={`landing-subtitle-${section.slug}`}
                        value={draft.subtitle}
                        maxLength={400}
                        onChange={(e) => setDraft(section.slug, { subtitle: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`landing-body-${section.slug}`}>Isi</Label>
                      <Textarea
                        id={`landing-body-${section.slug}`}
                        value={draft.body}
                        rows={6}
                        onChange={(e) => setDraft(section.slug, { body: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <Label htmlFor={`landing-linkurl-${section.slug}`}>
                          Tautan CTA <span className="text-muted-foreground">(opsional)</span>
                        </Label>
                        <Input
                          id={`landing-linkurl-${section.slug}`}
                          value={draft.linkUrl}
                          maxLength={500}
                          placeholder="/ppdb"
                          onChange={(e) => setDraft(section.slug, { linkUrl: e.target.value })}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`landing-linklabel-${section.slug}`}>
                          Label CTA <span className="text-muted-foreground">(opsional)</span>
                        </Label>
                        <Input
                          id={`landing-linklabel-${section.slug}`}
                          value={draft.linkLabel}
                          maxLength={120}
                          placeholder="Daftar PPDB"
                          onChange={(e) => setDraft(section.slug, { linkLabel: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`landing-extra-${section.slug}`}>
                        Data terstruktur (JSON){" "}
                        <span className="text-muted-foreground">
                          (opsional — programs/items/faq/images)
                        </span>
                      </Label>
                      <Textarea
                        id={`landing-extra-${section.slug}`}
                        value={draft.extraJson}
                        rows={5}
                        placeholder='{"faq": [{"question": "...", "answer": "..."}]}'
                        onChange={(e) => setDraft(section.slug, { extraJson: e.target.value })}
                      />
                    </div>
                    <Button
                      onClick={() => void saveSection(section)}
                      disabled={Boolean(saving[section.slug])}
                    >
                      {saving[section.slug] ? "Menyimpan..." : "Simpan Section"}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {/* Berita */}
      <section aria-labelledby="landing-news-title">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2
              id="landing-news-title"
              className="text-base font-semibold tracking-tight text-foreground"
            >
              Berita
            </h2>
            <p className="text-sm text-muted-foreground">
              Berita yang diterbitkan tampil di beranda dan halaman /berita.
            </p>
          </div>
          <Button onClick={openCreateNews}>
            <IconPlus className="h-4 w-4" /> Tambah Berita
          </Button>
        </div>

        {news.length === 0 ? (
          <EmptyStateV3
            className="mt-4"
            icon={<IconFile className="h-5 w-5" />}
            title="Belum ada berita"
            desc="Klik 'Tambah Berita' untuk membuat berita pertama."
          />
        ) : (
          <div className="mt-4 space-y-3">
            {news.map((item) => (
              <Card
                key={item.id}
                className="rounded-lg border-border bg-app-surface shadow-app-card"
              >
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">
                        {item.title}
                      </p>
                      <StatusBadge status={item.isPublished ? "PUBLISHED" : "DRAFT"} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                      <code>{item.slug}</code> · {formatTanggal(item.publishedAt)}
                      {item.author ? ` · ${item.author}` : ""}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditNews(item)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={`Hapus ${item.title}`}
                      onClick={() => setDeletingNews(item)}
                    >
                      <IconX className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Dialog tambah/edit berita */}
      {newsDialogOpen ? (
        <NewsEditorDialog
          editing={editingNewsId !== null}
          draft={newsDraft}
          onChange={setNewsDraft}
          saving={newsSaving}
          onSave={() => void saveNews()}
          onClose={() => setNewsDialogOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={deletingNews !== null}
        onOpenChange={(open) => {
          if (!open) setDeletingNews(null);
        }}
        title="Hapus berita?"
        description={`Berita "${deletingNews?.title ?? ""}" akan dihapus permanen.`}
        confirmLabel="Ya, hapus"
        destructive
        onConfirm={() => void confirmDeleteNews()}
      />
    </div>
  );
}

function EMPTY_DRAFT(slug: string): SectionDraft {
  return {
    title: slug,
    subtitle: "",
    body: "",
    linkUrl: "",
    linkLabel: "",
    extraJson: "",
    isPublished: true
  };
}

function NewsEditorDialog({
  editing,
  draft,
  onChange,
  saving,
  onSave,
  onClose
}: {
  editing: boolean;
  draft: NewsDraft;
  onChange: (draft: NewsDraft) => void;
  saving: boolean;
  onSave: () => void;
  onClose: () => void;
}): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-[150] flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={editing ? "Edit berita" : "Tambah berita"}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-xl border border-border bg-card p-6 shadow-xl sm:rounded-xl">
        <h2 className="text-lg font-semibold text-foreground">
          {editing ? "Edit Berita" : "Tambah Berita"}
        </h2>
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="news-title">Judul</Label>
            <Input
              id="news-title"
              value={draft.title}
              maxLength={200}
              placeholder="Judul berita"
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="news-slug">
                Slug <span className="text-muted-foreground">(opsional)</span>
              </Label>
              <Input
                id="news-slug"
                value={draft.slug}
                maxLength={300}
                placeholder="auto-dari judul"
                onChange={(e) => onChange({ ...draft, slug: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="news-category">Kategori</Label>
              <Input
                id="news-category"
                value={draft.category}
                maxLength={60}
                placeholder="pengumuman / kegiatan / prestasi"
                onChange={(e) => onChange({ ...draft, category: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="news-author">Penulis</Label>
              <Input
                id="news-author"
                value={draft.author}
                maxLength={120}
                placeholder="Tim Sekolah"
                onChange={(e) => onChange({ ...draft, author: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-excerpt">Ringkasan</Label>
            <Input
              id="news-excerpt"
              value={draft.excerpt}
              maxLength={500}
              placeholder="Ringkasan singkat berita"
              onChange={(e) => onChange({ ...draft, excerpt: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="news-body">Isi</Label>
            <Textarea
              id="news-body"
              value={draft.body}
              rows={8}
              placeholder="Isi lengkap berita"
              onChange={(e) => onChange({ ...draft, body: e.target.value })}
            />
          </div>
          <Switch
            checked={draft.isPublished}
            onCheckedChange={(v) => onChange({ ...draft, isPublished: v })}
            label={draft.isPublished ? "Terbitkan sekarang" : "Simpan sebagai draf"}
          />
        </div>
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Batal
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Menyimpan..." : editing ? "Simpan Perubahan" : "Buat Berita"}
          </Button>
        </div>
      </div>
    </div>
  );
}
