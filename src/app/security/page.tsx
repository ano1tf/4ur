import type { Metadata } from "next";
import {
  Check,
  DatabaseBackup,
  FileCheck2,
  Fingerprint,
  GraduationCap,
  Radar,
  ServerCog,
} from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { CtaBanner } from "@/components/site/cta-banner";
import { Reveal } from "@/components/site/reveal";
import { SpotlightCard } from "@/components/site/spotlight-card";
import { ActionButton } from "@/components/site/action-button";
import { getContentBundle } from "@/lib/content";

/**
 * Rendu à la demande : les tarifs sont publiés depuis le Dashboard et doivent
 * apparaître dès la requête suivante (voir `src/lib/content.ts`).
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pôle Sécurité — audit, monitoring & protection",
  description:
    "Audit & pentest, sécurisation de l'existant, monitoring 24/7, sauvegardes, sensibilisation et conformité RGPD : la cybersécurité expliquée en français clair.",
};

const STATS = [
  { value: "48 %", label: "des victimes de ransomware en France sont des PME & ETI" },
  { value: "330 k€", label: "coût moyen d'une cyberattaque réussie pour une PME" },
  { value: "72 h", label: "délai maximal de remise d'un audit complet avec plan d'action" },
];

const SERVICES = [
  {
    icon: Fingerprint,
    title: "Audit & pentest",
    body: "Nous éprouvons votre site avant les attaquants : failles connues, injections, mauvaises configurations. Vous recevez un rapport clair et priorisé.",
  },
  {
    icon: ServerCog,
    title: "Durcissement de l'existant",
    body: "Nous configurons les en-têtes HTTP, corrigeons les dépendances vulnérables et verrouillons les surfaces sensibles sans refonte forcée.",
  },
  {
    icon: Radar,
    title: "Supervision active 24/7",
    body: "Surveillance continue de disponibilité, latence, intégrité TLS et anomalies applicatives avec alertes temps réel.",
  },
  {
    icon: DatabaseBackup,
    title: "Sauvegardes chiffrées",
    body: "Sauvegardes externalisées, chiffrées et régulièrement restaurées à blanc pour garantir une reprise rapide en toute circonstance.",
  },
  {
    icon: GraduationCap,
    title: "Sensibilisation des équipes",
    body: "Ateliers concrets et bienveillants contre l'ingénierie sociale, le phishing et la compromission d'identifiants.",
  },
  {
    icon: FileCheck2,
    title: "Conformité & RGPD",
    body: "Minimisation des traceurs, mentions légales, registre des traitements et sécurité des formulaires documentés proprement.",
  },
];

const TERMINAL_LINES = [
  { status: "ok", text: "en-têtes cryptographiques", value: "CSP · HSTS · Permissions" },
  { status: "ok", text: "protocole TLS 1.3", value: "note A+ vérifiée" },
  { status: "ok", text: "sauvegardes externalisées", value: "quotidiennes · chiffrées" },
  { status: "warn", text: "dépendances npm / composer", value: "analyse pré-déploiement" },
  { status: "ok", text: "filtrage anti-bot & rate-limit", value: "actif en périphérie" },
  { status: "ok", text: "analytics sans cookie", value: "conforme RGPD" },
];

export default async function SecurityPage() {
  const { securityOffers } = await getContentBundle();

  return (
    <>
      <PageHeader
        overline="Pôle Sécurité · 4ur Security"
        title="La cybersécurité,"
        titleMuted="sans le jargon."
        intro="Nous protégeons votre site, vos données et votre réputation avec une ingénierie rigoureuse — expliquée clairement et livrée sans friction."
        watermark="CYBER"
      />

      {/* Indicateurs clés */}
      <section className="border-b border-white/[0.08]">
        <div className="mx-auto grid max-w-6xl grid-cols-1 divide-y divide-white/[0.08] px-5 sm:grid-cols-3 sm:divide-x sm:divide-y-0 sm:px-8">
          {STATS.map((s) => (
            <div
              key={s.value}
              className="flex items-baseline gap-3 py-7 sm:flex-col sm:gap-1.5 sm:px-6 sm:py-9 first:sm:pl-0"
            >
              <span className="text-platinum font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
                {s.value}
              </span>
              <span className="max-w-[30ch] text-xs leading-relaxed text-muted-foreground">
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="section-beam relative border-b border-white/[0.08] py-24 sm:py-32">
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
                Six couches de défense{" "}
                <span className="text-white/42">complémentaires.</span>
              </h2>
              <ActionButton
                href="/lab"
                variant="secondary"
                size="md"
                icon="arrow-right"
              >
                Tester dans le Lab
              </ActionButton>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {SERVICES.map((s, i) => (
              <Reveal key={s.title} delay={(i % 3) * 0.08} className="h-full">
                <SpotlightCard
                  spotlightColor="rgba(52, 211, 153, 0.09)"
                  className="h-full p-7"
                >
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.06] text-emerald-400">
                    <s.icon className="size-5" strokeWidth={1.6} aria-hidden="true" />
                  </span>
                  <h3 className="mt-5 font-display text-base font-bold tracking-tight">
                    {s.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Diagnostic + Offres */}
      <section className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <Reveal>
            <h2 className="text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              À quoi ressemble{" "}
              <span className="text-white/42">un audit actionnable ?</span>
            </h2>
            <p className="mt-5 text-[15px] leading-[1.7] text-muted-foreground">
              Chaque contrôle est expliqué, chaque vulnérabilité est classée par impact
              réel et accompagnée de son correctif précis. Pas de rapport automatisé de
              80 pages impossible à exploiter.
            </p>
            <div className="mt-7">
              <ActionButton href="/contact?subject=security" variant="primary" size="md">
                Demander un audit
              </ActionButton>
            </div>
          </Reveal>

          <Reveal delay={0.12}>
            <SpotlightCard className="p-6 sm:p-7">
              <div className="flex items-center justify-between border-b border-white/[0.08] pb-3.5">
                <div className="flex items-center gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-white/25" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                  <span className="size-2.5 rounded-full bg-white/15" />
                </div>
                <p className="font-mono text-[11px] tracking-[0.14em] text-muted-foreground">
                  4ur://audit-report
                </p>
              </div>
              <div className="mt-4 font-mono text-[12px] leading-7">
                <p className="text-muted-foreground">
                  <span className="text-emerald-400">$</span> 4ur scan --deep cible-client.fr
                </p>
                <ul className="mt-3 flex flex-col gap-1.5">
                  {TERMINAL_LINES.map((l) => (
                    <li key={l.text} className="flex items-center justify-between gap-3">
                      <span className="text-muted-foreground">
                        <span
                          className={
                            l.status === "ok" ? "text-emerald-400" : "text-amber-300"
                          }
                        >
                          [{l.status === "ok" ? "✓" : "•"}]
                        </span>{" "}
                        {l.text}
                      </span>
                      <span className="shrink-0 text-foreground">{l.value}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-4 border-t border-white/[0.08] pt-3 text-xs text-muted-foreground">
                  rapport exécutif + correctifs remis sous{" "}
                  <span className="text-foreground">72 h ouvrées</span>
                </p>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>

        <div className="mx-auto mt-24 max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Nos interventions{" "}
              <span className="text-white/42">dédiées cybersécurité.</span>
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {securityOffers.map((o, i) => (
              <Reveal key={o.name} delay={i * 0.08} className="h-full">
                <SpotlightCard
                  spotlightColor={
                    i === 2 ? "rgba(52, 211, 153, 0.14)" : "rgba(255, 255, 255, 0.08)"
                  }
                  className={
                    i === 2
                      ? "flex h-full flex-col justify-between border-emerald-400/25 p-8"
                      : "flex h-full flex-col justify-between p-8"
                  }
                >
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-emerald-400">
                      intervention
                    </p>
                    <h3 className="mt-4 font-display text-xl font-bold tracking-tight">
                      {o.name}
                    </h3>
                    <p className="text-platinum mt-2 font-display text-2xl font-extrabold tracking-tight">
                      {o.price}
                    </p>
                    <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                      {o.pitch}
                    </p>
                    <ul className="mt-6 flex flex-col gap-2.5 border-t border-white/[0.08] pt-5">
                      {o.features.map((f) => (
                        <li
                          key={f}
                          className="flex items-start gap-2.5 text-[13px] leading-snug text-foreground/90"
                        >
                          <Check className="mt-0.5 size-4 shrink-0 text-emerald-400" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="mt-8">
                    <ActionButton
                      href={`/contact?subject=security&draft=${encodeURIComponent(
                        `Bonjour, je souhaite un devis pour l'offre sécurité : ${o.name}.`
                      )}`}
                      variant={i === 2 ? "primary" : "secondary"}
                      size="md"
                      fullWidth
                    >
                      Choisir cette intervention
                    </ActionButton>
                  </div>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <CtaBanner
        title="Un doute sur votre exposition actuelle ?"
        titleMuted="Vérifions ensemble."
        body="L'échange de pré-diagnostic de 30 minutes est offert et confidentiel."
        cta="Planifier mon pré-diagnostic"
      />
    </>
  );
}
