"use client";

import * as React from "react";
import { api, DEMO_MODE } from "@/lib/api-client";
import { useApi } from "@/lib/use-api";
import { DataView } from "@/components/ui/data-view";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button, Label, Select, Textarea, Badge } from "@/components/ui";
import { Dialog } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "@/components/ui/toast";
import { DEMO_QUESTIONS } from "@/lib/demo";

interface Question {
  id: string;
  type: "PILIHAN_GANDA" | "ESAI" | "ISIAN_SINGKAT";
  text: string;
  difficulty?: string;
}

export default function GuruBankSoalPage(): React.JSX.Element {
  const list = useApi<Question[]>(() => api.get("/questions"), [], {
    fallbackData: DEMO_QUESTIONS
  });
  const [open, setOpen] = React.useState(false);
  const [text, setText] = React.useState("");
  const [type, setType] = React.useState<Question["type"]>("PILIHAN_GANDA");
  const [difficulty, setDifficulty] = React.useState("SEDANG");
  const [saving, setSaving] = React.useState(false);

  const create = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setSaving(true);
    try {
      if (DEMO_MODE) {
        await new Promise((r) => setTimeout(r, 200));
        toast({ variant: "success", title: "Soal disimpan (demo)" });
      } else {
        await api.post("/questions", { type, text, difficulty });
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
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Bank Soal</h1>
        <Button onClick={() => setOpen(true)}>Buat Soal</Button>
      </div>
      <DataView
        status={list.status}
        error={list.error}
        onRetry={list.refetch}
        fallbackLabel="Bank soal"
      >
        {list.data?.length === 0 ? (
          <EmptyState
            title="Bank soal kosong"
            description="Tambahkan soal PG/esai/isian untuk kuis dan ujian."
            action={<Button onClick={() => setOpen(true)}>Buat Soal</Button>}
          />
        ) : (
          <ul className="space-y-2">
            {(list.data ?? []).map((q) => (
              <li key={q.id}>
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="primary">
                        {q.type === "PILIHAN_GANDA" ? "PG" : q.type === "ESAI" ? "Esai" : "Isian"}
                      </Badge>
                      {q.difficulty ? <Badge variant="neutral">{q.difficulty}</Badge> : null}
                    </div>
                    <CardTitle className="text-base font-medium">{q.text}</CardTitle>
                    <CardDescription className="text-xs">
                      Auto-grade:{" "}
                      {q.type === "PILIHAN_GANDA"
                        ? "Ya"
                        : q.type === "ESAI"
                          ? "Manual"
                          : "Ya (normalisasi)"}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            ))}
          </ul>
        )}
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
            <Label htmlFor="q-text">Pertanyaan</Label>
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
