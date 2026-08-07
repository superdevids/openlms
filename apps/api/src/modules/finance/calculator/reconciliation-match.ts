import { Decimal } from "@prisma/client/runtime/library";
import { MoneyInput, money } from "./money";

/**
 * Rekonsiliasi bank (prd04 §5.F.5): cocokkan baris mutasi CSV dengan Payment.
 * Murni — matching deterministik berbasis referensi + nominal + tanggal.
 */

export type BankMutationType = "DEBIT" | "KREDIT";
export type ReconciliationRowStatus = "MATCHED" | "UNMATCHED";

export interface BankMutationRow {
  rowIndex: number;
  tanggal: string; // YYYY-MM-DD
  keterangan: string;
  referensi: string | null; // no. invoice / referensi transfer
  nominal: Decimal; // positif = uang masuk (KREDIT di rekening bank)
  tipe: BankMutationType;
}

export interface PaymentCandidate {
  id: string;
  invoiceNo: string;
  amount: Decimal;
  paidAt: Date | null;
  method: string;
}

export interface ReconciliationMatchResult {
  status: ReconciliationRowStatus;
  matchedPaymentId: string | null;
  /** 1 = cocok sempurna; 0.5 = cocok nominal saja; 0 = tidak cocok */
  confidence: number;
  reason: string | null;
}

export interface MatchOptions {
  /** toleransi selisih nominal (default 0.01) */
  tolerance?: MoneyInput;
  /** tanggal dianggap cocok bila selisih <= hariIni (default 3) */
  dateToleranceDays?: number;
}

const DEFAULT_TOLERANCE = new Decimal("0.01");

function sameAmount(a: Decimal, b: Decimal, tol: Decimal): boolean {
  return a.minus(b).abs().lte(tol);
}

function sameDate(payment: PaymentCandidate, row: BankMutationRow, tolDays: number): boolean {
  const rowDate = new Date(`${row.tanggal}T00:00:00Z`);
  const paidAt = payment.paidAt ?? new Date(0);
  const diffMs = Math.abs(paidAt.getTime() - rowDate.getTime());
  return diffMs <= tolDays * 24 * 60 * 60 * 1000;
}

/**
 * Strategi matching (urut prioritas):
 * 1. referensi cocok (no. invoice) + nominal sama        -> MATCHED (confidence 1)
 * 2. referensi cocok tapi nominal beda <= tolerance      -> MATCHED (confidence 0.8)
 * 3. nominal sama (tanpa referensi) + tanggal dalam batas -> MATCHED (confidence 0.5)
 * 4. selain itu                                           -> UNMATCHED
 */
export function matchRowToPayments(
  row: BankMutationRow,
  payments: PaymentCandidate[],
  options: MatchOptions = {}
): ReconciliationMatchResult {
  const tol = money(options.tolerance ?? DEFAULT_TOLERANCE);
  const dateTol = options.dateToleranceDays ?? 3;

  if (row.tipe !== "KREDIT") {
    return {
      status: "UNMATCHED",
      matchedPaymentId: null,
      confidence: 0,
      reason: "bukan mutasi masuk (KREDIT)"
    };
  }

  const reference = row.referensi?.trim().toUpperCase();
  const refMatches = payments.filter((p) => p.invoiceNo.trim().toUpperCase() === reference);
  if (refMatches.length > 0) {
    const exact = refMatches.find((p) => sameAmount(p.amount, row.nominal, tol));
    if (exact) {
      return {
        status: "MATCHED",
        matchedPaymentId: exact.id,
        confidence: 1,
        reason: "referensi + nominal cocok"
      };
    }
    const best = refMatches[0];
    if (best) {
      return {
        status: "MATCHED",
        matchedPaymentId: best.id,
        confidence: 0.8,
        reason: "referensi cocok, nominal dalam toleransi"
      };
    }
  }

  // Tanpa referensi: coba nominal + tanggal (probabilistik, confidence rendah)
  const amountMatches = payments.filter((p) => sameAmount(p.amount, row.nominal, tol));
  const withDate = amountMatches.find((p) => sameDate(p, row, dateTol));
  if (withDate) {
    return {
      status: "MATCHED",
      matchedPaymentId: withDate.id,
      confidence: 0.5,
      reason: "nominal + tanggal cocok (tanpa referensi)"
    };
  }
  if (amountMatches.length > 0) {
    return {
      status: "MATCHED",
      matchedPaymentId: amountMatches[0]?.id ?? null,
      confidence: 0.5,
      reason: "nominal cocok, tanggal di luar batas toleransi"
    };
  }
  return {
    status: "UNMATCHED",
    matchedPaymentId: null,
    confidence: 0,
    reason: "tidak ada payment yang cocok"
  };
}

/**
 * Parser CSV mutasi bank sederhana (RFC-4180 dasar): header opsional,
 * kolom: tanggal,keterangan,referensi,nominal,tipe. Mendukung kutip ganda.
 */
export function parseMutasiCsv(csv: string): BankMutationRow[] {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) {
    return [];
  }
  const rows: BankMutationRow[] = [];
  for (let i = 0; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i] ?? "");
    const [tanggal, keterangan, referensi, nominalStr, tipeStr] = fields;
    // Baris header / baris tanpa angka nominal dilewati (bukan data mutasi).
    if (!tanggal || !nominalStr || !/\d/.test(nominalStr)) {
      continue;
    }
    const nominal = parseAmountText(nominalStr);
    const tipe: BankMutationType =
      (tipeStr ?? "").trim().toUpperCase() === "DEBIT" ? "DEBIT" : "KREDIT";
    rows.push({
      rowIndex: i,
      tanggal: tanggal.trim(),
      keterangan: (keterangan ?? "").trim(),
      referensi: referensi && referensi.trim().length > 0 ? referensi.trim() : null,
      nominal,
      tipe
    });
  }
  return rows;
}

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      out.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  out.push(current);
  return out;
}

/**
 * Normalisasi nominal teks mutasi bank:
 * - "500.000" (ribu, tanpa koma) -> 500000
 * - "1.500.000,50" (format Indonesia) -> 1500000.50
 * - "500000" -> 500000; "500.50" -> 500.50 (desimal)
 */
function parseAmountText(text: string): Decimal {
  const cleaned = text.trim().replace(/[^\d.,-]/g, "");
  let normalized = cleaned;
  if (cleaned.includes(",")) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) {
    normalized = cleaned.replace(/\./g, "");
  }
  const d = new Decimal(normalized || "0");
  return d.isNaN() ? new Decimal(0) : d;
}

/** Ringkas: dari deret payment ke PaymentCandidate (murni, tanpa DB). */
export function toPaymentCandidates(
  payments: Array<{
    id: string;
    invoiceNo: string;
    amount: MoneyInput;
    paidAt: Date | null;
    method: string;
  }>
): PaymentCandidate[] {
  return payments.map((p) => ({
    id: p.id,
    invoiceNo: p.invoiceNo,
    amount: money(p.amount),
    paidAt: p.paidAt,
    method: p.method
  }));
}
