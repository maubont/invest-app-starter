import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Metrics from "../components/Metrics";
import { PresetSelect, PresetKey } from "../components/PresetSelect";
import { useLocalStorage } from "../hooks/useLocalStorage";

const CashflowChart = dynamic(() => import("../components/CashflowChart"), { ssr: false });

type RunSummary = {
  van: number;
  tir: number | null;
  payback_years: number | null;
};

type RunResponse = {
  summary: RunSummary;
  cashflows: number[];
  years: number[];
};

// ---------- Modelo de entradas, validación y presets ----------

type Inputs = {
  price: number;
  volume: number;
  wacc: number;
};

type ValidationResult = {
  ok: boolean;
  errors: Partial<Record<keyof Inputs, string>>;
};

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000";

const PRESETS: Record<Exclude<PresetKey, "custom">, Inputs> = {
  conservador: { price: 180, volume: 900, wacc: 0.18 },
  base: { price: 250, volume: 1400, wacc: 0.12 },
  agresivo: { price: 320, volume: 1800, wacc: 0.08 },
};

const LIMITS = {
  price: { min: 10, max: 500, step: 1 },
  volume: { min: 100, max: 2000, step: 10 },
  wacc: { min: 0.05, max: 0.25, step: 0.005 },
} as const;

const DEFAULT_PRESET: PresetKey = "base";
const DEFAULT_INPUTS = PRESETS.base;

const isSamePreset = (a: Inputs, b: Inputs) =>
  a.price === b.price && a.volume === b.volume && Math.abs(a.wacc - b.wacc) < 1e-6;

const detectPresetFromInputs = (values: Inputs): PresetKey => {
  for (const key of Object.keys(PRESETS) as Array<keyof typeof PRESETS>) {
    if (isSamePreset(values, PRESETS[key])) return key;
  }
  return "custom";
};

const validateInputs = (values: Inputs): ValidationResult => {
  const errors: ValidationResult["errors"] = {};

  if (values.price < LIMITS.price.min || values.price > LIMITS.price.max) {
    errors.price = `Fuera de rango (min ${LIMITS.price.min}, max ${LIMITS.price.max})`;
  }
  if (values.volume < LIMITS.volume.min || values.volume > LIMITS.volume.max) {
    errors.volume = `Fuera de rango (min ${LIMITS.volume.min}, max ${LIMITS.volume.max})`;
  }
  if (values.wacc < LIMITS.wacc.min || values.wacc > LIMITS.wacc.max) {
    errors.wacc = `Fuera de rango (min ${LIMITS.wacc.min}, max ${LIMITS.wacc.max})`;
  }

  return { ok: Object.keys(errors).length === 0, errors };
};

// ---------- Página ----------

type Status = "idle" | "loading" | "success" | "error" | "invalid";

