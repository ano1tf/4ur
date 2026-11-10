"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowLeft,
  BarChart3,
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  Lock,
  LogOut,
  Monitor,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  ShieldAlert,
  Sliders,
  Smartphone,
  Tablet,
  Trash2,
  Upload,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { DEFAULT_BUNDLE, type ContentBundle } from "@/lib/content-defaults";
import type { CaseStudy } from "@/lib/case-studies";
import { CaseStudiesEditor } from "./case-studies-editor";
import { Field, LinesField, TextAreaField } from "./fields";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

type AuthState = "checking" | "locked" | "unlocked";
type MainTab = "stats" | "monitor" | "leads" | "content";
type ContentSubTab = "plans" | "security" | "options" | "recurring" | "works";
type RangeKey = "24h" | "7d" | "30d";
type NotifyMode = "every_ping" | "alert_only" | "silent";

interface StatsPayload {
  ok: boolean;
  range: RangeKey;
  summary: {
    totalViews: number;
    views24h: number;
    periodViews: number;
    uniqueVisitors: number;
    totalLeads: number;
    periodLeads: number;
    conversionRate: number;
    uptimePercent: number;
    avgLatencyMs: number;
    checksCount: number;
    serverUptimeSec: number;
  };
  timeline: { label: string; views: number; visitors: number }[];
  topPages: { path: string; label: string; views: number; share: number }[];
  devices: { device: string; label: string; count: number; share: number }[];
  browsers: { browser: string; count: number; share: number }[];
  referrers: { source: string; count: number; share: number }[];
  leadsBySubject: { subject: string; label: string; count: number }[];
}

interface MonitorConfig {
  enabled: boolean;
  targetUrl: string;
  discordWebhookUrl: string;
  intervalMinutes: number;
  notifyMode: NotifyMode;
  includeStatsInEmbed: boolean;
  username: string;
}

interface MonitorRuntime {
  serverStartedAt: string;
  uptimeSeconds: number;
  schedulerActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastStatusOk: boolean | null;
}

interface PingLogItem {
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
  createdAt: string;
}

interface Lead {
  id: string;
  name: string;
  email: string;
  company: string | null;
  subject: string;
  budget: string | null;
  message: string;
  createdAt: string;
}

const SESSION_STORAGE_KEY = "4ur_dashboard_token";

const DISCORD_WEBHOOK_REGEX =
  /^https:\/\/(?:(?:ptb|canary)\.)?(?:discord|discordapp)\.com\/api\/webhooks\/[0-9]+\/[A-Za-z0-9_-]+(?:\?.*)?$/;

const PRESET_INTERVALS = [1, 2, 5, 10, 15, 30, 60];

const SUBJECT_LABELS: Record<string, string> = {
  web: "Site web",
  security: "Cybersécurité",
  both: "Site + sécurité",
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatUptime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m ${seconds % 60}s`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${mins % 60}m`;
  const days = Math.floor(hours / 24);
  return `${days}j ${hours % 24}h`;
}

function formatCountdown(nextRunAt: string | null, nowMs: number): string {
  if (!nextRunAt) return "En pause";
  const diffSec = Math.max(0, Math.ceil((new Date(nextRunAt).getTime() - nowMs) / 1000));
  const m = Math.floor(diffSec / 60);
  const s = diffSec % 60;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

/* --------------------- Validation import JSON contenu --------------------- */

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === "string");

const isServiceCardArray = (v: unknown): boolean =>
  Array.isArray(v) &&
  v.length === 3 &&
  v.every(
    (c) =>
      !!c &&
      typeof c.name === "string" &&
      typeof c.price === "string" &&
      typeof c.body === "string"
  );

const isCaseStudyArray = (v: unknown): v is CaseStudy[] =>
  Array.isArray(v) &&
  v.length <= 30 &&
  v.every(
    (c) =>
      !!c &&
      typeof c.slug === "string" &&
      typeof c.client === "string" &&
      typeof c.headline === "string" &&
      (c.category === "web" || c.category === "security" || c.category === "saas") &&
      Array.isArray(c.metrics) &&
      isStringArray(c.stack) &&
      isStringArray(c.deliverables)
  );

/**
 * Valide un export JSON et le complète : les fichiers exportés avant l'ajout des
 * réalisations (sans `caseStudies`) restent importables — la liste actuelle est conservée.
 */
function parseImportedBundle(value: unknown, current: ContentBundle): ContentBundle | null {
  if (!value || typeof value !== "object") return null;
  const b = value as Record<string, unknown>;
  const plansOk =
    Array.isArray(b.plans) &&
    b.plans.length === 3 &&
    b.plans.every(
      (p) =>
        !!p &&
        typeof p.name === "string" &&
        typeof p.price === "string" &&
        typeof p.detail === "string" &&
        typeof p.pitch === "string" &&
        typeof p.cta === "string" &&
        typeof p.popular === "boolean" &&
        isStringArray(p.features)
    );
  const offersOk =
    Array.isArray(b.securityOffers) &&
    b.securityOffers.length === 3 &&
    b.securityOffers.every(
      (o) =>
        !!o &&
        typeof o.name === "string" &&
        typeof o.price === "string" &&
        typeof o.pitch === "string" &&
        isStringArray(o.features)
    );
  if (!(plansOk && offersOk && isServiceCardArray(b.webOptions) && isServiceCardArray(b.recurring))) {
    return null;
  }
  if (b.caseStudies !== undefined && !isCaseStudyArray(b.caseStudies)) return null;
  return {
    ...(b as unknown as Omit<ContentBundle, "caseStudies">),
    caseStudies: (b.caseStudies as CaseStudy[] | undefined) ?? current.caseStudies,
  };
}

/* -------------------------------------------------------------------------- */
/*                             Composant Principal                            */
/* -------------------------------------------------------------------------- */

