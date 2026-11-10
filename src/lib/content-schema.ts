import { z } from "zod";

/**
 * Schémas du contenu éditable — partagés entre :
 * - `PUT /api/dev/content` (validation à l'écriture)
 * - `getContentBundle()`   (validation à la lecture : une ligne corrompue en base
 *                           ne doit jamais faire tomber les pages publiques)
 *
 * Serveur uniquement : ce module n'est jamais importé par un composant client.
 */

export const serviceCardSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.string().trim().min(1).max(40),
  body: z.string().trim().max(500),
});

export const planSchema = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.string().trim().min(1).max(40),
  detail: z.string().trim().min(1).max(120),
  pitch: z.string().trim().min(1).max(160),
  features: z.array(z.string().trim().min(1).max(140)).min(1).max(12),
  cta: z.string().trim().min(1).max(60),
  popular: z.boolean(),
});

export const securityOfferSchema = z.object({
  name: z.string().trim().min(1).max(60),
  price: z.string().trim().min(1).max(40),
  pitch: z.string().trim().min(1).max(160),
  features: z.array(z.string().trim().min(1).max(140)).min(1).max(12),
});

/* ------------------------------ Réalisations ------------------------------ */

/** Couleur CSS sûre pour un dégradé inline : rgba()/rgb()/hex/nom. */
const cssColorSchema = z
  .string()
  .trim()
  .min(1)
  .max(60)
  .regex(
    /^(?:rgba?\([\d\s.,%]+\)|hsla?\([\d\s.,%deg]+\)|#[0-9a-fA-F]{3,8}|[a-zA-Z]{3,30})$/,
    "Couleur invalide (rgba(), #hex ou nom CSS)."
  );

export const caseStudySchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1)
    .max(60)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug : minuscules, chiffres et tirets."),
  client: z.string().trim().min(1).max(80),
  sector: z.string().trim().max(120),
  year: z.string().trim().min(1).max(12),
  category: z.enum(["web", "security", "saas"]),
  categoryLabel: z.string().trim().min(1).max(60),
  headline: z.string().trim().min(1).max(160),
  summary: z.string().trim().max(400),
  challenge: z.string().trim().max(700),
  solution: z.string().trim().max(700),
  accentFrom: cssColorSchema,
  accentTo: cssColorSchema,
  domain: z.string().trim().max(80),
  metrics: z
    .array(
      z.object({
        value: z.string().trim().min(1).max(24),
        label: z.string().trim().min(1).max(60),
      })
    )
    .max(4),
  stack: z.array(z.string().trim().min(1).max(40)).max(12),
  deliverables: z.array(z.string().trim().min(1).max(160)).max(10),
});

export const MAX_CASE_STUDIES = 30;

export const caseStudiesSchema = z
  .array(caseStudySchema)
  .max(MAX_CASE_STUDIES)
  .superRefine((items, ctx) => {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.slug)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "slug"],
          message: `Slug « ${item.slug} » en doublon.`,
        });
      }
      seen.add(item.slug);
    });
  });

/** Le bundle complet : 3 items attendus par section tarifaire, 0 à 30 réalisations. */
export const bundleSchema = z.object({
  plans: z.array(planSchema).length(3),
  securityOffers: z.array(securityOfferSchema).length(3),
  webOptions: z.array(serviceCardSchema).length(3),
  recurring: z.array(serviceCardSchema).length(3),
  caseStudies: caseStudiesSchema,
});

export const BUNDLE_HINT =
  "Contenu invalide : 3 items par section tarifaire, champs obligatoires remplis (40 caractères max sur les prix), slugs de réalisations uniques.";

const SECTION_LABELS: Record<string, string> = {
  plans: "Formules Web",
  securityOffers: "Offres Sécurité",
  webOptions: "Options Web",
  recurring: "Services récurrents",
  caseStudies: "Réalisations",
};

/** Message d'erreur lisible pour l'éditeur : section, index et champ fautifs. */
export function describeBundleIssue(error: z.ZodError): string {
  const issue = error.issues[0];
  if (!issue) return BUNDLE_HINT;
  const [section, index, ...rest] = issue.path.map(String);
  const label = SECTION_LABELS[section] ?? section;
  const where =
    index !== undefined && /^\d+$/.test(index)
      ? `${label} #${Number(index) + 1}${rest.length ? ` → ${rest.join(".")}` : ""}`
      : [label, index, ...rest].filter(Boolean).join(" → ");
  return `${where} : ${issue.message}`;
}
