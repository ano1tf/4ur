/**
 * Études de cas (« Réalisations »).
 *
 * ⚠️ Fichier importable côté client (aucun import serveur) : il est utilisé par
 * la galerie publique, la page d'accueil et l'éditeur du Dashboard.
 * La liste ci-dessous sert de valeur par défaut tant que rien n'a été publié
 * depuis le Dashboard (onglet « Contenu & Tarifs » → « Réalisations »).
 */

export type CaseCategory = "web" | "security" | "saas";

export interface CaseStudy {
  slug: string;
  client: string;
  sector: string;
  year: string;
  category: CaseCategory;
  categoryLabel: string;
  headline: string;
  summary: string;
  challenge: string;
  solution: string;
  accentFrom: string;
  accentTo: string;
  domain: string;
  metrics: { value: string; label: string }[];
  stack: string[];
  deliverables: string[];
}

export const DEFAULT_CASE_STUDIES: CaseStudy[] = [
  {
    slug: "kova-finance",
    client: "Kova Finance",
    sector: "Gestion privée & Fintech · Paris",
    year: "2026",
    category: "security",
    categoryLabel: "Web & Durcissement Cyber",
    headline: "Portail patrimonial haute fréquence & architecture Zero-Trust.",
    summary:
      "Refonte intégrale de l'interface institutionnelle et durcissement complet des flux d'authentification et de prise de rendez-vous chiffrée.",
    challenge:
      "Un ancien site CMS lent (4,2 s de chargement) exposant 14 plugins obsolètes et ne reflétant pas le positionnement gestion privée du cabinet.",
    solution:
      "Architecture Next.js App Router statique régénérée à la volée, CSP stricte par nonce, WAF périmétrique, journalisation immuable et design éditorial minimaliste.",
    accentFrom: "rgba(255,255,255,0.14)",
    accentTo: "rgba(52,211,153,0.10)",
    domain: "kova-finance.fr",
    metrics: [
      { value: "0.38 s", label: "Largest Contentful Paint" },
      { value: "A+", label: "Mozilla Observatory" },
      { value: "+142 %", label: "Demandes qualifiées" },
    ],
    stack: ["Next.js 16", "TypeScript", "CSP Nonce", "TLS 1.3", "Framer Motion"],
    deliverables: [
      "Direction artistique & Design System sur mesure",
      "Développement full-stack Next.js & formulaires durcis",
      "Audit d'intrusion OWASP Top 10 & remédiation complète",
      "Supervision active 24/7 & alertes temps réel",
    ],
  },
  {
    slug: "maison-valmont",
    client: "Maison Valmont",
    sector: "Haute Horlogerie & Édition · Genève / Lyon",
    year: "2026",
    category: "web",
    categoryLabel: "Expérience Web & E-commerce",
    headline: "Écrin digital sur mesure et tunnel d'acquisition instantané.",
    summary:
      "Création d'une vitrine éditoriale et e-commerce à micro-interactions GPU fluides, réservations privées en salon et protection anti-scraping.",
    challenge:
      "Présenter des pièces horlogères d'exception avec une fluidité irréprochable sur mobile tout en bloquant les bots d'aspiration de stock lors des éditions limitées.",
    solution:
      "Rendu hybride Edge, transitions chorégraphiées à 120 FPS, limitation de débit intelligente sur les API de réservation et paiement isolé.",
    accentFrom: "rgba(244,243,239,0.15)",
    accentTo: "rgba(161,161,170,0.08)",
    domain: "maison-valmont.com",
    metrics: [
      { value: "100", label: "Score Performance" },
      { value: "+184 %", label: "Taux de conversion mobile" },
      { value: "0", label: "Bot passé en vente privée" },
    ],
    stack: ["Next.js", "Edge Caching", "Stripe Radar", "Rate-Limiting", "SEO JSON-LD"],
    deliverables: [
      "Identité interactive & galerie haute définition optimisée AVIF",
      "Tunnel de réservation salon & paiement sécurisé",
      "Protection anti-bot sur les lancements d'éditions limitées",
      "Optimisation SEO international (FR / EN)",
    ],
  },
  {
    slug: "nexo-cloud",
    client: "Nexo Cloud",
    sector: "Infrastructure & IA Souveraine · Bordeaux",
    year: "2025",
    category: "saas",
    categoryLabel: "Plateforme SaaS & Pentest",
    headline: "Console produit B2B, documentation interactive et audit offensif.",
    summary:
      "Conception du site produit, du calculateur de coûts temps réel et audit de sécurité complet de l'API publique avant levée de fonds Série A.",
    challenge:
      "Convaincre des DSI exigeants dès la première seconde tout en validant la robustesse des endpoints API dans le cadre d'une due diligence investisseurs.",
    solution:
      "Design system technique ultra-lisible, simulateur de cluster temps réel, test d'intrusion boîte grise et rapport d'audit exécutif + technique.",
    accentFrom: "rgba(125,211,252,0.14)",
    accentTo: "rgba(255,255,255,0.06)",
    domain: "nexocloud.io",
    metrics: [
      { value: "0.42 s", label: "Temps d'affichage global" },
      { value: "11", label: "Failles critiques corrigées" },
      { value: "99.99 %", label: "Disponibilité mesurée" },
    ],
    stack: ["React 19", "WebGL2", "OpenAPI Hardening", "HSTS Preload", "Monitoring"],
    deliverables: [
      "Refonte site marketing & simulateur tarifaire interactif",
      "Pentest API REST & revue des permissions JWT",
      "Dossier sécurité due-diligence Série A",
      "Pipeline CI/CD d'analyse automatique des dépendances",
    ],
  },
  {
    slug: "cabinet-ardent",
    client: "Cabinet Ardent",
    sector: "Avocats d'affaires & Contentieux · Paris 8e",
    year: "2025",
    category: "security",
    categoryLabel: " Refonte & Confidentialité",
    headline: "Sobriété institutionnelle et dépôt de pièces sous scellé cryptographique.",
    summary:
      "Refonte du site du cabinet, espace de dépôt client chiffré de bout en bout et conformité RGPD sans traceur tiers.",
    challenge:
      "Remplacer des échanges d'e-mails sensibles par un point d'entrée digital digne d'un cabinet de premier plan, sans complexité pour les dirigeants clients.",
    solution:
      "Interface sobre à typographie éditoriale, télémétrie interne 100 % sans cookie, headers HTTP verrouillés et sauvegardes externalisées quotidiennes.",
    accentFrom: "rgba(255,255,255,0.12)",
    accentTo: "rgba(113,113,122,0.08)",
    domain: "ardent-avocats.fr",
    metrics: [
      { value: "0 cookie", label: "Conformité RGPD native" },
      { value: "< 2 ms", label: "Filtrage requêtes suspectes" },
      { value: "×2.6", label: "Prises de contact directes" },
    ],
    stack: ["Next.js", "Chiffrement TLS 1.3", "Analytics Privé", "Backup Chiffré"],
    deliverables: [
      "Site institutionnel multilingue FR / EN",
      "Formulaire de saisine confidentielle durci",
      " Suppression complète des scripts tiers intrusifs",
      "Maintien en condition de sécurité mensuel",
    ],
  },
  {
    slug: "atelier-nord",
    client: "Atelier Nord",
    sector: "Architecture & Design Intérieur · Lille",
    year: "2025",
    category: "web",
    categoryLabel: "Portfolio Architectural",
    headline: "Monographie visuelle ultra-fluide pour un studio d'architecture.",
    summary:
      "Mise en scène plein écran de 40 projets architecturaux avec navigation instantanée sans rechargement et référencement local dominant.",
    challenge:
      "Afficher des centaines de photographies grand format sans jamais pénaliser la fluidité mobile ni le score Core Web Vitals.",
    solution:
      "Pipeline d'images progressives basse latence, transitions fluides et maillage sémantique propulsant le studio en top 3 Google régional.",
    accentFrom: "rgba(228,228,231,0.14)",
    accentTo: "rgba(63,63,70,0.08)",
    domain: "atelier-nord.arch",
    metrics: [
      { value: "99 / 100", label: "Lighthouse Mobile" },
      { value: "#1", label: "Position Google locale" },
      { value: "0.35 s", label: "Navigation inter-pages" },
    ],
    stack: ["Next.js Image", "Tailwind v4", "Framer Motion", "Schema.org"],
    deliverables: [
      "Direction artistique minimaliste & grille modulaire",
      "Catalogue filtrable haute performance",
      "Stratégie SEO locale & balisage structuré",
    ],
  },
  {
    slug: "medisafe-pulse",
    client: "Medisafe Pulse",
    sector: "MedTech & Dispositifs Connectés · Nantes",
    year: "2026",
    category: "saas",
    categoryLabel: "Santé & Cybersécurité",
    headline: "Portail praticiens et durcissement périmétrique haute disponibilité.",
    summary:
      "Conception de la vitrine clinique, documentation réglementaire claire et supervision active 24/7 avec alertes temps réel.",
    challenge:
      "Allier pédagogie médicale limpide et exigences strictes de disponibilité et d'intégrité documentaire.",
    solution:
      "Architecture isolée sans base exposée publiquement, monitoring continu toutes les 5 minutes et contrôle d'intégrité automatisé.",
    accentFrom: "rgba(52,211,153,0.14)",
    accentTo: "rgba(255,255,255,0.06)",
    domain: "medisafe-pulse.fr",
    metrics: [
      { value: "100 %", label: "Uptime sur 12 mois" },
      { value: "A+", label: "Score SSL Labs" },
      { value: "3 sem.", label: "Cadrage à mise en ligne" },
    ],
    stack: ["Next.js Standalone", "SQLite / Edge", "CSP Strict", "Webhook Alerting"],
    deliverables: [
      "Plateforme web praticiens & espace ressources",
      "Durcissement serveur & politique de sécurité",
      "Monitoring continu 5 min & astreinte",
    ],
  },
];

