import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { PageHeader } from "@/components/site/page-header";
import { PricingCards } from "@/components/site/pricing-cards";
import { CtaBanner } from "@/components/site/cta-banner";
import { Faq } from "@/components/site/faq";
import { Reveal } from "@/components/site/reveal";
import { SpotlightCard } from "@/components/site/spotlight-card";
import { ActionButton } from "@/components/site/action-button";
import { getContentBundle } from "@/lib/content";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

/**
 * Rendu à la demande : les tarifs sont publiés depuis le Dashboard et doivent
 * apparaître dès la requête suivante (voir `src/lib/content.ts`).
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { plans } = await getContentBundle();
  const recap = plans.map((p) => `${p.name} ${p.price}`).join(", ");
  return {
    title: "Tarifs — formules claires, zéro surprise",
    description: `Grille tarifaire transparente : ${recap}. Comparatif détaillé, options de maintenance et questions fréquentes.`,
  };
}

type Cell = string | boolean;

const COMPARISON: { label: string; essential: Cell; pro: Cell; entreprise: Cell }[] = [
  { label: "Pages incluses", essential: "3 à 5 pages", pro: "Jusqu'à 10 pages", entreprise: "Illimité" },
  { label: "Design sur mesure", essential: true, pro: true, entreprise: true },
  { label: "Responsive mobile / tablette", essential: true, pro: true, entreprise: true },
  { label: "Blog / actualités", essential: false, pro: true, entreprise: true },
  { label: "E-commerce / portail client", essential: false, pro: false, entreprise: true },
  { label: "Intégrations métier (CRM, API)", essential: false, pro: false, entreprise: true },
  { label: "SEO technique de base", essential: true, pro: true, entreprise: true },
  { label: "SEO renforcé + Analytics", essential: false, pro: true, entreprise: true },
  { label: "SSL A+ & headers de sécurité", essential: true, pro: true, entreprise: true },
  { label: "Scan de vulnérabilités", essential: false, pro: true, entreprise: true },
  { label: "Audit complet + pentest léger", essential: false, pro: false, entreprise: true },
  { label: "Maintenance incluse", essential: "—", pro: "1 mois offert", entreprise: "Annuelle (SLA)" },
  { label: "Délai de livraison", essential: "2 – 3 semaines", pro: "4 – 6 semaines", entreprise: "Sur planning dédié" },
];

const TARIFS_FAQ = [
  {
    question: "Comment se passe le règlement ?",
    answer:
      "Pour les formules à prix fixe : 40 % au lancement, 60 % à la mise en ligne. Pour les projets Entreprise, un échéancier par jalons validés ensemble est établi au devis.",
  },
  {
    question: "Y a-t-il des frais cachés ou des abonnements imposés ?",
    answer:
      "Aucun. Le devis détaille l'intégralité du périmètre, des délais et des livrables. Vos noms de domaine et hébergements restent enregistrés directement à votre nom.",
  },
  {
    question: "Puis-je simuler des options sur mesure avant d'écrire ?",
    answer:
      "Oui : notre configurateur interactif vous permet d'ajuster la typologie et les briques optionnelles (SEO, multilingue, WebGL, pentest) en quelques clics.",
  },
  {
    question: "Pourquoi la formule Entreprise est-elle chiffrée sur mesure ?",
    answer:
      "Parce qu'un e-commerce ou un portail métier varie fortement selon vos connecteurs, vos volumes et vos contraintes de disponibilité. Un échange de 30 minutes garantit un chiffrage juste.",
  },
];

function CellValue({ value }: { value: Cell }) {
  if (value === true)
    return (
      <Check
        className="mx-auto size-4 text-emerald-400"
        strokeWidth={2.5}
        aria-label="Inclus"
      />
    );
  if (value === false)
    return (
      <Minus
        className="mx-auto size-4 text-muted-foreground/40"
        aria-label="Non inclus"
      />
    );
  return <span className="text-[13px] text-foreground/90">{value}</span>;
}

export default async function TarifsPage() {
  const { plans, recurring } = await getContentBundle();
  const planNames = plans.map((p) => p.name);

  return (
    <>
      <PageHeader
        overline="Tarifs · Grille transparente"
        title="Des prix clairs."
        titleMuted="Zéro surprise."
        intro="Le prix est fixe, le périmètre est écrit noir sur blanc et les délais sont contractuels. La sécurité native est incluse dans chaque formule."
        watermark="TARIFS"
      />

      {/* Formules */}
      <section className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Besoin d&apos;affiner avec des options précises (SEO, multilingue, pentest) ?
            </p>
            <ActionButton
              href="/simulateur"
              variant="secondary"
              size="sm"
              icon="arrow-right"
            >
              Ouvrir le simulateur interactif
            </ActionButton>
          </div>
          <PricingCards plans={plans} />
        </div>
      </section>

      {/* Comparatif détaillé */}
      <section className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Comparatif{" "}
              <span className="text-white/42">ligne par ligne.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.08}>
            <SpotlightCard className="mt-10 p-2 sm:p-4">
              <div className="overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow className="border-white/[0.08] hover:bg-transparent">
                      <TableHead className="w-[40%] py-4 text-muted-foreground">
                        Caractéristique
                      </TableHead>
                      {planNames.map((n) => (
                        <TableHead
                          key={n}
                          className="py-4 text-center font-display font-bold text-foreground"
                        >
                          {n}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {COMPARISON.map((row) => (
                      <TableRow
                        key={row.label}
                        className="border-white/[0.06] hover:bg-white/[0.025]"
                      >
                        <TableCell className="py-3.5 text-[13px] text-muted-foreground">
                          {row.label}
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <CellValue value={row.essential} />
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <CellValue value={row.pro} />
                        </TableCell>
                        <TableCell className="py-3.5 text-center">
                          <CellValue value={row.entreprise} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </SpotlightCard>
          </Reveal>
        </div>
      </section>

      {/* Services récurrents */}
      <section className="section-beam border-b border-white/[0.08] py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <Reveal>
            <h2 className="max-w-2xl text-balance font-display text-2xl font-extrabold leading-tight tracking-[-0.03em] sm:text-4xl">
              Continuité &amp;{" "}
              <span className="text-white/42">supervision mensuelle.</span>
            </h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
              Sans engagement de durée : résiliable à tout moment avec restitution
              complète.
            </p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {recurring.map((r, i) => (
              <Reveal key={r.name} delay={i * 0.08} className="h-full">
                <SpotlightCard className="h-full p-7">
                  <p className="font-mono text-[10px] uppercase tracking-[0.26em] text-emerald-400">
                    mensuel
                  </p>
                  <h3 className="mt-4 font-display text-lg font-bold tracking-tight">
                    {r.name}
                  </h3>
                  <p className="mt-1.5 font-display text-2xl font-extrabold tracking-tight">
                    {r.price}
                  </p>
                  <p className="mt-3.5 text-sm leading-relaxed text-muted-foreground">
                    {r.body}
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
              Questions sur{" "}
              <span className="text-white/42">nos modalités.</span>
            </h2>
          </Reveal>
          <div className="mt-10">
            <Faq items={TARIFS_FAQ} />
          </div>
        </div>
      </section>

      <CtaBanner
        title="Hésitation entre deux formules ?"
        titleMuted="Demandons à un ingénieur."
        body="Expliquez-nous votre contexte : nous vous orientons honnêtement vers l'option la plus pertinente."
        cta="Recevoir mon devis"
      />
    </>
  );
}
