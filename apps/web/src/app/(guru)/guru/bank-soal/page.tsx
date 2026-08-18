"use client";

import { useState, type FormEvent, type JSX } from "react";

import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView, Button, Label, Select, Textarea, Dialog, toast } from "@opensis/ui";

import { DEMO_QUESTIONS } from "@/lib/demo";
import { PageHeader, DataTable, StatusBadge, RequiredLabel } from "@/components/ui";

interface Question {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI" | "ISIAN_SINGKAT";
  text: string;
  difficulty?: string;
}

const TYPE_LABEL: Record<Question["type"], string> = {
  PILIHAN_GANDA: "PG",
  ESAI: "Esai",
  ISIAN_SINGKAT: "Isian"
};

const AUTO_GRADE_LABEL: Record<Question["type"], string> = {
  PILIHAN_GANDA: "Ya",
  ESAI: "Manual",
  ISIAN_SINGKAT: "Ya (normalisasi)"
};

export default function GuruBankSoalPage(): JSX.Element {
  const list = useApi<Question[]>(
    async () => {
      const res = await api.get<{ items: Question[]; total: number }>("/quiz/questions");
      return res.items ?? [];
    },
    [],
    { fallbackData: DEMO_QUESTIONS as unknown as Question[] }
  );
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [type, setType] = useState<Question["type"]>("PILIHAN_GANDA");
  const [difficulty, setDifficulty] = useState("SEDANG");
  const [saving, setSaving] = useState(false);

  const create = async (e: FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Soal disimpan (demo)" });
      } else {
        await api.post("/quiz/questions", { type, text, difficulty });
        toast({ variant: "success", title: "Soal disimpan" });
      }
      setOpen(false);
      setText("");
      list.refetch();
    } catch {
      toast({ variant: "error", title: "Gagal menyimpan soal" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bank Soal"
        description="Kumpulan soal PG, esai, dan isian untuk kuis dan ujian."
        actions={
          <Button onClick={() => setOpen(true)} size="sm">
            Buat Soal
          </Button>
        }
      />

      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Bank soal"
      >
        <DataTable
          keyField="id"
          columns={[
            {
              key: "type",
              label: "Tipe",
              render: (q) => (
                <StatusBadge
                  status={q.type}
                  mapping={{
                    PILIHAN_GANDA: "info",
                    ESAI: "warning",
                    ISIAN_SINGKAT: "success"
                  }}
                  label={TYPE_LABEL[q.type]}
                />
              )
            },
            {
              key: "text",
              label: "Pertanyaan",
              render: (q) => (
                <span className="block max-w-xl truncate font-medium text-foreground">
                  {q.text}
                </span>
              )
            },
            {
              key: "difficulty",
              label: "Kesukaran",
              hideBelow: "md",
              render: (q) =>
                q.difficulty ? (
                  <StatusBadge
                    status={q.difficulty}
                    mapping={{ MUDAH: "success", SEDANG: "warning", SULIT: "danger" }}
                  />
                ) : (
                  <span className="text-muted-foreground">—</span>
                )
            },
            {
              key: "autoGrade",
              label: "Auto-grade",
              hideBelow: "lg",
              render: (q) => (
                <span className="text-muted-foreground">{AUTO_GRADE_LABEL[q.type]}</span>
              )
            }
          ]}
          rows={list.data ?? []}
          emptyTitle="Bank soal kosong"
          emptyDesc="Tambahkan soal PG/esai/isian untuk kuis dan ujian."
          emptyAction={
            <Button size="sm" onClick={() => setOpen(true)}>
              Buat Soal
            </Button>
          }
        />
      </DataView>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Buat Soal"
        description="Pilih tipe: PG (auto-grade), Esai (manual), Isian singkat (auto, normalisasi)."
      >
        <form onSubmit={(e) => void create(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="q-type">Tipe Soal</Label>
            <Select
              id="q-type"
              value={type}
              onChange={(e) => setType(e.target.value as Question["type"])}
              options={[
                { value: "PILIHAN_GANDA", label: "Pilihan Ganda (auto-grade)" },
                { value: "ESAI", label: "Esai (manual)" },
                { value: "ISIAN_SINGKAT", label: "Isian Singkat (auto)" }
              ]}
            />
          </div>
          <div className="space-y-1.5">
            <RequiredLabel htmlFor="q-text">Pertanyaan</RequiredLabel>
            <Textarea
              id="q-text"
              rows={4}
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              placeholder="Tulis pertanyaan..."
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="q-diff">Tingkat Kesukaran</Label>
            <Select
              id="q-diff"
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              options={[
                { value: "MUDAH", label: "Mudah" },
                { value: "SEDANG", label: "Sedang" },
                { value: "SULIT", label: "Sulit" }
              ]}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={saving}>
              Simpan ke Bank Soal
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
