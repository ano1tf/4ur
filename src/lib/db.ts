import "server-only";

import { randomBytes } from "crypto";
import { mkdirSync } from "fs";
import { dirname, isAbsolute, resolve } from "path";
import { createClient as createLibsqlClient, type Client as LibsqlClient } from "@libsql/client/web";

/**
 * Couche d'accès données — deux pilotes interchangeables derrière une même API :
 *
 * 1. **Turso / libSQL (distant, persistant)** — activé dès que `TURSO_DATABASE_URL`
 *    est défini (ou que `DATABASE_URL` commence par `libsql://`, `https://` ou `wss://`).
 *    Transport HTTP pur (`@libsql/client/web`) : aucun binaire natif, fonctionne
 *    à l'identique sous Node et Bun, y compris dans le build standalone Render.
 *    → Les prix, réalisations, demandes de contact et statistiques survivent aux
 *      redémarrages, même sans disque persistant.
 *
 * 2. **SQLite local (fichier ou mémoire)** — repli automatique en développement et
 *    quand Turso n'est pas configuré : `bun:sqlite` sous Bun, `node:sqlite` sous
 *    Node ≥ 22.5. Mode WAL, schéma créé automatiquement.
 *
 * Le schéma SQL est identique à `prisma/schema.prisma` et créé au premier accès.
 */

export interface SiteContentRecord {
  key: string;
  value: string;
  updatedAt: Date;
}

export interface ContactRequestRecord {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  budget: string | null;
  message: string;
  source: string;
  consent: boolean;
  createdAt: Date;
}

export interface PageViewRecord {
  id: string;
  path: string;
  referrer: string | null;
  device: string;
  browser: string;
  visitorHash: string;
  createdAt: Date;
}

export interface MonitorPingLogRecord {
  id: string;
  targetUrl: string;
  ok: boolean;
  statusCode: number | null;
  latencyMs: number;
  trigger: string;
  webhookSent: boolean;
  webhookOk: boolean | null;
  webhookError: string | null;
  errorMessage: string | null;
  createdAt: Date;
}

export type DbDriver = "turso" | "sqlite-file" | "sqlite-memory";

export interface DbInfo {
  driver: DbDriver;
  /** Emplacement anonymisé (hôte Turso ou chemin du fichier). */
  location: string;
  /** `true` si les données survivent à un redémarrage du processus. */
  persistent: boolean;
}

type SqlParam = string | number | null;

interface RawSqlAdapter {
  exec(sql: string): Promise<void>;
  all<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T[]>;
  get<T = Record<string, unknown>>(sql: string, params?: SqlParam[]): Promise<T | undefined>;
  run(sql: string, params?: SqlParam[]): Promise<void>;
}

function generateId(): string {
  const ts = Date.now().toString(36);
  const rand = randomBytes(8).toString("hex");
  return `c${ts}${rand}`;
}

/* -------------------------------------------------------------------------- */
/*                         Configuration & détection                          */
/* -------------------------------------------------------------------------- */

const REMOTE_PROTOCOLS = ["libsql:", "https:", "wss:", "http:", "ws:"];

interface TursoConfig {
  url: string;
  authToken?: string;
}

/** Lit la configuration Turso depuis l'environnement (ou `null` si absente). */
function resolveTursoConfig(): TursoConfig | null {
  const explicit = (process.env.TURSO_DATABASE_URL || "").trim();
  const generic = (process.env.DATABASE_URL || "").trim();
  const candidate = explicit || generic;
  if (!candidate) return null;

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return null;
  }
  if (!REMOTE_PROTOCOLS.includes(parsed.protocol)) return null;

  // Jeton : variable dédiée, ou `?authToken=` dans l'URL (format accepté par Turso).
  const fromUrl = parsed.searchParams.get("authToken") ?? undefined;
  parsed.searchParams.delete("authToken");
  const authToken =
    (process.env.TURSO_AUTH_TOKEN || process.env.DATABASE_AUTH_TOKEN || "").trim() ||
    fromUrl;

  return { url: parsed.toString().replace(/\?$/, ""), authToken };
}

