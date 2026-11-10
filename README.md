# 4ur — site vitrine (web & cybersécurité)

Site vitrine de **4ur** : deux pôles (création de sites web, cybersécurité), six pages,
un formulaire de contact persisté et un panneau d'administration caché pour éditer
les prix et les offres sans redéployer.

## Stack

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, `output: standalone`) |
| Langage | TypeScript (strict) |
| Styles | Tailwind CSS 4 + design tokens dans `src/app/globals.css` |
| UI | shadcn/ui (uniquement les composants réellement utilisés) |
| Données | Prisma + SQLite |
| Validation | Zod |
| Runtime | Node.js (Bun en production) |

## Démarrage rapide

```bash
bun install                 # ou npm install
cp .env.example .env.local  # puis compléter les valeurs
bun run db:push             # crée la base SQLite et les tables
bun run db:generate         # génère le client Prisma (obligatoire)
bun run dev                 # http://localhost:3000
```

En production :

```bash
bun run build               # next build + copie des fichiers standalone
NODE_ENV=production bun .next/standalone/server.js
```

## Variables d'environnement

Toutes sont documentées dans `.env.example`. Les importantes :

- `DATABASE_URL` — base SQLite (`file:./db/custom.db`).
- `DEV_PANEL_PIN` / `DEV_PANEL_SECRET` — **obligatoires** pour le panneau dev.
  Sans elles, le panneau refuse de s'ouvrir (au lieu d'accepter un code par défaut).
- `TRUST_PROXY=1` — à activer **uniquement** derrière un reverse-proxy de confiance
  (Caddy) : l'IP client est alors lue dans `X-Forwarded-For`. Sinon l'IP est traitée
  comme inconnue et les quotas sont partagés (volontairement plus stricts).
- `RESEND_API_KEY` + `CONTACT_NOTIFY_EMAIL` (ou `CONTACT_WEBHOOK_URL`) — notification
  à chaque nouvelle demande de contact. Sans configuration, la demande est stockée
  mais personne n'est prévenu (un avertissement est journalisé).
- `NEXT_PUBLIC_*` — URL du site et informations légales.

## Déploiement Render (sans disque persistant)

Le fichier `render.yaml` (Blueprint) configure tout : runtime Node, région
Frankfurt, build, start et la liste des variables d'environnement. Les valeurs
secrètes sont marquées `sync: false` : Render vous les demande au moment du
déploiement.

```bash
# Build (bun, le runtime par défaut de Render)
bun install && bun run db:generate && bun run build

# Start
mkdir -p /tmp/4ur-db && export DATABASE_URL="${DATABASE_URL:-file:/tmp/4ur-db/custom.db}" && bun run db:push && bunx next start -H 0.0.0.0 -p $PORT
```

En Node/npm :

```bash
npm install && npx prisma generate && npm run build
mkdir -p /tmp/4ur-db && export DATABASE_URL="${DATABASE_URL:-file:/tmp/4ur-db/custom.db}" && npx prisma db push --accept-data-loss && npx next start -H 0.0.0.0 -p $PORT
```

Deux garde-fous sont intégrés :

- `postinstall: prisma generate` dans `package.json` : le client Prisma est
  régénéré après **n'importe quel** `bun install` / `npm install`, même si la
  commande de build ne l'invoque pas explicitement.
- `DATABASE_URL="${DATABASE_URL:-…}"` dans la commande de démarrage : si la
  variable n'a pas été saisie dans le tableau de bord, on retombe sur
  `/tmp/4ur-db/custom.db` au lieu de planter au démarrage.

### Dépannage déploiement

| Erreur | Cause | Correctif |
|---|---|---|
| `Module '"@prisma/client"' has no exported member 'PrismaClient'` | le client Prisma n'a pas été généré avant `next build` | `bun run db:generate` dans le build (ou laisser jouer le `postinstall`) |
| `Environment variable not found: DATABASE_URL` (P1012) | variable absente au démarrage | ajouter `DATABASE_URL` dans l'onglet Environment, ou laisser le repli de la commande de démarrage |
| `No open ports detected` | le serveur n'écoute pas sur l'IP publique | `-H 0.0.0.0 -p $PORT` (déjà dans les commandes ci-dessus) |
| `Query engine library … could not be found` | moteur Prisma absent du bundle standalone | utiliser `next start` et non `bun run start` / `server.js` |

