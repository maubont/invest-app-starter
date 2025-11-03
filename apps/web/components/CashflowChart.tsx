import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart,
  LineElement,
  PointElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
} from "chart.js";

Chart.register(LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend);

type Props = { years: number[]; cashflows: number[] };

export default function CashflowChart({ years, cashflows }: Props) {
  if (!years?.length || !cashflows?.length) return null;

  const data = {
    labels: years,
    datasets: [
      {
        label: "Flujo de caja",
        data: cashflows,
        borderWidth: 2,
        tension: 0.2,
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: { mode: "index" as const, intersect: false },
    plugins: { legend: { display: false } },
    scales: {
      y: { ticks: { callback: (v: any) => Number(v).toLocaleString("es-CO") } },
    },
  };

  return (
    <div className="rounded-2xl border bg-white shadow p-4">
      <h3 className="text-sm text-gray-600 mb-2">Flujo de caja (por año)</h3>
      <Line data={data} options={options} />
    </div>
  );
}