function resolveSqlitePath(): string {
  const defaultRaw =
    process.env.NODE_ENV === "production"
      ? "file:/tmp/4ur-db/custom.db"
      : "file:./db/custom.db";
  const raw = (process.env.DATABASE_URL || defaultRaw).trim();
  if (raw === ":memory:" || raw === "file::memory:") return ":memory:";

  const stripped = raw.startsWith("file:") ? raw.slice(5).split("?")[0] : raw;
  const fullPath = isAbsolute(stripped)
    ? stripped
    : resolve(process.cwd(), "prisma", stripped);

  try {
    mkdirSync(dirname(fullPath), { recursive: true });
    return fullPath;
  } catch {
    try {
      mkdirSync("/tmp/4ur-db", { recursive: true });
      return "/tmp/4ur-db/custom.db";
    } catch {
      return ":memory:";
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                            Pilote 1 — Turso / libSQL                        */
/* -------------------------------------------------------------------------- */

function openTursoAdapter(config: TursoConfig): RawSqlAdapter {
  const client: LibsqlClient = createLibsqlClient({
    url: config.url,
    authToken: config.authToken,
    intMode: "number",
  });

  // Les entiers JS partent en « float » dans le protocole Hrana : on les convertit
  // en BigInt pour qu'ils soient stockés en INTEGER (booléens, compteurs, LIMIT…).
  const toArgs = (params: SqlParam[]): (string | number | bigint | null)[] =>
    params.map((p) => (typeof p === "number" && Number.isInteger(p) ? BigInt(p) : p));

  const toObjects = <T>(rs: { columns: string[]; rows: unknown[] }): T[] =>
    rs.rows.map((row) => {
      const r = row as Record<string, unknown> & ArrayLike<unknown>;
      const obj: Record<string, unknown> = {};
      rs.columns.forEach((col, i) => {
        obj[col] = r[col] !== undefined ? r[col] : r[i];
      });
      return obj as T;
    });

  return {
    exec: async (sql) => {
      await client.executeMultiple(sql);
    },
    all: async <T>(sql: string, params: SqlParam[] = []) =>
      toObjects<T>(await client.execute({ sql, args: toArgs(params) })),
    get: async <T>(sql: string, params: SqlParam[] = []) =>
      toObjects<T>(await client.execute({ sql, args: toArgs(params) }))[0],
    run: async (sql: string, params: SqlParam[] = []) => {
      await client.execute({ sql, args: toArgs(params) });
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                 Pilote 2 — SQLite local (bun:sqlite / node:sqlite)          */
/* -------------------------------------------------------------------------- */

function openSqliteAtPath(dbPath: string): RawSqlAdapter {
  const getBuiltin = (
    process as unknown as { getBuiltinModule?: (id: string) => unknown }
  ).getBuiltinModule;

  if (!getBuiltin) {
    throw new Error("process.getBuiltinModule indisponible sur ce runtime.");
  }

  if ("Bun" in globalThis) {
    const { Database } = getBuiltin("bun:sqlite") as {
      Database: new (
        filename: string,
        options?: { create?: boolean }
      ) => {
        exec(sql: string): void;
        query(sql: string): {
          all(...params: SqlParam[]): unknown[];
          get(...params: SqlParam[]): unknown;
          run(...params: SqlParam[]): void;
        };
      };
    };
    const instance = new Database(dbPath, { create: true });
    return {
      exec: async (sql) => instance.exec(sql),
      all: async <T>(sql: string, params: SqlParam[] = []) =>
        instance.query(sql).all(...params) as T[],
      get: async <T>(sql: string, params: SqlParam[] = []) =>
        (instance.query(sql).get(...params) as T | null | undefined) ?? undefined,
      run: async (sql: string, params: SqlParam[] = []) => {
        instance.query(sql).run(...params);
      },
    };
  }

  const sqliteMod = getBuiltin("node:sqlite") as {
    DatabaseSync: new (filename: string) => {
      exec(sql: string): void;
      prepare(sql: string): {
        all(...params: SqlParam[]): unknown[];
        get(...params: SqlParam[]): unknown;
        run(...params: SqlParam[]): void;
      };
    };
  };
  const instance = new sqliteMod.DatabaseSync(dbPath);
  return {
    exec: async (sql) => instance.exec(sql),
    all: async <T>(sql: string, params: SqlParam[] = []) =>
      instance.prepare(sql).all(...params) as T[],
    get: async <T>(sql: string, params: SqlParam[] = []) =>
      instance.prepare(sql).get(...params) as T | undefined,
    run: async (sql: string, params: SqlParam[] = []) => {
      instance.prepare(sql).run(...params);
    },
  };
}

/* -------------------------------------------------------------------------- */
/*                               Schéma & bootstrap                           */
/* -------------------------------------------------------------------------- */

const PRAGMA_SQL = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
PRAGMA busy_timeout = 5000;
`;

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS "SiteContent" (
  "key" TEXT NOT NULL PRIMARY KEY,
  "value" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "ContactRequest" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "company" TEXT,
  "subject" TEXT NOT NULL,
  "budget" TEXT,
  "message" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT 'website',
  "consent" BOOLEAN NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

CREATE TABLE IF NOT EXISTS "PageView" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "path" TEXT NOT NULL,
  "referrer" TEXT,
  "device" TEXT NOT NULL DEFAULT 'desktop',
  "browser" TEXT NOT NULL DEFAULT 'Autre',
  "visitorHash" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "PageView_createdAt_idx" ON "PageView"("createdAt");
CREATE INDEX IF NOT EXISTS "PageView_path_idx" ON "PageView"("path");
CREATE INDEX IF NOT EXISTS "PageView_visitorHash_idx" ON "PageView"("visitorHash");

CREATE TABLE IF NOT EXISTS "MonitorPingLog" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "targetUrl" TEXT NOT NULL,
  "ok" BOOLEAN NOT NULL,
  "statusCode" INTEGER,
  "latencyMs" INTEGER NOT NULL,
  "trigger" TEXT NOT NULL DEFAULT 'scheduled',
  "webhookSent" BOOLEAN NOT NULL DEFAULT 0,
  "webhookOk" BOOLEAN,
  "webhookError" TEXT,
  "errorMessage" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "MonitorPingLog_createdAt_idx" ON "MonitorPingLog"("createdAt");
`;

interface DbState {
  adapter: RawSqlAdapter;
  info: DbInfo;
}

const globalForDb = globalThis as unknown as {
  __4urDbState?: Promise<DbState>;
};

function describeLocation(url: string): string {
  try {
    return new URL(url).host || url;
  } catch {
    return url;
  }
}

async function bootstrap(): Promise<DbState> {
  const turso = resolveTursoConfig();

  if (turso) {
    const adapter = openTursoAdapter(turso);
    try {
      await adapter.exec(SCHEMA_SQL);
      console.info(`[db] Turso connecté (${describeLocation(turso.url)}).`);
      return {
        adapter,
        info: { driver: "turso", location: describeLocation(turso.url), persistent: true },
      };
    } catch (err) {
      console.error(
        "[db] Connexion Turso impossible, bascule sur SQLite local (données NON persistantes) :",
        err
      );
    }
  }

  const dbPath = resolveSqlitePath();
  let adapter: RawSqlAdapter;
  let effectivePath = dbPath;
  try {
    adapter = openSqliteAtPath(dbPath);
  } catch (err) {
    console.warn(
      `[db] Ouverture sur ${dbPath} impossible, bascule automatique en RAM (:memory:) :`,
      err
    );
    adapter = openSqliteAtPath(":memory:");
    effectivePath = ":memory:";
  }
  try {
    await adapter.exec(PRAGMA_SQL);
  } catch {
    /* ignoré en mode :memory: */
  }
  await adapter.exec(SCHEMA_SQL);

  const memory = effectivePath === ":memory:";
  return {
    adapter,
    info: {
      driver: memory ? "sqlite-memory" : "sqlite-file",
      location: effectivePath,
      // Un fichier dans /tmp (cas Render sans disque) ne survit pas à un redéploiement.
      persistent: !memory && !effectivePath.startsWith("/tmp/"),
    },
  };
}

function state(): Promise<DbState> {
  if (!globalForDb.__4urDbState) {
    globalForDb.__4urDbState = bootstrap().catch((err) => {
      // Permet une nouvelle tentative au prochain appel plutôt qu'un échec figé.
      globalForDb.__4urDbState = undefined;
      throw err;
    });
  }
  return globalForDb.__4urDbState;
}

async function run(sql: string, params: SqlParam[] = []): Promise<void> {
  const { adapter } = await state();
  await adapter.run(sql, params);
}

async function all<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = []
): Promise<T[]> {
  const { adapter } = await state();
  return adapter.all<T>(sql, params);
}

async function get<T = Record<string, unknown>>(
  sql: string,
  params: SqlParam[] = []
): Promise<T | undefined> {
  const { adapter } = await state();
  return adapter.get<T>(sql, params);
}

/** Pilote effectivement utilisé (pour /api/health et le Dashboard). */
export async function getDbInfo(): Promise<DbInfo> {
  return (await state()).info;
}

const toDate = (v: unknown): Date =>
  v instanceof Date ? v : new Date(typeof v === "string" || typeof v === "number" ? v : Date.now());

const toBool = (v: unknown): boolean => v === true || v === 1 || v === "1";

function mapContactRow(r: Record<string, unknown>): ContactRequestRecord {
  return {
    id: String(r.id),
    name: String(r.name),
    email: String(r.email),
    company: r.company !== null && r.company !== undefined ? String(r.company) : null,
    subject: String(r.subject),
    budget: r.budget !== null && r.budget !== undefined ? String(r.budget) : null,
    message: String(r.message),
    source: String(r.source ?? "website"),
    consent: toBool(r.consent),
    createdAt: toDate(r.createdAt),
  };
}

function mapPageViewRow(r: Record<string, unknown>): PageViewRecord {
  return {
    id: String(r.id),
    path: String(r.path),
    referrer: r.referrer !== null && r.referrer !== undefined ? String(r.referrer) : null,
    device: String(r.device ?? "desktop"),
    browser: String(r.browser ?? "Autre"),
    visitorHash: String(r.visitorHash),
    createdAt: toDate(r.createdAt),
  };
}

function mapPingRow(r: Record<string, unknown>): MonitorPingLogRecord {
  return {
    id: String(r.id),
    targetUrl: String(r.targetUrl),
    ok: toBool(r.ok),
    statusCode:
      r.statusCode !== null && r.statusCode !== undefined ? Number(r.statusCode) : null,
    latencyMs: Number(r.latencyMs ?? 0),
    trigger: String(r.trigger ?? "scheduled"),
    webhookSent: toBool(r.webhookSent),
    webhookOk:
      r.webhookOk !== null && r.webhookOk !== undefined ? toBool(r.webhookOk) : null,
    webhookError:
      r.webhookError !== null && r.webhookError !== undefined
        ? String(r.webhookError)
        : null,
    errorMessage:
      r.errorMessage !== null && r.errorMessage !== undefined
        ? String(r.errorMessage)
        : null,
    createdAt: toDate(r.createdAt),
  };
}

export const db = {
  siteContent: {
    async findUnique(args: { where: { key: string } }): Promise<SiteContentRecord | null> {
      const row = await get<Record<string, unknown>>(
        `SELECT "key", "value", "updatedAt" FROM "SiteContent" WHERE "key" = ? LIMIT 1`,
        [args.where.key]
      );
      if (!row) return null;
      return {
        key: String(row.key),
        value: String(row.value),
        updatedAt: toDate(row.updatedAt),
      };
    },

    async findMany(args?: {
      where?: { key?: { in: string[] } };
    }): Promise<SiteContentRecord[]> {
      const keys = args?.where?.key?.in;
      if (keys && keys.length > 0) {
        const placeholders = keys.map(() => "?").join(", ");
        const rows = await all<Record<string, unknown>>(
          `SELECT "key", "value", "updatedAt" FROM "SiteContent" WHERE "key" IN (${placeholders})`,
          keys
        );
        return rows.map((r) => ({
          key: String(r.key),
          value: String(r.value),
          updatedAt: toDate(r.updatedAt),
        }));
      }
      const rows = await all<Record<string, unknown>>(
        `SELECT "key", "value", "updatedAt" FROM "SiteContent"`
      );
      return rows.map((r) => ({
        key: String(r.key),
        value: String(r.value),
        updatedAt: toDate(r.updatedAt),
      }));
    },

    async upsert(args: {
      where: { key: string };
      update: { value: string };
      create: { key: string; value: string };
    }): Promise<SiteContentRecord> {
      const nowIso = new Date().toISOString();
      await run(
        `INSERT INTO "SiteContent" ("key", "value", "updatedAt")
         VALUES (?, ?, ?)
         ON CONFLICT("key") DO UPDATE SET "value" = excluded."value", "updatedAt" = excluded."updatedAt"`,
        [args.create.key, args.create.value, nowIso]
      );
      return { key: args.where.key, value: args.update.value, updatedAt: new Date(nowIso) };
    },
  },

  contactRequest: {
    async create(args: {
      data: {
        name: string;
        email: string;
        company?: string | null;
        subject: string;
        budget?: string | null;
        message: string;
        source?: string;
        consent?: boolean;
      };
    }): Promise<ContactRequestRecord> {
      const id = generateId();
      const nowIso = new Date().toISOString();
      const {
        name,
        email,
        company = null,
        subject,
        budget = null,
        message,
        source = "website",
        consent = false,
      } = args.data;

      await run(
        `INSERT INTO "ContactRequest" ("id", "name", "email", "company", "subject", "budget", "message", "source", "consent", "createdAt")
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, name, email, company, subject, budget, message, source, consent ? 1 : 0, nowIso]
      );

      return {
        id,
        name,
        email,
        company,
        subject,
        budget,
        message,
        source,
        consent,
        createdAt: new Date(nowIso),
      };
    },

    async findMany(args?: {
      orderBy?: { createdAt: "asc" | "desc" };
      take?: number;
      where?: { createdAt?: { gte?: Date } };
      select?: Record<string, boolean>;
    }): Promise<ContactRequestRecord[]> {
      const dir = args?.orderBy?.createdAt === "asc" ? "ASC" : "DESC";
      const limit = args?.take ?? 100;
      const gte = args?.where?.createdAt?.gte;

      const rows = gte
        ? await all<Record<string, unknown>>(
            `SELECT * FROM "ContactRequest" WHERE "createdAt" >= ? ORDER BY "createdAt" ${dir} LIMIT ?`,
            [gte.toISOString(), limit]
          )
        : await all<Record<string, unknown>>(
            `SELECT * FROM "ContactRequest" ORDER BY "createdAt" ${dir} LIMIT ?`,
            [limit]
          );

      return rows.map(mapContactRow);
    },

    async count(args?: { where?: { createdAt?: { gte?: Date } } }): Promise<number> {
      const gte = args?.where?.createdAt?.gte;
      const row = gte
        ? await get<{ c: number }>(
            `SELECT COUNT(*) AS c FROM "ContactRequest" WHERE "createdAt" >= ?`,
            [gte.toISOString()]
          )
        : await get<{ c: number }>(`SELECT COUNT(*) AS c FROM "ContactRequest"`);
      return Number(row?.c ?? 0);
    },

    async delete(args: { where: { id: string } }): Promise<void> {
      await run(`DELETE FROM "ContactRequest" WHERE "id" = ?`, [args.where.id]);
    },
  },

  pageView: {
    async create(args: {
      data: {
        path: string;
        referrer?: string | null;
        device?: string;
        browser?: string;
        visitorHash: string;
      };
    }): Promise<PageViewRecord> {
      const id = generateId();
      const nowIso = new Date().toISOString();
      const {
        path,
        referrer = null,
        device = "desktop",
        browser = "Autre",
        visitorHash,
      } = args.data;

      await run(
        `INSERT INTO "PageView" ("id", "path", "referrer", "device", "browser", "visitorHash", "createdAt")
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id, path, referrer, device, browser, visitorHash, nowIso]
      );

      // Garde la base légère sur la durée (max 25 000 vues conservées)
      if (Math.random() < 0.02) {
        await run(
          `DELETE FROM "PageView" WHERE "id" NOT IN (
             SELECT "id" FROM "PageView" ORDER BY "createdAt" DESC LIMIT 25000
           )`
        );
      }

      return {
        id,
        path,
        referrer,
        device,
        browser,
        visitorHash,
        createdAt: new Date(nowIso),
      };
    },

    async findMany(args?: {
      where?: { createdAt?: { gte?: Date } };
      orderBy?: { createdAt: "asc" | "desc" };
      take?: number;
    }): Promise<PageViewRecord[]> {
      const dir = args?.orderBy?.createdAt === "asc" ? "ASC" : "DESC";
      const limit = args?.take ?? 10000;
      const gte = args?.where?.createdAt?.gte;

      const rows = gte
        ? await all<Record<string, unknown>>(
            `SELECT * FROM "PageView" WHERE "createdAt" >= ? ORDER BY "createdAt" ${dir} LIMIT ?`,
            [gte.toISOString(), limit]
          )
        : await all<Record<string, unknown>>(
            `SELECT * FROM "PageView" ORDER BY "createdAt" ${dir} LIMIT ?`,
            [limit]
          );

      return rows.map(mapPageViewRow);
    },

    async count(args?: { where?: { createdAt?: { gte?: Date } } }): Promise<number> {
      const gte = args?.where?.createdAt?.gte;
      const row = gte
        ? await get<{ c: number }>(
            `SELECT COUNT(*) AS c FROM "PageView" WHERE "createdAt" >= ?`,
            [gte.toISOString()]
          )
        : await get<{ c: number }>(`SELECT COUNT(*) AS c FROM "PageView"`);
      return Number(row?.c ?? 0);
    },

    async deleteMany(): Promise<void> {
      await run(`DELETE FROM "PageView"`);
    },
  },

  monitorPingLog: {
    async create(args: {
      data: {
        targetUrl: string;
        ok: boolean;
        statusCode?: number | null;
        latencyMs: number;
        trigger?: string;
        webhookSent?: boolean;
        webhookOk?: boolean | null;
        webhookError?: string | null;
        errorMessage?: string | null;
      };
    }): Promise<MonitorPingLogRecord> {
      const id = generateId();
      const nowIso = new Date().toISOString();
      const {
        targetUrl,
        ok,
        statusCode = null,
        latencyMs,
        trigger = "scheduled",
        webhookSent = false,
        webhookOk = null,
        webhookError = null,
        errorMessage = null,
      } = args.data;

      await run(
        `INSERT INTO "MonitorPingLog" (
           "id", "targetUrl", "ok", "statusCode", "latencyMs",
           "trigger", "webhookSent", "webhookOk", "webhookError", "errorMessage", "createdAt"
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          targetUrl,
          ok ? 1 : 0,
          statusCode,
          Math.max(0, Math.round(latencyMs)),
          trigger,
          webhookSent ? 1 : 0,
          webhookOk === null ? null : webhookOk ? 1 : 0,
          webhookError,
          errorMessage,
          nowIso,
        ]
      );

      // Conserve les 500 derniers pings maximum pour éviter tout gonflement SQLite
      await run(
        `DELETE FROM "MonitorPingLog" WHERE "id" NOT IN (
           SELECT "id" FROM "MonitorPingLog" ORDER BY "createdAt" DESC LIMIT 500
         )`
      );

      return {
        id,
        targetUrl,
        ok,
        statusCode,
        latencyMs: Math.max(0, Math.round(latencyMs)),
        trigger,
        webhookSent,
        webhookOk,
        webhookError,
        errorMessage,
        createdAt: new Date(nowIso),
      };
    },

    async findMany(args?: {
      orderBy?: { createdAt: "asc" | "desc" };
      take?: number;
      where?: { createdAt?: { gte?: Date } };
    }): Promise<MonitorPingLogRecord[]> {
      const dir = args?.orderBy?.createdAt === "asc" ? "ASC" : "DESC";
      const limit = args?.take ?? 50;
      const gte = args?.where?.createdAt?.gte;

      const rows = gte
        ? await all<Record<string, unknown>>(
            `SELECT * FROM "MonitorPingLog" WHERE "createdAt" >= ? ORDER BY "createdAt" ${dir} LIMIT ?`,
            [gte.toISOString(), limit]
          )
        : await all<Record<string, unknown>>(
            `SELECT * FROM "MonitorPingLog" ORDER BY "createdAt" ${dir} LIMIT ?`,
            [limit]
          );

      return rows.map(mapPingRow);
    },

    async deleteMany(): Promise<void> {
      await run(`DELETE FROM "MonitorPingLog"`);
    },
  },

  async $transaction<T>(operations: Promise<T>[]): Promise<T[]> {
    return Promise.all(operations);
  },

  async $ping(): Promise<{ ok: boolean; latencyMs: number; driver: DbDriver }> {
    const start = performance.now();
    const { adapter, info } = await state();
    const res = await adapter.get<{ ok: number }>(`SELECT 1 AS ok`);
    const latencyMs = Math.max(0, Math.round((performance.now() - start) * 100) / 100);
    return { ok: Number(res?.ok) === 1, latencyMs, driver: info.driver };
  },
};
