import React from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  years: number[];
  cashflows: number[];
  currency?: string;
  locale?: string;
};

const formatCompactMoney = (value: number, locale = "es-CO", currency = "COP") => {
  const formatted = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
    compactDisplay: "short",
  }).format(value);

  if (value > 0 && !formatted.startsWith("+")) {
    return `+${formatted}`;
  }

  return formatted;
};

export default function CashflowChart({ years, cashflows, currency = "COP", locale = "es-CO" }: Props) {
  if (!years?.length || !cashflows?.length) {
    return null;
  }

  const data = years.map((year, index) => ({
    year,
    cashflow: Number.isFinite(cashflows[index]) ? cashflows[index] : 0,
  }));

  return (
    <div className="rounded-2xl border bg-white p-4 shadow">
      <h3 className="mb-2 text-sm text-gray-600">Flujo de caja (por año)</h3>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="year" tickLine={false} axisLine={false} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickFormatter={(value: number) => formatCompactMoney(value, locale, currency)}
            />
            <Tooltip
              formatter={(value: number) => formatCompactMoney(value, locale, currency)}
              labelFormatter={(value: number) => `Año ${value}`}
              contentStyle={{ borderRadius: 12, borderColor: "#e2e8f0" }}
            />
            <Line
              type="monotone"
              dataKey="cashflow"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
