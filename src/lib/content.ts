import "server-only";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  caseStudiesSchema,
  planSchema,
  securityOfferSchema,
  serviceCardSchema,
} from "@/lib/content-schema";
import {
  DEFAULT_BUNDLE,
  DEFAULT_CASE_STUDIES,
  DEFAULT_PLANS,
  DEFAULT_RECURRING,
  DEFAULT_SECURITY_OFFERS,
  DEFAULT_WEB_OPTIONS,
} from "@/lib/content-defaults";
import type {
  CaseStudy,
  ContentBundle,
  Plan,
  SecurityOffer,
  ServiceCard,
} from "@/lib/content-defaults";

/**
 * Contenu éditable du site via le Dashboard.
 *
 * Stratégie de cache volontairement simple et indépendante du runtime
 * (Node ou Bun, `next dev` ou build standalone) :
 * - les pages publiques qui consomment ce contenu sont rendues à la demande
 *   (`export const dynamic = "force-dynamic"`) ;
 * - la lecture SQLite (< 1 ms) est mémorisée au niveau du processus et le mémo
 *   est invalidé **de façon synchrone** à chaque sauvegarde — la publication
 *   depuis le Dashboard est donc visible dès la requête suivante, sans dépendre
 *   de l'invalidation du cache ISR de Next.js (`revalidateTag` / `revalidatePath`),
 *   qui s'est révélée peu fiable selon l'hébergeur.
 */

export type { CaseStudy, ContentBundle, Plan, SecurityOffer, ServiceCard };
export {
  DEFAULT_BUNDLE,
  DEFAULT_CASE_STUDIES,
  DEFAULT_PLANS,
  DEFAULT_RECURRING,
  DEFAULT_SECURITY_OFFERS,
  DEFAULT_WEB_OPTIONS,
};

const KEYS = {
  plans: "plans",
  securityOffers: "security_offers",
  webOptions: "web_options",
  recurring: "recurring",
  caseStudies: "case_studies",
} as const;

/** Pages publiques dont le rendu dépend du contenu éditable. */
export const CONTENT_PATHS = ["/", "/web", "/security", "/tarifs", "/realisations"] as const;

/** Filet de sécurité : relecture forcée en base au-delà de ce délai. */
const MEMO_TTL_MS = 60_000;

const globalForContent = globalThis as unknown as {
  __4urContentMemo?: { bundle: ContentBundle; at: number };
};

function readSection<S extends z.ZodTypeAny>(
  byKey: Map<string, string>,
  key: string,
  schema: S,
  fallback: z.infer<S>
): z.infer<S> {
  const raw = byKey.get(key);
  if (!raw) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
  } catch {
    return fallback;
  }
}

async function readContentBundleUncached(): Promise<ContentBundle> {
  try {
    const rows = await db.siteContent.findMany({
      where: { key: { in: Object.values(KEYS) } },
    });
    const byKey = new Map<string, string>(
      rows.map((r): [string, string] => [r.key, r.value])
    );
    return {
      plans: readSection(byKey, KEYS.plans, z.array(planSchema).length(3), DEFAULT_PLANS),
      securityOffers: readSection(
        byKey,
        KEYS.securityOffers,
        z.array(securityOfferSchema).length(3),
        DEFAULT_SECURITY_OFFERS
      ),
      webOptions: readSection(
        byKey,
        KEYS.webOptions,
        z.array(serviceCardSchema).length(3),
        DEFAULT_WEB_OPTIONS
      ),
      recurring: readSection(
        byKey,
        KEYS.recurring,
        z.array(serviceCardSchema).length(3),
        DEFAULT_RECURRING
      ),
      caseStudies: readSection(
        byKey,
        KEYS.caseStudies,
        caseStudiesSchema,
        DEFAULT_CASE_STUDIES
      ),
    };
  } catch (err) {
    console.error("[content] lecture impossible, valeurs par défaut:", err);
    return DEFAULT_BUNDLE;
  }
}

/** Vide le mémo processus : la prochaine lecture repart de la base. */
export function invalidateContentCache(): void {
  globalForContent.__4urContentMemo = undefined;
}

/** Lecture rapide (mémo processus) pour les pages publiques. */
export async function getContentBundle(): Promise<ContentBundle> {
  const memo = globalForContent.__4urContentMemo;
  if (memo && Date.now() - memo.at < MEMO_TTL_MS) return memo.bundle;
  const bundle = await readContentBundleUncached();
  globalForContent.__4urContentMemo = { bundle, at: Date.now() };
  return bundle;
}

/** Lecture directe non cachée pour l'éditeur du Dashboard. */
export async function getContentBundleFresh(): Promise<ContentBundle> {
  return readContentBundleUncached();
}

/** Sauvegarde le bundle complet et rend la publication visible immédiatement. */
export async function saveContentBundle(bundle: ContentBundle): Promise<void> {
  const entries: [string, unknown][] = [
    [KEYS.plans, bundle.plans],
    [KEYS.securityOffers, bundle.securityOffers],
    [KEYS.webOptions, bundle.webOptions],
    [KEYS.recurring, bundle.recurring],
    [KEYS.caseStudies, bundle.caseStudies],
  ];

  await db.$transaction(
    entries.map(([key, value]) =>
      db.siteContent.upsert({
        where: { key },
        update: { value: JSON.stringify(value) },
        create: { key, value: JSON.stringify(value) },
      })
    )
  );

  // 1) Invalidation synchrone du mémo : effective dès la requête suivante.
  invalidateContentCache();

  // 2) Ceinture et bretelles : on purge aussi le cache de routes Next.js
  //    (sans jamais faire échouer la sauvegarde si l'API n'est pas disponible).
  for (const path of CONTENT_PATHS) {
    try {
      revalidatePath(path);
    } catch (err) {
      console.warn(`[content] revalidatePath(${path}) ignoré :`, err);
    }
  }
}