### Ce qui est perdu, ce qui ne l'est pas

Sans disque persistant, `/tmp` est vidé à chaque redémarrage ou redéploiement
(et les instances gratuites s'endorment après 15 min d'inactivité). La base
SQLite est donc recréée au démarrage :

| Donnée | Durable ? | Comment la rendre durable |
|---|---|---|
| **Prix / offres / réalisations** (table `SiteContent`) | ❌ repart des valeurs par défaut | Modifiez `src/lib/content-defaults.ts` / `src/lib/case-studies.ts` (versionnés, c'est la source de vérité) **ou** utilisez *Exporter* / *Importer* dans le panneau dev après un redémarrage |
| **Demandes de contact** (table `ContactRequest`) | ❌ effacées | Configurez `CONTACT_WEBHOOK_URL` (Slack/Discord/Make) ou `RESEND_API_KEY` + `CONTACT_NOTIFY_EMAIL` : la notification part à l'envoi, avant même l'écriture en base |
| Pages, textes, design | ✅ dans Git | — |
| Contenu édité depuis le panneau dev | ⚠️ jusqu'au prochain redémarrage | Bouton *Exporter* → fichier JSON → *Importer* après redémarrage |

Le site ne tombe jamais : si la base est vide ou absente, les pages s'affichent
avec les valeurs par défaut (`getContentBundle` retombe dessus silencieusement).

### Rendre les prix durables (sans base)

1. Ouvrez le panneau dev, faites vos modifications, *Enregistrer*.
2. *Exporter* → vous obtenez `4ur-contenu-AAAA-MM-JJ.json`.
3. Après un redémarrage : *Importer* → sélectionnez ce fichier → *Enregistrer*.

Pour un changement définitif (celui qui survivra à tout), éditez directement
`src/lib/content-defaults.ts` et redéployez : c'est le code qui fait foi.

### Si vous voulez une vraie persistance sans disque Render

Un Postgres externe gratuit (Neon ou Supabase) règle le problème :

1. Créez la base, copiez la chaîne de connexion.
2. Dans `prisma/schema.prisma` : `provider = "postgresql"`.
3. `DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"`.
4. Build : `npm install && npx prisma generate && npm run build`
   Start : `npx prisma db push && npx next start -p $PORT`

Le reste du code est inchangé (le schéma n'utilise rien de spécifique à SQLite).

### Variables d'environnement — rappel

Toutes sont listées et commentées dans `.env.example`. Les pièges :

- `TRUST_PROXY=1` **uniquement** derrière un proxy de confiance (c'est le cas
  sur Render) : sinon les quotas anti-spam sont partagés entre tous les visiteurs.
- Les `NEXT_PUBLIC_*` sont **figés au build** : après les avoir ajoutées, faites
  « Clear build cache & deploy ».
- `NODE_ENV` et `PORT` sont fournis par Render : ne les surchargez pas.

## Structure

```
src/
  app/
    page.tsx              Accueil
    web/ security/        Pôles détaillés
    tarifs/               Grille tarifaire + comparatif
    realisations/         Galerie des études de cas (éditable depuis le Dashboard)
    methode/              Méthode en 4 étapes
    contact/              Formulaire
    mentions-legales/     Mentions légales
    confidentialite/      Politique de confidentialité (RGPD)
    sitemap.ts            Sitemap généré
    api/
      contact/            POST — demande de contact (Zod, anti-spam, notification)
      dev/auth/           POST/GET/DELETE — session du panneau dev
      dev/content/        GET/PUT — contenu éditable
      dev/requests/       GET/DELETE — demandes de contact reçues
  components/site/        Composants métier (navbar, hero 3D, panneau dev…)
  components/ui/          shadcn/ui (8 composants conservés)
  lib/
    content-defaults.ts   Types + valeurs par défaut (importable côté client)
    case-studies.ts       Réalisations par défaut + helpers (slug, catégories, dégradés)
    content-schema.ts     Schémas Zod du contenu
    content.ts            Lecture/écriture du contenu + mémo processus (serveur uniquement)
    db.ts                 Client Prisma paresseux (serveur uniquement)
    dev-auth.ts           PIN, session signée HMAC
    rate-limit.ts         Limitation de débit (IP + plafond global)
    notify.ts             Notification e-mail / webhook des demandes
    legal.ts              Informations légales à compléter
```

## Panneau dev caché

- Ouverture : **5 clics rapides** sur le `©` du pied de page, ou taper **`4ur`** au
  clavier hors champ de saisie.
- Accès : code `DEV_PANEL_PIN`, puis session signée 12 h (cookie `httpOnly`,
  `SameSite=Strict`).
- Onglet **Contenu & Tarifs** : Formules Web, Offres Sécurité, Options Web, Services
  récurrents et **Réalisations** (ajout, modification, duplication, réordonnancement et
  suppression des études de cas — les 3 premières sont reprises sur l'accueil).
  Onglet **Demandes** : les messages reçus, avec suppression.
- « Enregistrer » publie immédiatement : les pages `/`, `/web`, `/security`, `/tarifs`
  et `/realisations` sont rendues à la demande (`force-dynamic`, `Cache-Control: no-store`)
  et lisent un mémo processus invalidé de façon synchrone à chaque sauvegarde — aucune
  dépendance à l'invalidation du cache ISR de Next.js (qui s'était révélée inopérante
  sur certains runtimes). « Défauts » restaure la grille d'origine ; l'icône ⏻ ferme la
  session.
- Export / Import JSON : l'export contient désormais les réalisations ; un ancien export
  (sans `caseStudies`) reste importable, la liste actuelle est alors conservée.

## Sécurité

En place :

- validation Zod de toutes les entrées (formulaire **et** contenu du panneau dev),
  y compris à la lecture depuis la base (une ligne corrompue ne casse pas les pages) ;
- PIN comparé en temps constant, cookie de session signé HMAC-SHA256, 12 h, `httpOnly` ;
- limitation de débit à deux niveaux (par IP si proxy de confiance, **et** plafond
  global) sur le formulaire, le PIN et l'écriture de contenu, avec délai progressif
  sur le PIN — le contournement par rotation de `X-Forwarded-For` ne fonctionne plus ;
- anti-spam du formulaire : pot de miel + quota + validation stricte ;
- en-têtes de sécurité (CSP, HSTS, `X-Content-Type-Options`, `Referrer-Policy`,
  `X-Frame-Options`, `Permissions-Policy`) dans `next.config.ts` et le `Caddyfile` ;
- le client Prisma n'est plus embarqué dans le bundle navigateur (`server-only` +
  valeurs par défaut isolées dans `content-defaults.ts`) ;
- `reactStrictMode` activé et erreurs TypeScript bloquantes au build.

À faire (par ordre d'utilité) :

1. CSP stricte avec **nonce** généré en middleware (aujourd'hui `unsafe-inline` est
   nécessaire pour les scripts/styles injectés par Next).
2. Passer de `prisma db push` à de vraies migrations (`prisma migrate dev`) dès qu'il
   y a des données de production.
3. Sauvegarde régulière de `db/custom.db` (les demandes de contact y sont stockées).
4. Journaliser les accès au panneau dev (qui, quand, quoi).

## Dette connue

- Les captures et assets de travail (`agent-ctx/`, `upload/`, `bp4ur_assets/`,
  `tool-results/`) ne sont plus suivis par Git : ils restent sur le disque.
- Le tableau comparatif de `/tarifs` (13 lignes) reste codé en dur : il ne suit pas
  automatiquement un renommage de formule dans le panneau dev.
- Les polices viennent de Google Fonts au build (`next/font/google`) : pour un build
  hors ligne, basculer sur `next/font/local`.
- `db/custom.db` a été retiré du suivi Git ; l'historique contient encore l'ancienne
  version (avec des données de test) — un `git filter-repo` est possible si besoin.

## Licence

Usage privé — © 4ur. Tous droits réservés.
