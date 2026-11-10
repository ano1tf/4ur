import type { Metadata } from "next";
import {
  Gauge,
  Layout,
  PenTool,
  Search,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { PricingCards } from "@/components/site/pricing-cards";
import { CtaBanner } from "@/components/site/cta-banner";
import { Faq } from "@/components/site/faq";
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
  title: "Pôle Web — création de sites sur mesure",
  description:
    "Sites vitrines, blogs, e-commerce et plateformes : design sur mesure, performance au vert, SEO propre et sécurité by design. Formules Essentiel, Pro et Entreprise.",
};

const CAPABILITIES = [
  {
    icon: PenTool,
    title: "Design sur mesure",
    body: "Chaque écran est dessiné pour votre marque, vos contenus et vos objectifs. Aucun template acheté, aucune esthétique copiée-collée.",
  },
  {
    icon: Gauge,
    title: "Performance au vert",
    body: "Images optimisées, code allégé, rendu hybride : vos pages s'affichent instantanément, même sur mobile en mobilité.",
  },
  {
    icon: Search,
    title: "SEO technique",
    body: "Structure sémantique, métadonnées, vitesse, données structurées : tout ce que les moteurs exigent est câblé dès la construction.",
  },
  {
    icon: Smartphone,
    title: "Mobile d'abord",
    body: "Plus de 65 % de vos visiteurs naviguent sur téléphone. Nous concevons pour le mobile, puis enrichissons pour le grand écran.",
  },
  {
    icon: Layout,
    title: "Blog & actualités",
    body: "Publiez vos articles et vos actualités sans toucher au code. Interface d'administration simple, formation incluse.",
  },
  {
    icon: ShoppingCart,
    title: "E-commerce",
    body: "Catalogue, paiement sécurisé, livraison, facturation : nous construisons votre boutique avec vos connecteurs métier.",
  },
];

const WEB_FAQ = [
  {
    question: "Combien de temps prend la création d'un site ?",
    answer:
      "Comptez 2 à 3 semaines pour une formule Essentiel, 4 à 6 semaines pour une formule Pro. Un e-commerce ou un portail métier demande généralement 6 à 10 semaines. Les délais exacts sont fixés dans le devis et contractualisés.",
  },
  {
    question: "Puis-je modifier mon site moi-même après la livraison ?",
    answer:
      "Oui. Vous recevez une interface d'administration simple pour vos contenus (articles, produits, photos) et une formation d'une heure incluse. Les évolutions structurelles restent possibles à tout moment.",
  },
  {
    question: "Le site m'appartient-il vraiment ?",
    answer:
      "Totalement. À la livraison, le code, les contenus et les accès (hébergement, domaine, outils) vous appartiennent. Aucune dépendance piège, aucune redevance cachée.",
  },
  {
    question: "Que se passe-t-il si mon site rencontre un incident ?",
    answer:
      "Avec l'option Veille & maintenance, vous êtes prévenu avant vos clients : monitoring 24/7, sauvegardes quotidiennes chiffrées et restauration testée régulièrement.",
  },
];

export default async function WebPage() {
  const { plans, webOptions } = await getContentBundle();

  return (
    <>
      <PageHeader
        overline="Pôle Web · 4ur Web"
        title="Des sites qui convertissent."
        titleMuted="Sculptés pour durer."
        intro="Vitrine, blog, e-commerce ou plateforme : chaque site est dessiné pour vos objectifs et blindé dès la conception. Une grille transparente et la cybersécurité toujours incluse."
        watermark="WEB"
      />

      {/* Capacités */}
      <section className="section-beam relative border-b border-white/[0.08] py-24 sm:py-32">
        <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
              <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
                Ce que nous mettons{" "}
                <span className="text-white/42">dans chaque réalisation.</span>
              </h2>
              <ActionButton
                href="/realisations"
                variant="secondary"
                size="md"
                icon="arrow-right"
              >
                Voir nos études de cas
              </ActionButton>
            </div>
          </Reveal>
          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((c, i) => (
              <Reveal key={c.title} delay={(i % 3) * 0.08} className="h-full">
                <SpotlightCard className="h-full p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-2xl border border-white/[0.10] bg-white/[0.04]">
                    <c.icon
                      className="size-5 text-foreground"
                      strokeWidth={1.6}
                      aria-hidden="true"
                    />
                  </span>
                  <h3 className="mt-5 font-display text-base font-bold tracking-tight">
                    {c.title}
                  </h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
                    {c.body}
                  </p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Formules */}
      <section id="formules" className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Trois formules claires,{" "}
              <span className="text-white/42">un même standard de sécurité.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Prix fixes, périmètre écrit noir sur blanc, délais contractuels.
            </p>
          </Reveal>
          <div className="mt-14">
            <PricingCards plans={plans} />
          </div>
        </div>
      </section>

      {/* Options & maintenance */}
      <section className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Après la livraison,{" "}
              <span className="text-white/42">nous continuons de veiller.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Des accompagnements souples, sans engagement longue durée, pour maintenir vos
              performances et vos défenses au plus haut niveau.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {webOptions.map((o, i) => (
              <Reveal key={o.name} delay={i * 0.08} className="h-full">
                <SpotlightCard className="h-full p-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-emerald-400">
                    accompagnement
                  </p>
                  <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
                    {o.name}
                  </h3>
                  <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">
                    {o.price}
                  </p>
                  <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
                    {o.body}
                  </p>
                </SpotlightCard>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <Reveal>
            <h2 className="text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Les questions{" "}
              <span className="text-white/42">les plus fréquentes.</span>
            </h2>
          </Reveal>
          <div className="mt-10">
            <Faq items={WEB_FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner
        title="Un projet de site ?"
        titleMuted="Parlons-en."
        body="Décrivez votre besoin en quelques lignes : nous vous répondons sous 24 h ouvrées avec un premier avis honnête et un chiffrage précis."
        cta="Demander un devis"
      />
    </>
  );
}
