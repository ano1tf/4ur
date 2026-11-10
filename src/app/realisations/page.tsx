import type { Metadata } from "next";
import { PageHeader } from "@/components/site/page-header";
import { PortfolioShowcase } from "@/components/site/portfolio-showcase";
import { CtaBanner } from "@/components/site/cta-banner";
import { getContentBundle } from "@/lib/content";

export const metadata: Metadata = {
  title: "Réalisations — études de cas web & cybersécurité",
  description:
    "Découvrez nos architectures sur mesure en production : sites haute conversion, portails financiers durcis, e-commerce protégé et audits d'intrusion.",
};

/**
 * Rendu à la demande : les réalisations sont gérées depuis le Dashboard et
 * doivent apparaître dès la requête suivante (voir `src/lib/content.ts`).
 */
export const dynamic = "force-dynamic";

export default async function RealisationsPage() {
  const { caseStudies } = await getContentBundle();

  return (
    <>
      <PageHeader
        overline="Réalisations · Études de cas"
        title="Des architectures livrées."
        titleMuted="Mesurées en conditions réelles."
        intro="Chaque projet réunit direction artistique sur mesure, performances sous la demi-seconde et durcissement applicatif complet. Filtrez nos interventions récentes par discipline."
        watermark="OEUVRES"
      />

      <PortfolioShowcase items={caseStudies} />

      <CtaBanner
        title="Votre prochain site mérite"
        titleMuted="ce niveau d'exigence."
        body="Décrivez vos objectifs en quelques lignes ou estimez votre budget dans notre configurateur interactif."
        cta="Lancer mon projet"
      />
    </>
  );
}
