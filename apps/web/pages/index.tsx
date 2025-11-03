import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Metrics from "../components/Metrics";

const CashflowChart = dynamic(() => import("../components/CashflowChart"), { ssr: false });

type EngineResult = {
  summary: { van: number; tir: number | null; payback_years: number | null };
  cashflows: number[];
  years: number[];
};

const ENGINE = process.env.NEXT_PUBLIC_ENGINE_URL || "http://localhost:8000";

export default function Home() {
  const [price, setPrice] = useState<number>(100);
  const [volume, setVolume] = useState<number>(1000);
  const [wacc, setWacc] = useState<number>(0.15);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string>("");
  const [result, setResult] = useState<EngineResult | null>(null);

  async function run() {
    setLoading(true); setErr("");
    try {
      const res = await fetch(`${ENGINE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version_id: "demo", mode: "unlevered", inputs: { price, volume, wacc } }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: EngineResult = await res.json();
      setResult(data);
    } catch (e: any) {
      setErr(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const t = setTimeout(run, 200);
    return () => clearTimeout(t);
  }, [price, volume, wacc]);

  return (
    <main className="max-w-6xl mx-auto px-6 py-10">
      <header className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold">Investment Analysis — Demo</h1>
        <p className="text-gray-600">Desliza y recalculo VAN/TIR/Payback contra el engine (FastAPI).</p>
      </header>

      <section className="grid md:grid-cols-2 gap-6 items-start">
        <div className="space-y-5 bg-white border rounded-2xl shadow p-5">
          <Control label="Precio" min={10} max={500} step={1} value={price} onChange={setPrice} />
          <Control label="Volumen" min={100} max={2000} step={10} value={volume} onChange={setVolume} />
          <Control label="WACC" min={0.05} max={0.25} step={0.005} value={wacc}
            onChange={setWacc} formatter={(v) => `${(v * 100).toFixed(1)}%`} />
          {loading && <p className="text-sm text-gray-500">Calculando…</p>}
          {err && <p className="text-sm text-red-600">Error: {err}</p>}
        </div>

        <div className="grid gap-4">
          <Metrics
            van={result?.summary?.van}
            tir={result?.summary?.tir ?? null}
            paybackYears={result?.summary?.payback_years ?? null}
          />
          <CashflowChart years={result?.years ?? []} cashflows={result?.cashflows ?? []} />
          <pre className="bg-black text-green-400 p-4 rounded-2xl shadow overflow-auto text-sm">
            {result ? JSON.stringify(result, null, 2) : "Sin resultados aún."}
          </pre>
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
  onChange: (v: number) => void;
  formatter?: (v: number) => string;
};

function Control({ label, min, max, step, value, onChange, formatter }: ControlProps) {
  const view = formatter ? formatter(value) : value.toString();
  return (
    <label className="block">
      <div className="mb-1 text-sm text-gray-700">{label}: <b className="tabular-nums">{view}</b></div>
      <input
        type="range"
        min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-black"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span><span>{max}</span>
      </div>
    </label>
  );
}
