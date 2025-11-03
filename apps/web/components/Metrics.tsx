import React from "react";

type Props = {
  van?: number | null;
  tir?: number | null;
  paybackYears?: number | null;
  currency?: string;
  locale?: string;
  moneyDigits?: number;
  percentDigits?: number;
  compactOnOverflow?: boolean;
  compactDigits?: number;
};

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const fmtMoney = (n?: number | null, locale = "es-CO", currency = "USD", max = 0) =>
  isNum(n) ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: max }).format(n) : "—";

const fmtMoneyCompact = (n?: number | null, locale = "es-CO", currency = "USD", max = 1) =>
  isNum(n) ? new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: max, notation: "compact", compactDisplay: "short" }).format(n) : "—";

const fmtPct = (n?: number | null, digits = 2) => (isNum(n) ? `${(n * 100).toFixed(digits)}%` : "—");
const fmtPB = (n?: number | null) => (isNum(n) ? `${n % 1 === 0 ? n.toFixed(0) : n.toFixed(1)} años` : "—");

export default function Metrics({
  van, tir, paybackYears,
  currency = "USD", locale = "es-CO",
  moneyDigits = 0, percentDigits = 2,
  compactOnOverflow = true, compactDigits = 1,
}: Props) {

  const vanState = isNum(van) ? (van >= 0 ? "pos" : "neg") : "na";
  const tirState = isNum(tir) ? (tir >= 0 ? "pos" : "neg") : "na";
  const pbState = isNum(paybackYears) ? "pos" : "na";

  const stateCls: Record<"pos" | "neg" | "na", string> = {
    pos: "text-emerald-600",
    neg: "text-red-600",
    na: "text-gray-500",
  };

  // --- VAN: solo truncar si realmente es largo ---
  const vanFull = fmtMoney(van, locale, currency, moneyDigits);
  const vanLen = vanFull.replace(/\s/g, "").length; // sin espacios
  const vanTooLong = vanLen > 16;                     // umbral más permisivo
  const vanShown = (compactOnOverflow && vanTooLong)
    ? fmtMoneyCompact(van, locale, currency, compactDigits)
    : vanFull;

  // tamaño de fuente adaptativo
  const sizeByLen = vanTooLong ? "text-[20px] md:text-[26px]" : "text-[28px] md:text-[34px]";
  const truncCls = vanTooLong ? "truncate whitespace-nowrap" : "break-keep"; // <-- condicional

  const cards: Array<{ key: string; title: string; state: "pos" | "neg" | "na"; value: React.ReactNode; hint?: string; }> = [
    {
      key: "van", title: "VAN", state: vanState, hint: "Valor Actual Neto",
      value: (
        <div
          className={`tabular-nums ${sizeByLen} block max-w-full ${truncCls}`}
          title={vanFull !== "—" ? vanFull : undefined}
        >
          {vanShown}
        </div>
      ),
    },
    {
      key: "tir", title: "TIR", state: tirState, hint: "Tasa Interna de Retorno",
      value: (
        <div className="tabular-nums text-[28px] md:text-[34px] block max-w-full break-keep">
          {fmtPct(tir, percentDigits)}
        </div>
      ),
    },
    {
      key: "payback", title: "Payback", state: pbState, hint: "Periodo de recuperación",
      value: (
        <div className="tabular-nums text-[28px] md:text-[34px] block max-w-full break-keep">
          {fmtPB(paybackYears)}
        </div>
      ),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {cards.map(c => (
        <article key={c.key} className="min-w-0 rounded-2xl border bg-white shadow p-5 select-none">
          <header className="text-[11px] uppercase tracking-wide text-gray-500">{c.title}</header>
          <div className={`mt-1 font-semibold leading-none ${stateCls[c.state]}`}>
            {c.value}
          </div>
          <div className="mt-3 h-px w-full bg-gray-100" />
          <footer className="mt-2 text-xs text-gray-500">
            {c.state === "na" ? "—" : c.state === "pos" ? "Favor." : "Desfavor."}
          </footer>
        </article>
      ))}
    </div>
  );
}
