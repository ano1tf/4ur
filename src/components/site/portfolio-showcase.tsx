"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Layers, ShieldCheck, X } from "lucide-react";
import { CASE_CATEGORIES, type CaseCategory, type CaseStudy } from "@/lib/case-studies";
import { SpotlightCard } from "./spotlight-card";
import { ActionButton } from "./action-button";
import { cn } from "@/lib/utils";

export function PortfolioShowcase({ items = [] }: { items?: CaseStudy[] }) {
  const [filter, setFilter] = useState<"all" | CaseCategory>("all");
  const [selected, setSelected] = useState<CaseStudy | null>(null);

  /* Filtres : « Toutes » + uniquement les disciplines réellement représentées. */
  const filters = useMemo<{ id: "all" | CaseCategory; label: string }[]>(
    () => [
      {
        id: "all",
        label: `Toutes les études (${items.length})`,
      },
      ...CASE_CATEGORIES.filter((c) => items.some((item) => item.category === c.id)).map(
        (c) => ({ id: c.id, label: c.label })
      ),
    ],
    [items]
  );

  const activeFilter = filters.some((f) => f.id === filter) ? filter : "all";
  const visible =
    activeFilter === "all"
      ? items
      : items.filter((item) => item.category === activeFilter);

  return (
    <section className="section-beam relative py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        {/* Barre de filtres capsule */}
        <div
          className="inline-flex flex-wrap items-center gap-1.5 rounded-full border border-white/[0.09] bg-white/[0.025] p-1.5 backdrop-blur-xl"
          role="tablist"
          aria-label="Filtrer par discipline"
        >
          {filters.map((f) => {
            const active = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "relative rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <motion.span
                    layoutId="portfolio-filter-pill"
                    transition={{ type: "spring", stiffness: 420, damping: 32 }}
                    className="pointer-events-none absolute inset-0 rounded-full border border-white/[0.14] bg-white/[0.10] shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                  />
                )}
                <span className="relative z-10">{f.label}</span>
              </button>
            );
          })}
        </div>

        {/* Grille d'études de cas */}
        {items.length === 0 && (
          <p className="mt-12 rounded-2xl border border-dashed border-white/[0.12] p-10 text-center text-sm text-muted-foreground">
            Nos prochaines études de cas arrivent bientôt.
          </p>
        )}
        <div className="mt-12 grid gap-6 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visible.map((study) => (
              <motion.div
                key={study.slug}
                id={study.slug}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                <SpotlightCard className="flex h-full flex-col justify-between p-7 sm:p-8">
                  <div>
                    {/* Fenêtre d'architecture */}
                    <div
                      className="relative mb-7 overflow-hidden rounded-xl border border-white/[0.09] p-6"
                      style={{
                        background: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-white/30" />
                          <span className="size-2 rounded-full bg-white/15" />
                          <span className="size-2 rounded-full bg-white/15" />
                        </div>
                        <span className="rounded-full border border-white/15 bg-black/35 px-2.5 py-0.5 font-mono text-[10px] tracking-[0.14em] text-white/80">
                          https://{study.domain}
                        </span>
                      </div>

                      <div className="mt-8 flex items-end justify-between gap-4">
                        <div>
                          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/65">
                            {study.categoryLabel}
                          </p>
                          <p className="mt-1 font-display text-2xl font-extrabold tracking-tight text-foreground">
                            {study.client}
                          </p>
                        </div>
                        <span className="font-mono text-xs text-white/60">
                          {study.year}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-muted-foreground">{study.sector}</p>
                    <h2 className="mt-2 font-display text-xl font-bold leading-snug tracking-[-0.02em] sm:text-2xl">
                      {study.headline}
                    </h2>
                    <p className="mt-3 text-[14px] leading-[1.7] text-muted-foreground">
                      {study.summary}
                    </p>

                    {/* Stack */}
                    <div className="mt-5 flex flex-wrap gap-1.5">
                      {study.stack.map((tech) => (
                        <span
                          key={tech}
                          className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10.5px] text-foreground/80"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Métriques + bouton détail */}
                  <div className="mt-8 border-t border-white/[0.08] pt-6">
                    <div className="grid grid-cols-3 gap-3">
                      {study.metrics.map((m) => (
                        <div key={m.label}>
                          <p className="font-display text-lg font-extrabold tracking-tight text-foreground sm:text-xl">
                            {m.value}
                          </p>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                            {m.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 flex items-center justify-between gap-3">
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        icon="arrow-right"
                        onClick={() => setSelected(study)}
                      >
                        Lire l&apos;étude technique
                      </ActionButton>
                      <ActionButton
                        href={`/contact?subject=both&draft=${encodeURIComponent(
                          `Bonjour, j'ai apprécié votre étude ${study.client} et souhaite discuter d'un projet similaire.`
                        )}`}
                        variant="ghost"
                        icon="arrow-up-right"
                      >
                        Projet similaire
                      </ActionButton>
                    </div>
                  </div>
                </SpotlightCard>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Modale d'architecture détaillée */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={() => setSelected(null)}
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="surface-glass relative max-h-[88vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/[0.14] bg-[#0b0b10] p-7 sm:p-9"
            >
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fermer la fiche"
                className="absolute right-5 top-5 inline-flex size-9 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="size-4" />
              </button>

              <p className="font-mono text-[10.5px] uppercase tracking-[0.24em] text-emerald-400">
                {selected.categoryLabel} · {selected.year}
              </p>
              <h3 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {selected.client}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{selected.sector}</p>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4">
                  <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    <Layers className="size-3.5 text-foreground" />
                    Problématique initiale
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {selected.challenge}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.04] p-4">
                  <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-emerald-400">
                    <ShieldCheck className="size-3.5" />
                    Réponse d&apos;ingénierie 4ur
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-foreground/90">
                    {selected.solution}
                  </p>
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5">
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Livrables déployés
                </p>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {selected.deliverables.map((item) => (
                    <li
                      key={item}
                      className="flex items-start gap-2 text-[13px] text-foreground/90"
                    >
                      <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                <ActionButton
                  href={`/contact?subject=both&draft=${encodeURIComponent(
                    `Bonjour, suite à la lecture de l'étude ${selected.client}, j'aimerais échanger sur mon projet.`
                  )}`}
                  variant="primary"
                  size="md"
                >
                  Discuter d&apos;un projet comparable
                </ActionButton>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="font-mono text-xs text-muted-foreground hover:text-foreground"
                >
                  Fermer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