/* ------------------------------------------------------------------ */
/*  Métadonnées partagées (public + Dashboard)                        */
/* ------------------------------------------------------------------ */

export const CASE_CATEGORIES: {
  id: CaseCategory;
  label: string;
  defaultCategoryLabel: string;
}[] = [
  { id: "web", label: "Ingénierie Web", defaultCategoryLabel: "Expérience Web & E-commerce" },
  { id: "security", label: "Cybersécurité", defaultCategoryLabel: "Web & Durcissement Cyber" },
  { id: "saas", label: "SaaS & Plateformes", defaultCategoryLabel: "Plateforme SaaS & Pentest" },
];

/** Dégradés prédéfinis pour la « fenêtre » d'aperçu de chaque carte. */
export const CASE_ACCENT_PRESETS: {
  id: string;
  label: string;
  from: string;
  to: string;
}[] = [
  { id: "platinum", label: "Platine", from: "rgba(255,255,255,0.14)", to: "rgba(113,113,122,0.08)" },
  { id: "zinc", label: "Zinc", from: "rgba(228,228,231,0.14)", to: "rgba(63,63,70,0.08)" },
  { id: "emerald", label: "Émeraude", from: "rgba(52,211,153,0.14)", to: "rgba(255,255,255,0.06)" },
  { id: "sky", label: "Ciel", from: "rgba(125,211,252,0.14)", to: "rgba(255,255,255,0.06)" },
  { id: "gold", label: "Or", from: "rgba(250,204,21,0.12)", to: "rgba(255,255,255,0.05)" },
];

/** Transforme un libellé libre en slug URL sûr (`kova-finance`). */
export function slugifyCaseStudy(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Garantit l'unicité d'un slug au sein d'une liste (suffixe -2, -3…). */
export function uniqueCaseSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "realisation";
  if (!used.has(root)) return root;
  let i = 2;
  while (used.has(`${root}-${i}`)) i += 1;
  return `${root}-${i}`;
}

/** Nouvelle réalisation vierge, prête à être complétée dans le Dashboard. */
export function createBlankCaseStudy(existing: CaseStudy[] = []): CaseStudy {
  const preset = CASE_ACCENT_PRESETS[0];
  return {
    slug: uniqueCaseSlug(
      "nouvelle-realisation",
      existing.map((c) => c.slug)
    ),
    client: "Nouveau client",
    sector: "Secteur · Ville",
    year: String(new Date().getFullYear()),
    category: "web",
    categoryLabel: CASE_CATEGORIES[0].defaultCategoryLabel,
    headline: "Titre de la réalisation.",
    summary: "",
    challenge: "",
    solution: "",
    accentFrom: preset.from,
    accentTo: preset.to,
    domain: "",
    metrics: [],
    stack: [],
    deliverables: [],
  };
}
