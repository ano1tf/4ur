"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

/* Champs de formulaire partagés par les éditeurs du Dashboard. */

const INPUT_CLASS =
  "mt-1.5 h-10 w-full rounded-md border border-white/12 bg-[#0b0b0b] px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-white/40";

export function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </span>
  );
}

export function Field({
  label,
  value,
  onChange,
  placeholder,
  mono,
  type = "text",
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  type?: string;
  hint?: string;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT_CLASS, mono && "font-mono text-[13px]")}
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <textarea
        value={value}
        rows={rows}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "mt-1.5 w-full resize-y rounded-md border border-white/12 bg-[#0b0b0b] px-3 py-2 text-[13px] leading-relaxed text-foreground outline-none transition-colors placeholder:text-muted-foreground/40 focus:border-white/40",
          mono && "font-mono text-[12.5px]"
        )}
      />
      {hint && <span className="mt-1 block text-[11px] text-muted-foreground/70">{hint}</span>}
    </label>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(INPUT_CLASS, "cursor-pointer appearance-none pr-8")}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'><polyline points='6 9 12 15 18 9'/></svg>\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.75rem center",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-[#0b0b0b] text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export const linesToArray = (s: string): string[] =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export const arrayToLines = (a: string[]): string => a.join("\n");

/**
 * Zone « un élément par ligne » : conserve le texte brut pendant la saisie
 * (sinon chaque retour à la ligne serait immédiatement avalé par le filtrage
 * des lignes vides) et ne remonte que la liste nettoyée au parent.
 */
export function LinesField({
  label,
  value,
  onChange,
  rows = 4,
  placeholder,
  hint,
  mono,
}: {
  label: string;
  value: string[];
  onChange: (v: string[]) => void;
  rows?: number;
  placeholder?: string;
  hint?: string;
  mono?: boolean;
}) {
  const normalized = arrayToLines(value);
  const [text, setText] = useState(normalized);
  const [syncedWith, setSyncedWith] = useState(normalized);

  // Resynchronise uniquement si la valeur a changé ailleurs (import, défauts…),
  // en dérivant l'état pendant le rendu plutôt que via un effet.
  if (normalized !== syncedWith) {
    setSyncedWith(normalized);
    if (arrayToLines(linesToArray(text)) !== normalized) setText(normalized);
  }

  return (
    <TextAreaField
      label={label}
      value={text}
      rows={rows}
      placeholder={placeholder}
      hint={hint}
      mono={mono}
      onChange={(v) => {
        setText(v);
        onChange(linesToArray(v));
      }}
    />
  );
}
