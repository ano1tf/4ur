import Link from "next/link";
import { Activity, ArrowUpRight, Calculator } from "lucide-react";
import { Hero3D } from "@/components/site/hero3d";
import { MarqueeTicker } from "@/components/site/marquee-ticker";
import { Poles } from "@/components/site/poles";
import { FeaturedWorks } from "@/components/site/featured-works";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { SpotlightCard } from "@/components/site/spotlight-card";
import { EyebrowPill } from "@/components/site/action-button";
import { getContentBundle } from "@/lib/content";

const STANDARDS = [
  {
    value: "< 0.5 s",
    label: "Temps d'affichage cible",
    detail: "Rendu hybride statique, polices locales et animations compositées sur GPU.",
  },
  {
    value: "100 / 100",
    label: "Core Web Vitals",
    detail: "Performance, accessibilité, bonnes pratiques et référencement technique natif.",
  },
  {
    value: "A+ OWASP",
    label: "Durcissement natif",
    detail: "Politique CSP stricte, HSTS, protection anti-bot et zéro dépendance superflue.",
  },
];

/** Rendu à la demande : la sélection de réalisations est éditable depuis le Dashboard. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { caseStudies } = await getContentBundle();

  return (
    <>
      <Hero3D />
      <MarqueeTicker />
      <Poles />
      <FeaturedWorks items={caseStudies} />

      {/* Section 03 — Standards & Portails vers nos expériences interactives */}
      <section className="section-beam relative border-t border-white/[0.07] py-28 sm:py-36">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <EyebrowPill dot="emerald">03 · Standards &amp; Outils</EyebrowPill>
            <h2 className="mt-5 max-w-2xl text-balance font-display text-3xl font-extrabold leading-[1.08] tracking-[-0.03em] sm:text-5xl">
              La précision se mesure.{" "}
              <span className="text-white/42">Testez-la vous-même.</span>
            </h2>
          </Reveal>

          {/* Triptyque architectural épuré */}
          <div className="mt-14 grid gap-8 border-y border-white/[0.07] py-12 md:grid-cols-3 md:gap-10">
            {STANDARDS.map((s, i) => (
              <Reveal key={s.value} delay={i * 0.08}>
                <div>
                  <p className="text-platinum font-display text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">
                    {s.value}
                  </p>
                  <p className="mt-3 font-display text-base font-bold tracking-tight text-foreground">
                    {s.label}
                  </p>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
                    {s.detail}
                  </p>
                </div>
              </Reveal>
            ))}
          </div>

          {/* Deux portails minimalistes vers les pages interactives dédiées */}
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <Reveal delay={0.05} className="h-full">
              <SpotlightCard spotlightColor="rgba(52, 211, 153, 0.09)" className="h-full">
                <Link
                  href="/lab"
                  className="flex h-full items-center justify-between gap-6 p-7 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-400">
                      <Activity className="size-5" strokeWidth={1.7} />
                    </span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400">
                        Laboratoire interactif
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
                        Tester notre bouclier WAF en direct
                      </h3>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                        Simulez des injections SQL, XSS ou DDoS et inspectez nos en-têtes
                        HTTP en temps réel.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-all group-hover:border-white/30 group-hover:bg-white/[0.10]">
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </SpotlightCard>
            </Reveal>

            <Reveal delay={0.12} className="h-full">
              <SpotlightCard className="h-full">
                <Link
                  href="/simulateur"
                  className="flex h-full items-center justify-between gap-6 p-7 sm:p-8"
                >
                  <div className="flex items-start gap-4">
                    <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl border border-white/[0.12] bg-white/[0.04] text-foreground">
                      <Calculator className="size-5" strokeWidth={1.7} />
                    </span>
                    <div>
                      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                        Estimation instantanée
                      </p>
                      <h3 className="mt-1 font-display text-lg font-bold tracking-tight">
                        Configurer et chiffrer mon projet
                      </h3>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted-foreground">
                        Estimez votre budget, vos délais et vos modules en 30 secondes
                        avant de nous écrire.
                      </p>
                    </div>
                  </div>
                  <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/[0.12] bg-white/[0.04] transition-all group-hover:border-white/30 group-hover:bg-white/[0.10]">
                    <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </Link>
              </SpotlightCard>
            </Reveal>
          </div>
        </div>
      </section>

      <CtaBanner
        title="Prêt à construire sans compromis ?"
        titleMuted="Parlons de votre projet."
        body="Réponse personnelle sous 24 h ouvrées avec un premier cadrage clair, honnête et sans engagement."
        cta="Démarrer un projet"
      />
    </>
  );
}
