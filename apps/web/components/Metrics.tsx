import React from "react";

type Props = {
  van?: number | null;
  tir?: number | null;
  paybackYears?: number | null;
};

const fmtMoney = (n?: number | null) =>
  typeof n === "number"
    ? n.toLocaleString("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 })
    : "—";

const fmtPct = (n?: number | null) =>
  typeof n === "number" ? `${(n * 100).toFixed(2)}%` : "—";

const fmtPB = (n?: number | null) =>
  typeof n === "number" ? `${n} años` : "—";

export default function Metrics({ van, tir, paybackYears }: Props) {
  const items = [
    { label: "VAN", value: fmtMoney(van) },
    { label: "TIR", value: fmtPct(tir ?? null) },
    { label: "Payback", value: fmtPB(paybackYears ?? null) },
  ];

  return (
    <div className="grid sm:grid-cols-3 gap-4">
      {items.map((it) => (
        <div key={it.label} className="rounded-2xl shadow p-5 bg-white border">
          <div className="text-xs uppercase tracking-wide text-gray-500">{it.label}</div>
          <div className="text-2xl md:text-3xl font-semibold mt-1 tabular-nums">{it.value}</div>
        </div>
      ))}
    </div>
  );
}
