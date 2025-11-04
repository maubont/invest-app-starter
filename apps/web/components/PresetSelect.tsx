import * as React from "react";

type PresetKey = "conservador" | "base" | "agresivo" | "custom";

type Props = {
  value: PresetKey;
  onChange: (preset: PresetKey) => void;
};

const OPTIONS: Array<{ label: string; value: PresetKey; disabled?: boolean }> = [
  { label: "Conservador", value: "conservador" },
  { label: "Base", value: "base" },
  { label: "Agresivo", value: "agresivo" },
  { label: "Personalizado", value: "custom", disabled: true },
];

export function PresetSelect({ value, onChange }: Props) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      Preset
      <select
        aria-label="Selecciona un preset de entradas"
        className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        value={value}
        onChange={(event) => onChange(event.target.value as PresetKey)}
      >
        {OPTIONS.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-disabled={option.disabled || undefined}
          >
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export type { PresetKey };
