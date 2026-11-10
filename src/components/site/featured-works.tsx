import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { CaseStudy } from "@/lib/case-studies";
import { Reveal } from "./reveal";
import { SpotlightCard } from "./spotlight-card";
import { ActionButton, EyebrowPill } from "./action-button";

/**
 * Aperçu minimaliste des 3 premières études de cas sur la page d'accueil,
 * orientant vers la galerie complète `/realisations`.
 * L'ordre est celui défini dans le Dashboard (onglet « Réalisations »).
 */
export function FeaturedWorks({ items = [] }: { items?: CaseStudy[] }) {
  const featured = items.slice(0, 3);
  if (featured.length === 0) return null;

  return (
    <section className="section-beam relative border-t border-white/[0.07] py-28 sm:py-36">
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <EyebrowPill dot="white">02 · Sélection</EyebrowPill>
              <h2 className="mt-5 text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
                 Conçus pour durer.{" "}
                <span className="text-white/42">Prouvés en production.</span>
              </h2>
            </div>
            <ActionButton
              href="/realisations"
              variant="secondary"
              size="md"
              icon="arrow-right"
            >
              Toutes les réalisations
            </ActionButton>
          </div>
        </Reveal>

        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {featured.map((study, i) => (
            <Reveal key={study.slug} delay={i * 0.08} className="h-full">
              <SpotlightCard className="h-full">
                <Link
                  href={`/realisations#${study.slug}`}
                  className="flex h-full flex-col justify-between p-6 sm:p-7"
                >
                  <div>
                    {/* Aperçu fenêtre minimaliste haute couture */}
                    <div
                      className="relative mb-6 overflow-hidden rounded-xl border border-white/[0.08] p-5"
                      style={{
                        background: `linear-gradient(135deg, ${study.accentFrom}, ${study.accentTo})`,
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="size-2 rounded-full bg-white/25" />
                          <span className="size-2 rounded-full bg-white/15" />
                          <span className="size-2 rounded-full bg-white/15" />
                        </div>
                        <span className="font-mono text-[10px] tracking-[0.14em] text-white/60">
                          {study.domain}
                        </span>
                      </div>
                      <div className="mt-7">
                        <p className="font-display text-lg font-extrabold tracking-tight text-foreground">
                          {study.client}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.2em] text-white/60">
                          {study.categoryLabel}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground">{study.sector}</span>
                      <span className="font-mono text-[11px] text-white/40">
                        {study.year}
                      </span>
                    </div>

                    <h3 className="mt-3 font-display text-lg font-bold leading-snug tracking-[-0.02em]">
                      {study.headline}
                    </h3>
                  </div>

                  <div className="mt-7 flex items-center justify-between border-t border-white/[0.07] pt-5">
                    <div className="flex items-center gap-5">
                      {study.metrics.slice(0, 2).map((m) => (
                        <div key={m.label}>
                          <p className="font-display text-base font-extrabold tracking-tight text-foreground">
                            {m.value}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{m.label}</p>
                        </div>
                      ))}
                    </div>

                    <span className="inline-flex size-8 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-all duration-200 group-hover:border-white/30 group-hover:bg-white/[0.10]">
                      <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </span>
                  </div>
                </Link>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
