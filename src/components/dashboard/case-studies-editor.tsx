"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Eye,
  EyeOff,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CASE_ACCENT_PRESETS,
  CASE_CATEGORIES,
  createBlankCaseStudy,
  slugifyCaseStudy,
  uniqueCaseSlug,
  type CaseCategory,
  type CaseStudy,
} from "@/lib/case-studies";
import { Field, LinesField, SelectField, TextAreaField } from "./fields";

/* -------------------------------------------------------------------------- */
/*          Éditeur des réalisations (ajout / modification / suppression)     */
/* -------------------------------------------------------------------------- */

export const MAX_CASE_STUDIES_UI = 30;

const CUSTOM_ACCENT = "custom";

function accentPresetId(study: CaseStudy): string {
  return (
    CASE_ACCENT_PRESETS.find((p) => p.from === study.accentFrom && p.to === study.accentTo)
      ?.id ?? CUSTOM_ACCENT
  );
}

const metricsToLines = (metrics: CaseStudy["metrics"]): string[] =>
  metrics.map((m) => `${m.value} | ${m.label}`);

const linesToMetrics = (lines: string[]): CaseStudy["metrics"] =>
  lines.map((line) => {
    const [value, ...rest] = line.split("|");
    const v = value.trim();
    const label = rest.join("|").trim();
    return { value: v, label: label || v };
  });

const stackToText = (stack: string[]): string => stack.join(", ");
const textToStack = (text: string): string[] =>
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

interface Props {
  items: CaseStudy[];
  onChange: (next: CaseStudy[]) => void;
}

