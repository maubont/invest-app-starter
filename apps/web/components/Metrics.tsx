type MetricState = "positive" | "negative" | "unknown";

type Props = {
  van?: number | null;
  tir?: number | null;
  paybackYears?: number | null;
  wacc?: number | null;
  currency?: string;
  locale?: string;
  /** true cuando hay entradas fuera de rango (no se dispara el cálculo) */
  invalid?: boolean;
};

const isNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatMoney = (
  value?: number | null,
  locale = "es-CO",
  currency = "COP"
) => {
  if (!isNumber(value)) return "—";

  const absolute = Math.abs(value);
  // Muestra compacto (k, M) para valores grandes
  if (absolute >= 1_000_000) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
      compactDisplay: "short",
    }).format(value);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: absolute < 1_000 ? 0 : 1,
  }).format(value);
};

const formatFullMoney = (
  value?: number | null,
  locale = "es-CO",
  currency = "COP"
) => {
  if (!isNumber(value)) return "—";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatPercentage = (value?: number | null) =>
  isNumber(value) ? `${(value * 100).toFixed(2)}%` : "—";

const formatPayback = (value?: number | null) => {
  if (!isNumber(value)) return "—";
  const digits = Number.isInteger(value) ? 0 : 1;
  return `${value.toFixed(digits)} años`;
};

const resolveState = ({
  kind,
  value,
  threshold,
}: {
  kind: "van" | "tir" | "payback";
  value?: number | null;
  threshold?: number | null;
}): MetricState => {
  if (!isNumber(value)) return "unknown";
  if (kind === "van") return value > 0 ? "positive" : "negative";
  if (kind === "tir") {
    if (!isNumber(threshold)) return "negative";
    return value > threshold ? "positive" : "negative";
  }
  // payback
  return value >= 0 ? "positive" : "negative";
};

const STATE_STYLES: Record<MetricState, string> = {
  positive: "text-emerald-600",
  negative: "text-red-600",
  unknown: "text-gray-500",
};

const STATE_TEXT: Record<MetricState, string> = {
  positive: "Favor.",
  negative: "Desfavor.",
  unknown: "—",
};

export default function Metrics({
  van,
  tir,
  paybackYears,
  wacc,
  currency = "COP",
  locale = "es-CO",
  invalid = false,
}: Props) {
  // VAN: valor “compacto” visible + valor completo para tooltip
  const vanDisplay = formatMoney(van, locale, currency);
  const vanFull = formatFullMoney(van, locale, currency);

  const metrics = [
    {
      key: "van",
      title: "VAN",
      description: "Valor Actual Neto",
      value: vanDisplay,
      tooltip: vanDisplay === vanFull ? undefined : vanFull,
      state: resolveState({ kind: "van", value: van }),
      titleId: "metric-van",
    },
    {
      key: "tir",
      title: "TIR",
      description: "Tasa Interna de Retorno",
      value: formatPercentage(tir),
      tooltip: undefined,
      state: resolveState({ kind: "tir", value: tir, threshold: wacc ?? null }),
      titleId: "metric-tir",
    },
    {
      key: "payback",
      title: "Payback",
      description: "Periodo de recuperación",
      value: formatPayback(paybackYears),
      tooltip: undefined,
      state: resolveState({ kind: "payback", value: paybackYears ?? null }),
      titleId: "metric-payback",
    },
  ] as const;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map(({ key, title, description, value, tooltip, state, titleId }) => (
        <article
          key={key}
          aria-labelledby={titleId}
          aria-describedby={`${titleId}-desc`}
          className={`min-w-0 rounded-2xl border bg-white p-5 shadow focus-within:ring-2 focus-within:ring-emerald-500 ${
            invalid ? "border-amber-300 bg-amber-50" : ""
          }`}
        >
          <header id={titleId} className="text-[11px] uppercase tracking-wide text-gray-500">
            {title}
          </header>

          <div className={`mt-1 min-w-0 font-semibold leading-tight ${STATE_STYLES[state]}`}>
            <span
              className="block max-w-full truncate text-2xl tabular-nums sm:text-3xl"
              title={tooltip ?? (value === "—" ? undefined : value)}
            >
              {value}
            </span>

            {invalid && key === "van" && (
              <span className="mt-2 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-amber-700">
                Datos inválidos
              </span>
            )}
          </div>

          <div className="mt-3 h-px w-full bg-gray-100" />

          <footer
            id={`${titleId}-desc`}
            className={`mt-2 break-words text-xs ${
              invalid ? "text-amber-700" : "text-gray-500"
            }`}
            aria-label={`Estado ${title}: ${
              invalid ? "Corrige entradas" : state === "unknown" ? "sin dato" : STATE_TEXT[state]
            }`}
          >
            {invalid ? "Corrige entradas" : STATE_TEXT[state]}
          </footer>

          <p className="sr-only">{description}</p>
        </article>
      ))}
    </div>
  );
}