export default function Home() {
  // Estado con persistencia
  const [inputs, setInputs] = useLocalStorage<Inputs>("invest-ui:inputs", DEFAULT_INPUTS);
  const [preset, setPreset] = useLocalStorage<PresetKey>("invest-ui:preset", DEFAULT_PRESET);

  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);
  const abortController = useRef<AbortController | null>(null);

  // Hidratar para evitar diferencias SSR/CSR en Next
  const [hydrated, setHydrated] = useState(false);
  const [initialised, setInitialised] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = window.setTimeout(() => setHydrated(true), 0);
    return () => window.clearTimeout(id);
  }, []);

  // Primera pasada: si inputs inválidos, volver a DEFAULT; si no, detectar preset
  useEffect(() => {
    if (!hydrated || initialised) return;

    const validation = validateInputs(inputs);
    if (!validation.ok) {
      setInputs({ ...DEFAULT_INPUTS });
      setPreset(DEFAULT_PRESET);
    } else {
      setPreset(detectPresetFromInputs(inputs));
    }
    setInitialised(true);
  }, [hydrated, initialised, inputs, setInputs, setPreset]);

  const validation = useMemo(() => validateInputs(inputs), [inputs]);
  const isValid = validation.ok;

  // Llamada al engine
  const run = useCallback(async (current: Inputs) => {
    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;

    setStatus("loading");
    setErrorMessage(null);

    try {
      const res = await fetch(`${ENGINE_URL}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project: {
            price: current.price,
            volume: current.volume,
            wacc: current.wacc,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: RunResponse = await res.json();
      setResult(data);
      setStatus("success");
    } catch (error) {
      if (controller.signal.aborted) return;
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
      setStatus("error");
    }
  }, []);

  // Recalcular con debounce si los inputs cambian
  useEffect(() => {
    if (!hydrated || !initialised) return;

    if (!isValid) {
      abortController.current?.abort();
      setStatus("invalid");
      return;
    }

    const timer = window.setTimeout(() => {
      run(inputs);
    }, 200);

    return () => {
      window.clearTimeout(timer);
      abortController.current?.abort();
    };
  }, [hydrated, initialised, inputs, isValid, run]);

  const summary = useMemo(() => result?.summary ?? null, [result]);
  const showEmpty = status === "idle" && !summary;

  // Helpers UI
  const applyPreset = useCallback(
    (key: Exclude<PresetKey, "custom">) => {
      const presetValues = PRESETS[key];
      setInputs({ ...presetValues });
      setPreset(key);
    },
    [setInputs, setPreset]
  );

  const handlePresetChange = useCallback(
    (key: PresetKey) => {
      if (key === "custom") return;
      applyPreset(key);
    },
    [applyPreset]
  );

  const updateInput = useCallback(
    (key: keyof Inputs, value: number) => {
      setInputs((prev) => {
        const nextValue = key === "wacc" ? Number(value.toFixed(3)) : Math.round(value);
        const next = { ...prev, [key]: nextValue };
        const detected = detectPresetFromInputs(next);
        setPreset(detected);
        return next;
      });
    },
    [setInputs, setPreset]
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Investment Analysis — Demo</h1>
        <p className="text-gray-600">Desliza y recalculo VAN/TIR/Payback contra el engine (FastAPI).</p>
      </header>

      <section className="grid items-start gap-6 md:grid-cols-2">
        <div className="space-y-5 rounded-2xl border bg-white p-5 shadow">
          <PresetSelect value={preset} onChange={handlePresetChange} />

          <Control
            name="price"
            label="Precio"
            min={LIMITS.price.min}
            max={LIMITS.price.max}
            step={LIMITS.price.step}
            value={inputs.price}
            onChange={(val) => updateInput("price", val)}
            error={validation.errors.price}
          />
          <Control
            name="volume"
            label="Volumen"
            min={LIMITS.volume.min}
            max={LIMITS.volume.max}
            step={LIMITS.volume.step}
            value={inputs.volume}
            onChange={(val) => updateInput("volume", val)}
            error={validation.errors.volume}
          />
          <Control
            name="wacc"
            label="WACC"
            min={LIMITS.wacc.min}
            max={LIMITS.wacc.max}
            step={LIMITS.wacc.step}
            value={inputs.wacc}
            onChange={(val) => updateInput("wacc", val)}
            formatter={(v) => `${(v * 100).toFixed(1)}%`}
            error={validation.errors.wacc}
          />

          {status === "loading" && <p className="text-sm text-gray-500">Calculando…</p>}
          {status === "invalid" && (
            <p className="text-sm text-amber-700">Entradas fuera de rango. Corrige para recalcular.</p>
          )}
          {status === "error" && (
            <div className="text-sm text-red-600">
              <p className="font-semibold">No se pudo calcular.</p>
              {errorMessage && <p className="mt-1 break-words text-xs text-red-500">{errorMessage}</p>}
              <button
                type="button"
                onClick={() => run(inputs)}
                className="mt-2 rounded-lg border border-red-200 px-3 py-1 text-xs font-medium text-red-700 transition hover:bg-red-50"
              >
                Reintentar
              </button>
            </div>
          )}
        </div>

        <div className="grid gap-4">
          <Metrics
            van={summary?.van}
            tir={summary?.tir ?? null}
            paybackYears={summary?.payback_years ?? null}
            wacc={inputs.wacc}
            invalid={!isValid}
          />

          {showEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Ajusta los controles para obtener los indicadores VAN, TIR y Payback.
            </div>
          )}

          {result && <CashflowChart years={result.years} cashflows={result.cashflows} />}

          {result && (
            <pre className="overflow-auto rounded-2xl bg-slate-900 p-4 text-xs text-emerald-300">
              {JSON.stringify(result, null, 2)}
            </pre>
          )}

          {status === "loading" && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
              Preparando resultados…
            </div>
          )}

          {status === "error" && (
            <div className="rounded-2xl border border-dashed border-red-200 bg-red-50 p-6 text-sm text-red-700">
              {errorMessage ? `Error: ${errorMessage}` : "Ocurrió un error al consultar el engine."}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

// ---------- Control (slider) ----------

type ControlProps = {
  name: keyof Inputs;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
  error?: string;
};

function Control({
  name,
  label,
  min,
  max,
  step,
  value,
  onChange,
  formatter,
  error,
}: ControlProps) {
  const view = formatter ? formatter(value) : value.toString();
  const inputId = `control-${name}`;
  const helperId = error ? `${inputId}-error` : undefined;

  return (
    <label htmlFor={inputId} className="block">
      <div className="mb-1 text-sm text-gray-700">
        {label}: <b className="tabular-nums">{view}</b>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={`${label}: ${view}`}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={helperId}
        onChange={(event) => onChange(Number(event.target.value))}
        className={`w-full accent-black ${error ? "focus-visible:outline-red-500" : ""}`}
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
      {error && (
        <p id={helperId} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </label>
  );
}