export function CaseStudiesEditor({ items, onChange }: Props) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [stackDrafts, setStackDrafts] = useState<Record<string, string>>({});

  const update = (index: number, patch: Partial<CaseStudy>) =>
    onChange(items.map((c, i) => (i === index ? { ...c, ...patch } : c)));

  const add = () => {
    if (items.length >= MAX_CASE_STUDIES_UI) return;
    const next = [createBlankCaseStudy(items), ...items];
    onChange(next);
    setExpanded(0);
    setConfirmDelete(null);
  };

  const duplicate = (index: number) => {
    if (items.length >= MAX_CASE_STUDIES_UI) return;
    const src = items[index];
    const copy: CaseStudy = {
      ...structuredClone(src),
      slug: uniqueCaseSlug(
        `${src.slug}-copie`,
        items.map((c) => c.slug)
      ),
      client: `${src.client} (copie)`,
    };
    const next = [...items.slice(0, index + 1), copy, ...items.slice(index + 1)];
    onChange(next);
    setExpanded(index + 1);
  };

  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setConfirmDelete(null);
    setExpanded((e) => (e === null ? null : e === index ? null : e > index ? e - 1 : e));
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= items.length) return;
    const next = [...items];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setExpanded((e) => (e === index ? target : e === target ? index : e));
    setConfirmDelete(null);
  };

  const onClientChange = (index: number, client: string) => {
    const current = items[index];
    // Le slug suit le nom du client tant qu'il n'a pas été personnalisé.
    const followsClient =
      !current.slug ||
      current.slug === slugifyCaseStudy(current.client) ||
      current.slug.startsWith("nouvelle-realisation");
    const patch: Partial<CaseStudy> = { client };
    if (followsClient) {
      patch.slug = uniqueCaseSlug(
        slugifyCaseStudy(client),
        items.filter((_, i) => i !== index).map((c) => c.slug)
      );
    }
    update(index, patch);
  };

  const onCategoryChange = (index: number, category: CaseCategory) => {
    const current = items[index];
    const prev = CASE_CATEGORIES.find((c) => c.id === current.category);
    const next = CASE_CATEGORIES.find((c) => c.id === category);
    const patch: Partial<CaseStudy> = { category };
    // Le libellé suit la catégorie tant qu'il n'a pas été personnalisé.
    if (next && (!current.categoryLabel || current.categoryLabel === prev?.defaultCategoryLabel)) {
      patch.categoryLabel = next.defaultCategoryLabel;
    }
    update(index, patch);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* En-tête de section */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-card px-5 py-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
            Réalisations · {items.length} / {MAX_CASE_STUDIES_UI}
          </p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            Les 3 premières sont mises en avant sur l&apos;accueil. L&apos;ordre ci-dessous est
            celui de la page <span className="font-mono text-foreground/80">/realisations</span>.
            Pensez à <strong className="text-foreground">Enregistrer</strong> pour publier.
          </p>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={items.length >= MAX_CASE_STUDIES_UI}
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <Plus className="size-3.5" />
          Ajouter une réalisation
        </button>
      </div>

      {items.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/15 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            Aucune réalisation. La galerie publique affichera un message d&apos;attente.
          </p>
          <button
            type="button"
            onClick={add}
            className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
          >
            <Plus className="size-3.5" />
            Créer la première
          </button>
        </div>
      )}

      {items.map((study, i) => {
        const isOpen = expanded === i;
        const category = CASE_CATEGORIES.find((c) => c.id === study.category);
        const featured = i < 3;
        const stackDraft = stackDrafts[study.slug] ?? stackToText(study.stack);

        return (
          <div
            key={`${i}-${study.slug}`}
            className={cn(
              "rounded-xl border bg-card transition-colors",
              isOpen ? "border-white/25" : "border-white/10"
            )}
          >
            {/* Ligne résumé */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4">
              <button
                type="button"
                onClick={() => {
                  setExpanded(isOpen ? null : i);
                  setConfirmDelete(null);
                }}
                className="flex min-w-0 flex-1 items-center gap-4 text-left"
                aria-expanded={isOpen}
              >
                <span
                  className="hidden size-10 shrink-0 rounded-lg border border-white/10 sm:block"
                  style={{
                    background: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
                  }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="truncate font-display text-base font-bold tracking-tight">
                      {study.client || "Sans nom"}
                    </span>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {study.year}
                    </span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground">
                      {category?.label ?? study.category}
                    </span>
                    {featured && (
                      <span
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.16em] text-emerald-300"
                        title="Affichée sur la page d'accueil"
                      >
                        <Eye className="size-3" />
                        Accueil
                      </span>
                    )}
                    {!featured && (
                      <span
                        className="inline-flex items-center gap-1 font-mono text-[9.5px] uppercase tracking-[0.16em] text-muted-foreground/60"
                        title="Visible uniquement sur /realisations"
                      >
                        <EyeOff className="size-3" />
                        Galerie
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">
                    {study.headline || "Titre à renseigner"}
                  </span>
                </span>
              </button>

              <div className="flex items-center gap-1">
                <IconButton
                  label="Monter"
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                >
                  <ChevronUp className="size-4" />
                </IconButton>
                <IconButton
                  label="Descendre"
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                >
                  <ChevronDown className="size-4" />
                </IconButton>
                <IconButton
                  label="Dupliquer"
                  disabled={items.length >= MAX_CASE_STUDIES_UI}
                  onClick={() => duplicate(i)}
                >
                  <Copy className="size-3.5" />
                </IconButton>
                {confirmDelete === i ? (
                  <span className="ml-1 inline-flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      className="h-8 rounded-md bg-red-500/90 px-2.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-white hover:bg-red-500"
                    >
                      Confirmer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(null)}
                      className="h-8 rounded-md border border-white/12 px-2.5 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <IconButton
                    label="Supprimer"
                    tone="danger"
                    onClick={() => setConfirmDelete(i)}
                  >
                    <Trash2 className="size-3.5" />
                  </IconButton>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setExpanded(isOpen ? null : i);
                    setConfirmDelete(null);
                  }}
                  className="ml-1 h-8 rounded-md border border-white/12 px-3 font-mono text-[10.5px] uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                  {isOpen ? "Fermer" : "Modifier"}
                </button>
              </div>
            </div>

            {/* Formulaire détaillé */}
            {isOpen && (
              <div className="border-t border-white/[0.07] px-5 py-5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Client"
                    value={study.client}
                    onChange={(v) => onClientChange(i, v)}
                    placeholder="Kova Finance"
                  />
                  <Field
                    label="Secteur · Ville"
                    value={study.sector}
                    onChange={(v) => update(i, { sector: v })}
                    placeholder="Gestion privée & Fintech · Paris"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Année"
                    value={study.year}
                    mono
                    onChange={(v) => update(i, { year: v })}
                    placeholder="2026"
                  />
                  <SelectField
                    label="Catégorie"
                    value={study.category}
                    onChange={(v) => onCategoryChange(i, v as CaseCategory)}
                    options={CASE_CATEGORIES.map((c) => ({ value: c.id, label: c.label }))}
                  />
                  <Field
                    label="Libellé affiché"
                    value={study.categoryLabel}
                    onChange={(v) => update(i, { categoryLabel: v })}
                    placeholder="Web & Durcissement Cyber"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <Field
                    label="Domaine"
                    value={study.domain}
                    mono
                    onChange={(v) => update(i, { domain: v })}
                    placeholder="kova-finance.fr"
                  />
                  <Field
                    label="Slug (ancre URL)"
                    value={study.slug}
                    mono
                    onChange={(v) => update(i, { slug: slugifyCaseStudy(v) })}
                    hint={`/realisations#${study.slug || "…"}`}
                  />
                  <SelectField
                    label="Dégradé d'aperçu"
                    value={accentPresetId(study)}
                    onChange={(v) => {
                      const preset = CASE_ACCENT_PRESETS.find((p) => p.id === v);
                      if (preset) update(i, { accentFrom: preset.from, accentTo: preset.to });
                    }}
                    options={[
                      ...CASE_ACCENT_PRESETS.map((p) => ({ value: p.id, label: p.label })),
                      ...(accentPresetId(study) === CUSTOM_ACCENT
                        ? [{ value: CUSTOM_ACCENT, label: "Personnalisé (actuel)" }]
                        : []),
                    ]}
                  />
                </div>

                <div className="mt-3">
                  <Field
                    label="Titre"
                    value={study.headline}
                    onChange={(v) => update(i, { headline: v })}
                    placeholder="Portail patrimonial haute fréquence & architecture Zero-Trust."
                  />
                </div>

                <div className="mt-3">
                  <TextAreaField
                    label="Résumé (carte)"
                    value={study.summary}
                    rows={2}
                    onChange={(v) => update(i, { summary: v })}
                    placeholder="Refonte intégrale de l'interface et durcissement complet…"
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <TextAreaField
                    label="Problématique initiale"
                    value={study.challenge}
                    rows={4}
                    onChange={(v) => update(i, { challenge: v })}
                  />
                  <TextAreaField
                    label="Réponse d'ingénierie 4ur"
                    value={study.solution}
                    rows={4}
                    onChange={(v) => update(i, { solution: v })}
                  />
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <LinesField
                    label="Métriques (une par ligne : valeur | libellé)"
                    value={metricsToLines(study.metrics)}
                    rows={4}
                    mono
                    onChange={(lines) => update(i, { metrics: linesToMetrics(lines.slice(0, 4)) })}
                    placeholder={"0.38 s | Largest Contentful Paint\nA+ | Mozilla Observatory"}
                    hint="4 métriques maximum, 3 recommandées."
                  />
                  <LinesField
                    label="Livrables (un par ligne)"
                    value={study.deliverables}
                    rows={4}
                    onChange={(lines) => update(i, { deliverables: lines.slice(0, 10) })}
                    placeholder={"Direction artistique & Design System\nAudit OWASP Top 10"}
                  />
                </div>

                <div className="mt-3">
                  <Field
                    label="Stack technique (séparée par des virgules)"
                    value={stackDraft}
                    mono
                    onChange={(v) => {
                      setStackDrafts((d) => ({ ...d, [study.slug]: v }));
                      update(i, { stack: textToStack(v).slice(0, 12) });
                    }}
                    placeholder="Next.js 16, TypeScript, CSP Nonce, TLS 1.3"
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  disabled,
  tone = "default",
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: "default" | "danger";
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md border border-white/12 text-muted-foreground transition-colors hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30",
        tone === "danger" && "hover:border-red-500/50 hover:text-red-400"
      )}
    >
      {children}
    </button>
  );
}
