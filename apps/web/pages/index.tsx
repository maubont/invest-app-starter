import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Metrics from "../components/Metrics";

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

const ENGINE_URL = process.env.NEXT_PUBLIC_ENGINE_URL ?? "http://localhost:8000";

type Status = "idle" | "loading" | "success" | "error";

export default function Home() {
  const [price, setPrice] = useState<number>(100);
  const [volume, setVolume] = useState<number>(1000);
  const [wacc, setWacc] = useState<number>(0.15);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<RunResponse | null>(null);
  const abortController = useRef<AbortController | null>(null);

  const run = useCallback(async () => {
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
            price,
            volume,
            wacc,
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data: RunResponse = await res.json();
      setResult(data);
      setStatus("success");
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
      setStatus("error");
    }
  }, [price, volume, wacc]);

  useEffect(() => {
    const timer = setTimeout(() => {
      run();
    }, 200);

    return () => {
      clearTimeout(timer);
      abortController.current?.abort();
    };
  }, [price, volume, wacc, run]);

  const summary = useMemo(() => {
    if (status !== "success" || !result) {
      return null;
    }
    return result.summary;
  }, [result, status]);
  const showEmpty = status === "idle" && !summary;

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Investment Analysis — Demo</h1>
        <p className="text-gray-600">Desliza y recalculo VAN/TIR/Payback contra el engine (FastAPI).</p>
      </header>

      <section className="grid items-start gap-6 md:grid-cols-2">
        <div className="space-y-5 rounded-2xl border bg-white p-5 shadow">
          <Control label="Precio" min={10} max={500} step={1} value={price} onChange={setPrice} />
          <Control label="Volumen" min={100} max={2000} step={10} value={volume} onChange={setVolume} />
          <Control
            label="WACC"
            min={0.05}
            max={0.25}
            step={0.005}
            value={wacc}
            onChange={setWacc}
            formatter={(v) => `${(v * 100).toFixed(1)}%`}
          />

          {status === "loading" && <p className="text-sm text-gray-500">Calculando…</p>}
          {status === "error" && (
            <div className="text-sm text-red-600">
              <p className="font-semibold">No se pudo calcular.</p>
              {errorMessage && <p className="mt-1 break-words text-xs text-red-500">{errorMessage}</p>}
              <button
                type="button"
                onClick={run}
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
            wacc={wacc}
          />

          {showEmpty && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              Ajusta los controles para obtener los indicadores VAN, TIR y Payback.
            </div>
          )}

          {status === "success" && result && (
            <CashflowChart years={result.years} cashflows={result.cashflows} />
          )}

          {status === "success" && result && (
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

type ControlProps = {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  formatter?: (value: number) => string;
};

function Control({ label, min, max, step, value, onChange, formatter }: ControlProps) {
  const view = formatter ? formatter(value) : value.toString();

  return (
    <label className="block" aria-label={`${label}: ${view}`}>
      <div className="mb-1 text-sm text-gray-700">
        {label}: <b className="tabular-nums">{view}</b>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-black"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </label>
  );
}