export function DashboardClient() {
  const { toast } = useToast();
  const router = useRouter();

  const [authState, setAuthState] = useState<AuthState>("checking");
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      return sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      return null;
    }
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authRemaining, setAuthRemaining] = useState<number | null>(null);
  const [authBusy, setAuthBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<MainTab>("stats");
  const [contentSubTab, setContentSubTab] = useState<ContentSubTab>("plans");
  const [range, setRange] = useState<RangeKey>("7d");

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [confirmResetStats, setConfirmResetStats] = useState(false);

  const [monitorConfig, setMonitorConfig] = useState<MonitorConfig>(() => ({
    enabled: true,
    targetUrl:
      typeof window !== "undefined"
        ? `${window.location.origin}/api/health`
        : "http://127.0.0.1:3000/api/health",
    discordWebhookUrl: "",
    intervalMinutes: 5,
    notifyMode: "every_ping",
    includeStatsInEmbed: true,
    username: "4UR Monitor",
  }));
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [monitorRuntime, setMonitorRuntime] = useState<MonitorRuntime | null>(null);
  const [pingLogs, setPingLogs] = useState<PingLogItem[]>([]);
  const [monitorBusy, setMonitorBusy] = useState(false);
  const [pingingNow, setPingingNow] = useState(false);
  const [testingDiscord, setTestingDiscord] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);

  const [bundle, setBundle] = useState<ContentBundle>(() => DEFAULT_BUNDLE);
  const [savingContent, setSavingContent] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** En-têtes d'authentification (cookie + Bearer fallback pour les iframes). */
  const authHeaders = useCallback(
    (extra?: Record<string, string>, tokenOverride?: string | null): Record<string, string> => {
      const headers: Record<string, string> = { ...(extra ?? {}) };
      const activeToken = tokenOverride !== undefined ? tokenOverride : token;
      if (activeToken) headers.Authorization = `Bearer ${activeToken}`;
      return headers;
    },
    [token]
  );

  const handleUnauthorized = useCallback(() => {
    try {
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* sessionStorage indisponible */
    }
    setToken(null);
    setAuthState("locked");
  }, []);

  /* ----------------------- Chargement des données ----------------------- */

  const fetchStats = useCallback(
    async (selectedRange: RangeKey = range, tokenOverride?: string | null) => {
      setStatsLoading(true);
      try {
        const res = await fetch(`/api/dashboard/stats?range=${selectedRange}`, {
          headers: authHeaders(undefined, tokenOverride),
          cache: "no-store",
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const data = (await res.json()) as StatsPayload;
        if (data.ok) setStats(data);
      } catch {
        /* silencieux en cas de micro-coupure */
      } finally {
        setStatsLoading(false);
      }
    },
    [authHeaders, handleUnauthorized, range]
  );

  const fetchMonitor = useCallback(
    async (overwriteForm = true, tokenOverride?: string | null) => {
      try {
        const res = await fetch("/api/dashboard/monitor", {
          headers: authHeaders(undefined, tokenOverride),
          cache: "no-store",
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const data = (await res.json()) as {
          ok: boolean;
          config?: MonitorConfig;
          runtime?: MonitorRuntime;
          logs?: PingLogItem[];
        };
        if (data.ok) {
          setMonitorError(null);
          if (overwriteForm && data.config) setMonitorConfig(data.config);
          if (data.runtime) setMonitorRuntime(data.runtime);
          if (data.logs) setPingLogs(data.logs);
        } else {
          setMonitorError("Synchronisation temporairement indisponible — mode local actif.");
        }
      } catch {
        setMonitorError("Connexion serveur en cours de rétablissement…");
      }
    },
    [authHeaders, handleUnauthorized]
  );

  const fetchLeads = useCallback(
    async (tokenOverride?: string | null) => {
      setLeadsLoading(true);
      try {
        const res = await fetch("/api/dev/requests", {
          headers: authHeaders(undefined, tokenOverride),
          cache: "no-store",
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const data = (await res.json()) as { ok: boolean; requests?: Lead[] };
        if (data.ok && data.requests) setLeads(data.requests);
      } finally {
        setLeadsLoading(false);
      }
    },
    [authHeaders, handleUnauthorized]
  );

  const fetchContent = useCallback(
    async (tokenOverride?: string | null) => {
      try {
        const res = await fetch("/api/dev/content", {
          headers: authHeaders(undefined, tokenOverride),
          cache: "no-store",
        });
        if (res.status === 401) {
          handleUnauthorized();
          return;
        }
        const data = (await res.json()) as { ok: boolean; bundle?: ContentBundle };
        if (data.ok && data.bundle) setBundle(data.bundle);
      } catch {
        /* silencieux */
      }
    },
    [authHeaders, handleUnauthorized]
  );

  const loadAllDashboardData = useCallback(
    (tokenOverride?: string | null) => {
      void Promise.all([
        fetchStats("7d", tokenOverride),
        fetchMonitor(true, tokenOverride),
        fetchLeads(tokenOverride),
        fetchContent(tokenOverride),
      ]);
    },
    [fetchStats, fetchMonitor, fetchLeads, fetchContent]
  );

  /* --------------------- Vérification initiale session -------------------- */

  const initialCheckDone = useRef(false);
  useEffect(() => {
    if (initialCheckDone.current) return;
    initialCheckDone.current = true;
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    void fetch("/api/dev/auth", { headers, cache: "no-store" })
      .then((r) => r.json() as Promise<{ ok: boolean }>)
      .then((d) => {
        if (d.ok) {
          setAuthState("unlocked");
          loadAllDashboardData(token);
        } else {
          setAuthState("locked");
        }
      })
      .catch(() => {
        setAuthState("locked");
      });
  }, [token, loadAllDashboardData]);

  /* --- Horloge temps réel (compte à rebours + rafraîchissement auto) --- */

  const prevNextRunRef = useRef<string | null>(null);
  useEffect(() => {
    if (authState !== "unlocked") return;
    const tick = setInterval(() => {
      const current = Date.now();
      setNowMs(current);
      if (
        monitorRuntime?.nextRunAt &&
        prevNextRunRef.current !== monitorRuntime.nextRunAt &&
        new Date(monitorRuntime.nextRunAt).getTime() <= current
      ) {
        prevNextRunRef.current = monitorRuntime.nextRunAt;
        void fetchMonitor(false);
        void fetchStats(range);
      }
    }, 1000);

    const periodic = setInterval(() => {
      void fetchMonitor(false);
      if (activeTab === "stats") void fetchStats(range);
    }, 15_000);

    return () => {
      clearInterval(tick);
      clearInterval(periodic);
    };
  }, [authState, monitorRuntime?.nextRunAt, activeTab, range, fetchMonitor, fetchStats]);

  /* -------------------------- Actions Auth -------------------------- */

  async function onLoginSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (authBusy || !password.trim()) return;
    setAuthBusy(true);
    setAuthError(null);

    try {
      const res = await fetch("/api/dev/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        token?: string;
        error?: string;
        remaining?: number;
      };

      if (data.ok) {
        const nextToken = data.token ?? null;
        if (nextToken) {
          setToken(nextToken);
          try {
            sessionStorage.setItem(SESSION_STORAGE_KEY, nextToken);
          } catch {
            /* sessionStorage indisponible */
          }
        }
        setPassword("");
        setAuthState("unlocked");
        loadAllDashboardData(nextToken);
        toast({
          title: "Dashboard déverrouillé",
          description: "Session sécurisée active pour 12 heures.",
        });
      } else {
        setAuthError(data.error ?? "Mot de passe incorrect.");
        setAuthRemaining(data.remaining ?? null);
      }
    } catch {
      setAuthError("Erreur réseau. Veuillez réessayer.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function onLogout() {
    try {
      await fetch("/api/dev/auth", { method: "DELETE", headers: authHeaders() });
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
    setAuthState("locked");
    toast({ title: "Session fermée" });
  }

  /* ----------------------- Actions Monitoring ----------------------- */

  async function saveMonitor(customConfig?: MonitorConfig) {
    const cfg = customConfig ?? monitorConfig;
    if (!cfg) return;
    setMonitorBusy(true);
    try {
      const res = await fetch("/api/dashboard/monitor", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(cfg),
      });
      const data = (await res.json()) as {
        ok: boolean;
        config?: MonitorConfig;
        runtime?: MonitorRuntime;
        error?: string;
      };
      if (data.ok && data.config) {
        setMonitorConfig(data.config);
        if (data.runtime) setMonitorRuntime(data.runtime);
        toast({
          title: "Monitoring enregistré ✓",
          description: data.config.enabled
            ? `Ping actif toutes les ${data.config.intervalMinutes} min (${
                data.config.notifyMode === "every_ping"
                  ? "avec message Discord"
                  : data.config.notifyMode === "alert_only"
                    ? "silencieux · alerte panne"
                    : "silencieux complet"
              }).`
            : "Planificateur mis en pause.",
        });
      } else {
        toast({
          title: "Configuration invalide",
          description: data.error ?? "Vérifiez les champs saisis.",
          variant: "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setMonitorBusy(false);
    }
  }

  async function triggerManualPing() {
    setPingingNow(true);
    try {
      const res = await fetch("/api/dashboard/monitor", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ action: "ping" }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        log?: PingLogItem;
        runtime?: MonitorRuntime;
        error?: string;
      };
      if (data.ok && data.log) {
        setPingLogs((prev) => [data.log!, ...prev].slice(0, 40));
        if (data.runtime) setMonitorRuntime(data.runtime);
        void fetchStats(range);
        toast({
          title: data.log.ok
            ? `Site en ligne · ${data.log.latencyMs} ms`
            : "Alerte : échec du ping",
          description: data.log.statusCode
            ? `Réponse HTTP ${data.log.statusCode}`
            : data.log.errorMessage ?? undefined,
          variant: data.log.ok ? "default" : "destructive",
        });
      }
    } catch {
      toast({ title: "Erreur lors du ping", variant: "destructive" });
    } finally {
      setPingingNow(false);
    }
  }

  async function triggerDiscordTest() {
    if (!monitorConfig) return;
    setTestingDiscord(true);
    try {
      const res = await fetch("/api/dashboard/monitor", {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
          action: "test_discord",
          discordWebhookUrl: monitorConfig.discordWebhookUrl,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        log?: PingLogItem;
        runtime?: MonitorRuntime;
        error?: string;
      };
      if (!data.ok) {
        toast({
          title: "Webhook Discord invalide",
          description: data.error ?? "Vérifiez l'URL du webhook Discord.",
          variant: "destructive",
        });
        return;
      }
      if (data.log) {
        setPingLogs((prev) => [data.log!, ...prev].slice(0, 40));
        if (data.runtime) setMonitorRuntime(data.runtime);
        if (data.log.webhookOk) {
          toast({
            title: "Message envoyé sur Discord ✓",
            description: `Rapport transmis avec succès (latence site : ${data.log.latencyMs} ms).`,
          });
        } else {
          toast({
            title: "Échec de l'envoi Discord",
            description:
              data.log.webhookError ??
              "Discord n'a pas pu être joint depuis cet environnement.",
            variant: "destructive",
          });
        }
      }
    } catch {
      toast({ title: "Erreur réseau", variant: "destructive" });
    } finally {
      setTestingDiscord(false);
    }
  }

  async function clearPingHistory() {
    await fetch("/api/dashboard/monitor", {
      method: "DELETE",
      headers: authHeaders(),
    });
    setPingLogs([]);
    toast({ title: "Historique des pings effacé" });
  }

  async function resetStats() {
    await fetch("/api/dashboard/stats", {
      method: "DELETE",
      headers: authHeaders(),
    });
    setConfirmResetStats(false);
    await fetchStats(range);
    toast({ title: "Compteurs de visites remis à zéro" });
  }

  /* ----------------------- Actions Demandes & Contenu ----------------------- */

  async function deleteLead(id: string) {
    const res = await fetch(`/api/dev/requests?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    if (res.ok) {
      setLeads((prev) => prev.filter((l) => l.id !== id));
      void fetchStats(range);
      toast({ title: "Demande supprimée" });
    }
  }

  async function saveContent() {
    if (!bundle) return;
    setSavingContent(true);
    try {
      const res = await fetch("/api/dev/content", {
        method: "PUT",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify(bundle),
      });
      const data = (await res.json()) as { ok: boolean; error?: string };
      if (data.ok) {
        toast({
          title: "Contenu publié ✓",
          description: "Les pages publiques ont été mises à jour instantanément.",
        });
        router.refresh();
      } else {
        toast({
          title: "Enregistrement refusé",
          description: data.error ?? "Vérifiez les champs.",
          variant: "destructive",
        });
      }
    } finally {
      setSavingContent(false);
    }
  }

  function exportBundle() {
    if (!bundle) return;
    const blob = new Blob([JSON.stringify(bundle, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `4ur-contenu-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Fichier JSON exporté" });
  }

  async function importBundle(file: File) {
    try {
      const parsed = parseImportedBundle(JSON.parse(await file.text()), bundle);
      if (!parsed) {
        toast({
          title: "Fichier JSON invalide",
          description:
            "Structure attendue : 4 sections tarifaires de 3 éléments (+ réalisations optionnelles).",
          variant: "destructive",
        });
        return;
      }
      setBundle(parsed);
      toast({
        title: "Contenu importé",
        description: "Cliquez sur « Enregistrer » pour publier.",
      });
    } catch {
      toast({ title: "Lecture du fichier impossible", variant: "destructive" });
    }
  }

  const latencySeries = useMemo(
    () =>
      [...pingLogs]
        .slice(0, 24)
        .reverse()
        .map((l) => ({
          time: new Date(l.createdAt).toLocaleTimeString("fr-FR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          latency: l.latencyMs,
          ok: l.ok,
        })),
    [pingLogs]
  );

  /* ========================================================================== */
  /*                           ÉCRAN DE CHARGEMENT                              */
  /* ========================================================================== */

  if (authState === "checking") {
    return (
      <div className="flex min-h-[85svh] items-center justify-center px-5 pt-20">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.26em] text-muted-foreground">
          <RefreshCw className="size-4 animate-spin" />
          vérification de l&apos;accès sécurisé…
        </div>
      </div>
    );
  }

  /* ========================================================================== */
  /*                         ÉCRAN MOT DE PASSE REQUIS                          */
  /* ========================================================================== */

  if (authState === "locked") {
    return (
      <section className="relative flex min-h-[88svh] items-center justify-center px-5 py-28">
        <div className="grid-bg mask-fade-b pointer-events-none absolute inset-0 opacity-60" />

        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.99 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 w-full max-w-md rounded-xl border border-white/14 bg-card/95 p-7 shadow-2xl shadow-black/70 backdrop-blur-md sm:p-9"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-lg border border-white/14 bg-secondary">
                <Lock className="size-4 text-foreground" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-display text-sm font-extrabold tracking-[0.16em]">
                  4UR · DASHBOARD
                </p>
                <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  accès protégé par mot de passe
                </p>
              </div>
            </div>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Site
            </Link>
          </div>

          <p className="mt-6 text-[13px] leading-relaxed text-muted-foreground">
            Entrez le mot de passe administrateur pour accéder aux statistiques en direct,
            au monitoring automatique, au Webhook Discord et à la gestion du site.
          </p>

          <form onSubmit={onLoginSubmit} className="mt-6">
            <label className="block">
              <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                Mot de passe administrateur
              </span>
              <div className="relative mt-2">
                <input
                  type={showPassword ? "text" : "password"}
                  autoFocus
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="h-11 w-full rounded-md border border-white/16 bg-[#0a0a0a] pl-3.5 pr-11 font-mono text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/35 focus:border-white/45"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"
                  }
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="size-4" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                </button>
              </div>
            </label>

            {authError && (
              <p
                role="alert"
                className="mt-3 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 font-mono text-[11px] text-red-300"
              >
                ✗ {authError}
                {authRemaining !== null && authRemaining > 0 && (
                  <span className="text-red-200/70">
                    {" "}
                    ({authRemaining} essai(s) restant(s))
                  </span>
                )}
              </p>
            )}

            <button
              type="submit"
              disabled={authBusy || !password.trim()}
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-primary-foreground transition-all hover:opacity-90 active:scale-[0.99] disabled:opacity-50"
            >
              {authBusy ? (
                <>
                  <RefreshCw className="size-4 animate-spin" />
                  Vérification…
                </>
              ) : (
                "Déverrouiller le Dashboard"
              )}
            </button>
          </form>
        </motion.div>
      </section>
    );
  }

  /* ========================================================================== */
  /*                         DASHBOARD DÉVERROUILLÉ                             */
  /* ========================================================================== */

  const TABS: {
    id: MainTab;
    label: string;
    icon: typeof BarChart3;
    badge?: string | number;
  }[] = [
    { id: "stats", label: "Statistiques", icon: BarChart3 },
    {
      id: "monitor",
      label: "Webhook & Ping",
      icon: Activity,
      badge: monitorConfig?.enabled
        ? `${monitorConfig.intervalMinutes}m`
        : "Pause",
    },
    {
      id: "leads",
      label: "Demandes",
      icon: Inbox,
      badge: leads.length > 0 ? leads.length : undefined,
    },
    { id: "content", label: "Contenu & Tarifs", icon: Sliders },
  ];

  const webhookTrimmed = monitorConfig?.discordWebhookUrl.trim() ?? "";
  const webhookValid =
    webhookTrimmed.length === 0 || DISCORD_WEBHOOK_REGEX.test(webhookTrimmed);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-24 sm:px-8 sm:pt-28">
      {/* En-tête du Dashboard */}
      <div className="flex flex-col justify-between gap-4 border-b border-white/10 pb-6 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
            <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
              console d&apos;administration · session active
            </p>
          </div>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            Tableau de bord 4UR
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              void fetchStats(range);
              void fetchMonitor(false);
              void fetchLeads();
            }}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/12 bg-card px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-white/25 hover:text-foreground"
          >
            <RefreshCw className={cn("size-3.5", statsLoading && "animate-spin")} />
            Actualiser
          </button>
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-white/12 bg-card px-3.5 font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-300"
          >
            <LogOut className="size-3.5" />
            Verrouiller
          </button>
        </div>
      </div>

      {/* Navigation par onglets */}
      <nav
        aria-label="Sections du dashboard"
        className="mt-4 flex gap-1 overflow-x-auto border-b border-white/10"
      >
        {TABS.map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "relative inline-flex items-center gap-2 whitespace-nowrap px-4 py-3 text-[13px] font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <t.icon className="size-4" strokeWidth={1.75} />
              <span>{t.label}</span>
              {t.badge !== undefined && (
                <span className="rounded-full border border-white/14 bg-white/[0.06] px-2 py-0.5 font-mono text-[10px]">
                  {t.badge}
                </span>
              )}
              {active && (
                <motion.span
                  layoutId="dashboard-tab-indicator"
                  transition={{ type: "spring", stiffness: 450, damping: 35 }}
                  className="absolute inset-x-2 bottom-0 h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* ==================================================================== */}
      {/*                        ONGLET 1 : STATISTIQUES                       */}
      {/* ==================================================================== */}
      {activeTab === "stats" && (
        <div className="mt-8 flex flex-col gap-6">
          {/* Sélecteur de période */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              Audience réelle (hors robots &amp; pings automatiques)
            </p>
            <div className="inline-flex rounded-lg border border-white/12 bg-card p-1">
              {(
                [
                  { id: "24h", label: "24 heures" },
                  { id: "7d", label: "7 jours" },
                  { id: "30d", label: "30 jours" },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setRange(r.id);
                    void fetchStats(r.id);
                  }}
                  className={cn(
                    "rounded-md px-3 py-1 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                    range === r.id
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 KPI principaux */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-white/10 bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  Pages vues
                </span>
                <Globe className="size-4" strokeWidth={1.6} />
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">
                {stats ? stats.summary.periodViews : "—"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {stats
                  ? `${stats.summary.views24h} sur 24h · ${stats.summary.totalViews} cumulées`
                  : "chargement…"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  Visiteurs uniques
                </span>
                <Users className="size-4" strokeWidth={1.6} />
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">
                {stats ? stats.summary.uniqueVisitors : "—"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                Empreinte anonyme RGPD
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  Demandes &amp; conversion
                </span>
                <Inbox className="size-4" strokeWidth={1.6} />
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">
                {stats ? stats.summary.periodLeads : "—"}
                <span className="ml-2 text-base font-semibold text-muted-foreground">
                  ({stats ? `${stats.summary.conversionRate} %` : "0 %"})
                </span>
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {stats ? `${stats.summary.totalLeads} demande(s) au total` : "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/10 bg-card p-5">
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em]">
                  Disponibilité &amp; latence
                </span>
                <Zap className="size-4 text-emerald-400" strokeWidth={1.6} />
              </div>
              <p className="mt-3 font-display text-3xl font-extrabold tracking-tight">
                {stats ? `${stats.summary.uptimePercent} %` : "100 %"}
              </p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                {stats
                  ? `Moy. ${stats.summary.avgLatencyMs} ms · Uptime ${formatUptime(
                      stats.summary.serverUptimeSec
                    )}`
                  : "—"}
              </p>
            </div>
          </div>

          {/* Courbe d'évolution du trafic */}
          <div className="rounded-xl border border-white/10 bg-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-bold tracking-tight">
                  Évolution du trafic
                </h2>
                <p className="text-xs text-muted-foreground">
                  Pages vues et visiteurs uniques sur la période sélectionnée
                </p>
              </div>
              <div className="flex items-center gap-4 font-mono text-[11px] text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#fafaf9]" />
                  Pages vues
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#737373]" />
                  Visiteurs
                </span>
              </div>
            </div>

            <div className="mt-6 h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.timeline ?? []}
                  margin={{ top: 6, right: 8, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="viewsFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#fafaf9" stopOpacity={0.28} />
                      <stop offset="95%" stopColor="#fafaf9" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="label"
                    stroke="#737373"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#737373"
                    fontSize={11}
                    allowDecimals={false}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0a0a0a",
                      border: "1px solid rgba(255,255,255,0.14)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    name="Pages vues"
                    stroke="#fafaf9"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#viewsFill)"
                  />
                  <Area
                    type="monotone"
                    dataKey="visitors"
                    name="Visiteurs uniques"
                    stroke="#8f8f8c"
                    strokeWidth={1.5}
                    fillOpacity={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Grille détaillée : Top pages + Appareils / Sources */}
          <div className="grid gap-5 lg:grid-cols-2">
            {/* Pages les plus visitées */}
            <div className="rounded-xl border border-white/10 bg-card p-6">
              <h2 className="font-display text-base font-bold tracking-tight">
                Pages les plus consultées
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                 Classement des routes publiques sur la période
              </p>

              {!stats || stats.topPages.length === 0 ? (
                <p className="py-12 text-center font-mono text-xs text-muted-foreground">
                  Naviguez sur les pages publiques pour voir les statistiques apparaître en direct.
                </p>
              ) : (
                <ul className="mt-5 flex flex-col gap-3">
                  {stats.topPages.map((page) => (
                    <li key={page.path} className="space-y-1.5">
                      <div className="flex items-center justify-between text-[13px]">
                        <span className="font-medium text-foreground">
                          {page.label}{" "}
                          <span className="ml-1.5 font-mono text-[11px] text-muted-foreground">
                            {page.path}
                          </span>
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {page.views} ({page.share} %)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{ width: `${Math.max(4, page.share)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Appareils, Sources & Pôles */}
            <div className="flex flex-col gap-5">
              <div className="rounded-xl border border-white/10 bg-card p-6">
                <h2 className="font-display text-base font-bold tracking-tight">
                  Appareils &amp; sources de trafic
                </h2>
                <div className="mt-4 grid grid-cols-3 gap-3">
                  {(stats?.devices ?? []).map((d) => {
                    const Icon =
                      d.device === "mobile"
                        ? Smartphone
                        : d.device === "tablet"
                          ? Tablet
                          : Monitor;
                    return (
                      <div
                        key={d.device}
                        className="rounded-lg border border-white/10 bg-secondary/40 p-3.5 text-center"
                      >
                        <Icon className="mx-auto size-4 text-muted-foreground" />
                        <p className="mt-2 font-display text-lg font-extrabold">
                          {d.share} %
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                          {d.label} ({d.count})
                        </p>
                      </div>
                    );
                  })}
                </div>

                {stats && stats.referrers.length > 0 && (
                  <div className="mt-5 border-t border-white/10 pt-4">
                    <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Sources d&apos;acquisition
                    </p>
                    <ul className="mt-2.5 flex flex-col gap-1.5">
                      {stats.referrers.map((r) => (
                        <li
                          key={r.source}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-foreground">{r.source}</span>
                          <span className="font-mono text-muted-foreground">
                            {r.count} ({r.share} %)
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-card px-6 py-4">
                <div>
                  <p className="text-xs font-medium text-foreground">
                    Remise à zéro analytique
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Efface uniquement le compteur de pages vues (conserve les demandes).
                  </p>
                </div>
                {confirmResetStats ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmResetStats(false)}
                      className="h-8 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => void resetStats()}
                      className="h-8 rounded-md bg-red-500 px-3 font-mono text-[11px] font-semibold text-white hover:bg-red-600"
                    >
                      Confirmer
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmResetStats(true)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-300"
                  >
                    <Trash2 className="size-3.5" />
                    Réinitialiser
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/*                      ONGLET 2 : WEBHOOK & PING                       */}
      {/* ==================================================================== */}
      {activeTab === "monitor" && (
        <div className="mt-8 flex flex-col gap-6">
          {monitorError && (
            <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-400/25 bg-amber-400/[0.06] px-4 py-3 text-xs text-amber-200">
              <span>{monitorError}</span>
              <button
                type="button"
                onClick={() => void fetchMonitor(true)}
                className="rounded-md border border-amber-300/30 px-2.5 py-1 font-mono text-[11px] hover:bg-amber-300/10"
              >
                Réessayer
              </button>
            </div>
          )}

          {/* Encadré spécial Hébergement Sans Disque Persistant (Render Free) */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.04] p-5 sm:flex-row sm:items-center">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-emerald-400">
                ✓ 100 % compatible sans disque persistant (Render Free)
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Aucun disque payant n&apos;est requis : la base tourne automatiquement en RAM
                (<code className="text-foreground">/tmp</code>) et le ping toutes les{" "}
                <strong className="text-foreground">
                  {monitorConfig.intervalMinutes} min
                </strong>{" "}
                empêche Render de s&apos;endormir. Astuce : copiez ces 3 lignes dans{" "}
                <strong className="text-foreground">Render → Environment</strong> pour que
                votre Webhook survive aussi aux futurs redéploiements Git.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const envSnippet = [
                  `DISCORD_WEBHOOK_URL=${monitorConfig.discordWebhookUrl.trim()}`,
                  `PING_INTERVAL_MINUTES=${monitorConfig.intervalMinutes}`,
                  `PING_NOTIFY_MODE=${monitorConfig.notifyMode}`,
                ].join("\n");
                void navigator.clipboard?.writeText(envSnippet);
                toast({
                  title: "Variables copiées ✓",
                  description:
                    "Collez-les dans Render → Environment → Add from .env pour les rendre permanentes.",
                });
              }}
              className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-4 font-mono text-[11px] font-medium text-emerald-300 transition-colors hover:bg-emerald-400/20"
            >
              Copier pour Render (.env)
            </button>
          </div>
          {/* Bandeau d'état en direct + actions immédiates */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-white/12 bg-card p-6 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <span
                className={cn(
                  "mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-lg border",
                  monitorConfig.enabled
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                    : "border-white/12 bg-secondary text-muted-foreground"
                )}
              >
                <Activity className="size-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h2 className="font-display text-base font-bold tracking-tight">
                    {monitorConfig.enabled
                      ? `Ping automatique actif — toutes les ${monitorConfig.intervalMinutes} min`
                      : "Ping automatique en pause"}
                  </h2>
                  <span className="rounded-full border border-white/12 bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    {monitorConfig.notifyMode === "every_ping"
                      ? "Message Discord à chaque ping"
                      : monitorConfig.notifyMode === "alert_only"
                        ? "Silencieux · Alerte panne"
                        : "100 % Silencieux"}
                  </span>
                </div>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-3.5 text-foreground" />
                    Prochain ping :{" "}
                    <strong className="text-foreground">
                      {monitorConfig.enabled
                        ? formatCountdown(monitorRuntime?.nextRunAt ?? null, nowMs)
                        : "Désactivé"}
                    </strong>
                  </span>
                  {monitorRuntime?.lastRunAt && (
                    <span>
                      Dernier contrôle : {formatDateTime(monitorRuntime.lastRunAt)}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                disabled={pingingNow}
                onClick={() => void triggerManualPing()}
                className="inline-flex h-10 items-center gap-2 rounded-md border border-white/15 bg-secondary px-4 text-xs font-semibold text-foreground transition-colors hover:bg-white/10 disabled:opacity-50"
              >
                <Play className="size-3.5" />
                {pingingNow ? "Ping en cours…" : "Ping maintenant"}
              </button>
              <button
                type="button"
                disabled={testingDiscord}
                onClick={() => void triggerDiscordTest()}
                className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                <Send className="size-3.5" />
                {testingDiscord ? "Envoi Discord…" : "Tester sur Discord"}
              </button>
            </div>
          </div>

          {/* Grille de configuration */}
          <div className="grid gap-6 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col gap-5 rounded-xl border border-white/10 bg-card p-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div>
                  <h3 className="font-display text-base font-bold">
                    Paramètres du Ping &amp; Webhook Discord
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Exécuté côté serveur en continu (garde également l&apos;instance Render active)
                  </p>
                </div>
                <label className="inline-flex cursor-pointer items-center gap-2.5">
                  <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                    {monitorConfig.enabled ? "Actif" : "Pause"}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={monitorConfig.enabled}
                    onClick={() => {
                      const updated = {
                        ...monitorConfig,
                        enabled: !monitorConfig.enabled,
                      };
                      setMonitorConfig(updated);
                      void saveMonitor(updated);
                    }}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      monitorConfig.enabled ? "bg-primary" : "bg-white/15"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-4 rounded-full transition-transform",
                        monitorConfig.enabled
                          ? "translate-x-6 bg-primary-foreground"
                          : "translate-x-1 bg-foreground"
                      )}
                    />
                  </button>
                </label>
              </div>

              {/* Choix de l'intervalle X minutes */}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Fréquence du ping (en minutes — défaut : 5 min)
                </span>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {PRESET_INTERVALS.map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() =>
                        setMonitorConfig({ ...monitorConfig, intervalMinutes: mins })
                      }
                      className={cn(
                        "h-9 rounded-md border px-3 font-mono text-xs transition-colors",
                        monitorConfig.intervalMinutes === mins
                          ? "border-primary bg-primary font-semibold text-primary-foreground"
                          : "border-white/12 bg-[#0b0b0b] text-muted-foreground hover:border-white/30 hover:text-foreground"
                      )}
                    >
                      {mins} min
                    </button>
                  ))}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={1}
                      max={1440}
                      value={monitorConfig.intervalMinutes}
                      onChange={(e) => {
                        const val = Number.parseInt(e.target.value || "1", 10);
                        setMonitorConfig({
                          ...monitorConfig,
                          intervalMinutes: Number.isFinite(val)
                            ? Math.min(1440, Math.max(1, val))
                            : 5,
                        });
                      }}
                      aria-label="Intervalle personnalisé en minutes"
                      className="h-9 w-24 rounded-md border border-white/14 bg-[#0b0b0b] px-3 font-mono text-xs text-foreground outline-none focus:border-white/45"
                    />
                    <span className="font-mono text-xs text-muted-foreground">min</span>
                  </div>
                </div>
              </div>

              {/* Mode Message vs Silencieux */}
              <div>
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Mode de notification Discord (message ou silencieux)
                </span>
                <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
                  {(
                    [
                      {
                        id: "every_ping",
                        title: "Message à chaque ping",
                        desc: "Envoie l'état, la latence et les stats sur Discord toutes les X min.",
                        icon: Bell,
                      },
                      {
                        id: "alert_only",
                        title: "Silencieux (alerte panne)",
                        desc: "Ping en silence toutes les X min ; message Discord uniquement si panne.",
                        icon: ShieldAlert,
                      },
                      {
                        id: "silent",
                        title: "Silencieux complet",
                        desc: "Ping le site toutes les X min sans aucun message automatique.",
                        icon: BellOff,
                      },
                    ] as const
                  ).map((mode) => {
                    const selected = monitorConfig.notifyMode === mode.id;
                    return (
                      <button
                        key={mode.id}
                        type="button"
                        onClick={() =>
                          setMonitorConfig({ ...monitorConfig, notifyMode: mode.id })
                        }
                        className={cn(
                          "flex flex-col items-start rounded-lg border p-3.5 text-left transition-all",
                          selected
                            ? "border-primary bg-white/[0.07] text-foreground"
                            : "border-white/10 bg-[#0b0b0b] text-muted-foreground hover:border-white/25"
                        )}
                      >
                        <mode.icon className="size-4 text-foreground" />
                        <p className="mt-2 text-xs font-semibold text-foreground">
                          {mode.title}
                        </p>
                        <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                          {mode.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* URL Webhook Discord */}
              <div>
                <Field
                  label="URL du Webhook Discord"
                  value={monitorConfig.discordWebhookUrl}
                  onChange={(v) =>
                    setMonitorConfig({ ...monitorConfig, discordWebhookUrl: v })
                  }
                  placeholder="https://discord.com/api/webhooks/1234567890/abcdef..."
                  mono
                />
                {webhookTrimmed.length > 0 && (
                  <p
                    className={cn(
                      "mt-1.5 font-mono text-[11px]",
                      webhookValid ? "text-emerald-400" : "text-amber-300"
                    )}
                  >
                    {webhookValid
                      ? "✓ Format d'URL Webhook Discord valide"
                      : "⚠ Format attendu : https://discord.com/api/webhooks/<id>/<token>"}
                  </p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  label="URL cible à pinguer"
                  value={monitorConfig.targetUrl}
                  onChange={(v) =>
                    setMonitorConfig({ ...monitorConfig, targetUrl: v })
                  }
                  placeholder="https://4ur.onrender.com/api/health"
                  mono
                />
                <Field
                  label="Nom du bot affiché dans Discord"
                  value={monitorConfig.username}
                  onChange={(v) =>
                    setMonitorConfig({ ...monitorConfig, username: v })
                  }
                  placeholder="4UR Monitor"
                />
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-white/10 bg-[#0b0b0b] px-3.5 py-3">
                <input
                  type="checkbox"
                  checked={monitorConfig.includeStatsInEmbed}
                  onChange={(e) =>
                    setMonitorConfig({
                      ...monitorConfig,
                      includeStatsInEmbed: e.target.checked,
                    })
                  }
                  className="size-4 accent-[#fafaf9]"
                />
                <span className="text-xs text-muted-foreground">
                  Inclure le résumé des{" "}
                  <strong className="text-foreground">
                    visites et demandes (24 h)
                  </strong>{" "}
                  dans chaque message Discord
                </span>
              </label>

              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  disabled={monitorBusy || !webhookValid}
                  onClick={() => void saveMonitor()}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-6 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="size-4" />
                  {monitorBusy ? "Enregistrement…" : "Enregistrer la configuration"}
                </button>
              </div>
            </div>

            {/* Colonne droite : Graphique de latence + Historique des pings */}
            <div className="flex flex-col gap-5">
              <div className="rounded-xl border border-white/10 bg-card p-6">
                <h3 className="font-display text-base font-bold">
                  Temps de réponse (ms)
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  24 derniers contrôles de disponibilité
                </p>

                <div className="mt-4 h-44 w-full">
                  {latencySeries.length === 0 ? (
                    <div className="flex h-full items-center justify-center font-mono text-xs text-muted-foreground">
                      Aucun ping enregistré pour l&apos;instant
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={latencySeries}>
                        <CartesianGrid
                          stroke="rgba(255,255,255,0.06)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="time"
                          stroke="#737373"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="#737373"
                          fontSize={10}
                          unit="ms"
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "#0a0a0a",
                            border: "1px solid rgba(255,255,255,0.14)",
                            borderRadius: "8px",
                            fontSize: "12px",
                          }}
                        />
                        <Bar dataKey="latency" name="Latence (ms)" radius={[3, 3, 0, 0]}>
                          {latencySeries.map((entry, idx) => (
                            <Cell
                              key={idx}
                              fill={entry.ok ? "#fafaf9" : "#ef4444"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-card p-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-bold">
                    Journal des pings ({pingLogs.length})
                  </h3>
                  {pingLogs.length > 0 && (
                    <button
                      type="button"
                      onClick={() => void clearPingHistory()}
                      className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                    >
                      Vider
                    </button>
                  )}
                </div>

                <div className="mt-4 flex max-h-80 flex-col gap-2 overflow-y-auto pr-1">
                  {pingLogs.length === 0 ? (
                    <p className="py-8 text-center font-mono text-xs text-muted-foreground">
                      Cliquez sur « Ping maintenant » pour lancer un premier contrôle immédiat.
                    </p>
                  ) : (
                    pingLogs.map((log) => (
                      <div
                        key={log.id}
                        className="rounded-lg border border-white/8 bg-[#0b0b0b] px-3.5 py-2.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2 font-medium">
                            {log.ok ? (
                              <CheckCircle2 className="size-3.5 text-emerald-400" />
                            ) : (
                              <XCircle className="size-3.5 text-red-400" />
                            )}
                            <span>HTTP {log.statusCode ?? "ERR"}</span>
                            <span className="font-mono text-muted-foreground">
                              · {log.latencyMs} ms
                            </span>
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatDateTime(log.createdAt)}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-muted-foreground">
                          <span>
                            Mode :{" "}
                            {log.trigger === "test"
                              ? "Test Discord"
                              : log.trigger === "manual"
                                ? "Manuel"
                                : "Planifié"}
                          </span>
                          <span>
                            {log.webhookSent
                              ? log.webhookOk
                                ? "Discord : envoyé ✓"
                                : `Discord : ${log.webhookError ?? "échec"}`
                              : "Discord : silencieux"}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/*                         ONGLET 3 : DEMANDES                          */}
      {/* ==================================================================== */}
      {activeTab === "leads" && (
        <div className="mt-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {leadsLoading ? "Chargement…" : `${leads.length} demande(s) enregistrée(s)`}
            </p>
            <button
              type="button"
              onClick={() => void fetchLeads()}
              className="inline-flex h-8 items-center gap-2 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className="size-3.5" />
              Actualiser
            </button>
          </div>

          {leads.length === 0 ? (
            <div className="rounded-xl border border-white/10 bg-card py-20 text-center font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Aucune demande de contact reçue pour le moment
            </div>
          ) : (
            leads.map((lead) => (
              <article
                key={lead.id}
                className="rounded-xl border border-white/10 bg-card p-6"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-base font-bold">
                      {lead.name}
                      <span className="ml-2.5 rounded-full border border-white/12 bg-secondary px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                        {SUBJECT_LABELS[lead.subject] ?? lead.subject}
                      </span>
                    </p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      <a
                        href={`mailto:${lead.email}`}
                        className="underline underline-offset-4 hover:text-foreground"
                      >
                        {lead.email}
                      </a>
                      {lead.company ? ` · ${lead.company}` : ""}
                      {lead.budget ? ` · Budget : ${lead.budget}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {formatDateTime(lead.createdAt)}
                    </span>
                    <button
                      type="button"
                      onClick={() => void deleteLead(lead.id)}
                      aria-label={`Supprimer la demande de ${lead.name}`}
                      className="inline-flex size-8 items-center justify-center rounded-md border border-white/10 text-muted-foreground transition-colors hover:border-red-500/40 hover:text-red-400"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {lead.message}
                </p>
              </article>
            ))
          )}
        </div>
      )}

      {/* ==================================================================== */}
      {/*                     ONGLET 4 : CONTENU & TARIFS                      */}
      {/* ==================================================================== */}
      {activeTab === "content" && bundle && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-card p-4">
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  { id: "plans", label: "Formules Web" },
                  { id: "security", label: "Offres Sécurité" },
                  { id: "options", label: "Options Web" },
                  { id: "recurring", label: "Services récurrents" },
                  { id: "works", label: "Réalisations" },
                ] as const
              ).map((sub) => (
                <button
                  key={sub.id}
                  type="button"
                  onClick={() => setContentSubTab(sub.id)}
                  className={cn(
                    "rounded-md px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors",
                    contentSubTab === sub.id
                      ? "bg-primary font-semibold text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void importBundle(file);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Upload className="size-3.5" />
                Importer
              </button>
              <button
                type="button"
                onClick={exportBundle}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                <Download className="size-3.5" />
                Exporter
              </button>
              <button
                type="button"
                onClick={() => {
                  setBundle(structuredClone(DEFAULT_BUNDLE));
                  toast({ title: "Valeurs par défaut chargées" });
                }}
                className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/12 px-3 font-mono text-[11px] text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="size-3.5" />
                Défauts
              </button>
              <button
                type="button"
                disabled={savingContent}
                onClick={() => void saveContent()}
                className="inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-4 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {savingContent ? "…" : "Enregistrer"}
              </button>
            </div>
          </div>

          {contentSubTab === "plans" &&
            bundle.plans.map((plan, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-card p-6"
              >
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                    Formule {i + 1}
                  </p>
                  <label className="flex cursor-pointer items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    Mise en avant
                    <input
                      type="checkbox"
                      checked={plan.popular}
                      onChange={() =>
                        setBundle((b) =>
                          b
                            ? {
                                ...b,
                                plans: b.plans.map((p, idx) => ({
                                  ...p,
                                  popular: idx === i,
                                })),
                              }
                            : b
                        )
                      }
                      className="size-4 accent-[#fafaf9]"
                    />
                  </label>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Nom"
                    value={plan.name}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, name: v } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <Field
                    label="Prix affiché"
                    value={plan.price}
                    mono
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, price: v } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <Field
                    label="Sous-titre"
                    value={plan.detail}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, detail: v } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <Field
                    label="Accroche"
                    value={plan.pitch}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, pitch: v } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Texte du bouton"
                    value={plan.cta}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, cta: v } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <LinesField
                    label="Caractéristiques (une par ligne)"
                    value={plan.features}
                    rows={5}
                    onChange={(lines) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              plans: b.plans.map((p, idx) =>
                                idx === i ? { ...p, features: lines } : p
                              ),
                            }
                          : b
                      )
                    }
                  />
                </div>
              </div>
            ))}

          {contentSubTab === "security" &&
            bundle.securityOffers.map((offer, i) => (
              <div
                key={i}
                className="rounded-xl border border-white/10 bg-card p-6"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                  Offre Sécurité {i + 1}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Nom"
                    value={offer.name}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              securityOffers: b.securityOffers.map((o, idx) =>
                                idx === i ? { ...o, name: v } : o
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <Field
                    label="Prix affiché"
                    value={offer.price}
                    mono
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              securityOffers: b.securityOffers.map((o, idx) =>
                                idx === i ? { ...o, price: v } : o
                              ),
                            }
                          : b
                      )
                    }
                  />
                </div>
                <div className="mt-3 grid gap-3">
                  <Field
                    label="Accroche"
                    value={offer.pitch}
                    onChange={(v) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              securityOffers: b.securityOffers.map((o, idx) =>
                                idx === i ? { ...o, pitch: v } : o
                              ),
                            }
                          : b
                      )
                    }
                  />
                  <LinesField
                    label="Inclus (une ligne par point)"
                    value={offer.features}
                    rows={4}
                    onChange={(lines) =>
                      setBundle((b) =>
                        b
                          ? {
                              ...b,
                              securityOffers: b.securityOffers.map((o, idx) =>
                                idx === i ? { ...o, features: lines } : o
                              ),
                            }
                          : b
                      )
                    }
                  />
                </div>
              </div>
            ))}

          {(contentSubTab === "options" || contentSubTab === "recurring") &&
            bundle[contentSubTab === "options" ? "webOptions" : "recurring"].map(
              (card, i) => {
                const key = contentSubTab === "options" ? "webOptions" : "recurring";
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-white/10 bg-card p-6"
                  >
                    <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-muted-foreground">
                      Service {i + 1}
                    </p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      <Field
                        label="Nom"
                        value={card.name}
                        onChange={(v) =>
                          setBundle((b) =>
                            b
                              ? {
                                  ...b,
                                  [key]: b[key].map((c, idx) =>
                                    idx === i ? { ...c, name: v } : c
                                  ),
                                }
                              : b
                          )
                        }
                      />
                      <Field
                        label="Prix affiché"
                        value={card.price}
                        mono
                        onChange={(v) =>
                          setBundle((b) =>
                            b
                              ? {
                                  ...b,
                                  [key]: b[key].map((c, idx) =>
                                    idx === i ? { ...c, price: v } : c
                                  ),
                                }
                              : b
                          )
                        }
                      />
                    </div>
                    <div className="mt-3">
                      <TextAreaField
                        label="Description"
                        value={card.body}
                        rows={3}
                        onChange={(v) =>
                          setBundle((b) =>
                            b
                              ? {
                                  ...b,
                                  [key]: b[key].map((c, idx) =>
                                    idx === i ? { ...c, body: v } : c
                                  ),
                                }
                              : b
                          )
                        }
                      />
                    </div>
                  </div>
                );
              }
            )}

          {contentSubTab === "works" && (
            <CaseStudiesEditor
              items={bundle.caseStudies}
              onChange={(next) => setBundle((b) => (b ? { ...b, caseStudies: next } : b))}
            />
          )}
        </div>
      )}
    </div>
  );
}
