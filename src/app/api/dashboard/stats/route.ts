import { NextResponse } from "next/server";
import { db, getDbInfo } from "@/lib/db";
import { isAuthorized } from "@/lib/dev-auth";
import { ensureMonitorStarted, getMonitorRuntimeStatus } from "@/lib/monitor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RangeKey = "24h" | "7d" | "30d";

const PAGE_LABELS: Record<string, string> = {
  "/": "Accueil",
  "/web": "Pôle Web",
  "/security": "Pôle Sécurité",
  "/methode": "La Méthode",
  "/tarifs": "Tarifs",
  "/contact": "Contact",
  "/mentions-legales": "Mentions légales",
  "/confidentialite": "Confidentialité",
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: "Ordinateur",
  mobile: "Mobile",
  tablet: "Tablette",
};

const SUBJECT_LABELS: Record<string, string> = {
  web: "Site web",
  security: "Cybersécurité",
  both: "Site + sécurité",
};

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    await ensureMonitorStarted();

    const url = new URL(request.url);
    const rangeParam = url.searchParams.get("range");
    const range: RangeKey =
      rangeParam === "24h" || rangeParam === "30d" ? rangeParam : "7d";

    const now = Date.now();
    const durationMs =
      range === "24h"
        ? 24 * 3600_000
        : range === "30d"
          ? 30 * 24 * 3600_000
          : 7 * 24 * 3600_000;
    const since = new Date(now - durationMs);
    const since24h = new Date(now - 24 * 3600_000);

    const [
      totalViews,
      views24h,
      periodViewsRows,
      totalLeads,
      allLeads,
      recentPings,
    ] = await Promise.all([
      db.pageView.count(),
      db.pageView.count({ where: { createdAt: { gte: since24h } } }),
      db.pageView.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "asc" },
        take: 25_000,
      }),
      db.contactRequest.count(),
      db.contactRequest.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      db.monitorPingLog.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: "desc" },
        take: 500,
      }),
    ]);

    const periodViews = periodViewsRows.length;
    const uniqueVisitors = new Set(periodViewsRows.map((v) => v.visitorHash)).size;
    const periodLeads = allLeads.filter(
      (l) => l.createdAt.getTime() >= since.getTime()
    ).length;

    const conversionRate =
      uniqueVisitors > 0
        ? Math.round((periodLeads / uniqueVisitors) * 1000) / 10
        : 0;

    // Disponibilité & latence sur la période
    const okPings = recentPings.filter((p) => p.ok).length;
    const uptimePercent =
      recentPings.length > 0
        ? Math.round((okPings / recentPings.length) * 1000) / 10
        : 100;
    const avgLatencyMs =
      recentPings.length > 0
        ? Math.round(
            recentPings.reduce((acc, p) => acc + p.latencyMs, 0) / recentPings.length
          )
        : 0;

    // Courbe temporelle (24 tranches horaires en 24h, sinon tranches journalières)
    const timeline: { label: string; views: number; visitors: number }[] = [];
    if (range === "24h") {
      const buckets: { start: number; label: string; views: number; hashes: Set<string> }[] =
        [];
      const currentHour = new Date(now);
      currentHour.setMinutes(0, 0, 0);
      for (let i = 23; i >= 0; i--) {
        const ts = currentHour.getTime() - i * 3600_000;
        const label = new Date(ts).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        });
        buckets.push({ start: ts, label, views: 0, hashes: new Set() });
      }
      for (const v of periodViewsRows) {
        const t = v.createdAt.getTime();
        const idx = Math.floor((t - buckets[0]!.start) / 3600_000);
        if (idx >= 0 && idx < buckets.length) {
          buckets[idx]!.views += 1;
          buckets[idx]!.hashes.add(v.visitorHash);
        }
      }
      for (const b of buckets) {
        timeline.push({ label: b.label, views: b.views, visitors: b.hashes.size });
      }
    } else {
      const days = range === "30d" ? 30 : 7;
      const buckets: { start: number; label: string; views: number; hashes: Set<string> }[] =
        [];
      const today = new Date(now);
      today.setHours(0, 0, 0, 0);
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 86_400_000);
        const label = d.toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "short",
        });
        buckets.push({ start: d.getTime(), label, views: 0, hashes: new Set() });
      }
      for (const v of periodViewsRows) {
        const t = v.createdAt.getTime();
        const idx = Math.floor((t - buckets[0]!.start) / 86_400_000);
        if (idx >= 0 && idx < buckets.length) {
          buckets[idx]!.views += 1;
          buckets[idx]!.hashes.add(v.visitorHash);
        }
      }
      for (const b of buckets) {
        timeline.push({ label: b.label, views: b.views, visitors: b.hashes.size });
      }
    }

    // Pages les plus visitées
    const byPage = new Map<string, number>();
    const byDevice = new Map<string, number>();
    const byBrowser = new Map<string, number>();
    const byReferrer = new Map<string, number>();

    for (const v of periodViewsRows) {
      byPage.set(v.path, (byPage.get(v.path) ?? 0) + 1);
      byDevice.set(v.device, (byDevice.get(v.device) ?? 0) + 1);
      byBrowser.set(v.browser, (byBrowser.get(v.browser) ?? 0) + 1);
      const ref = v.referrer || "Accès direct";
      byReferrer.set(ref, (byReferrer.get(ref) ?? 0) + 1);
    }

    const denom = Math.max(1, periodViews);

    const topPages = [...byPage.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([path, views]) => ({
        path,
        label: PAGE_LABELS[path] ?? path,
        views,
        share: Math.round((views / denom) * 100),
      }));

    const devices = (["desktop", "mobile", "tablet"] as const).map((d) => {
      const count = byDevice.get(d) ?? 0;
      return {
        device: d,
        label: DEVICE_LABELS[d] ?? d,
        count,
        share: periodViews > 0 ? Math.round((count / denom) * 100) : 0,
      };
    });

    const browsers = [...byBrowser.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([browser, count]) => ({
        browser,
        count,
        share: Math.round((count / denom) * 100),
      }));

    const referrers = [...byReferrer.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([source, count]) => ({
        source,
        count,
        share: Math.round((count / denom) * 100),
      }));

    const leadsBySubject = (["web", "security", "both"] as const).map((s) => ({
      subject: s,
      label: SUBJECT_LABELS[s] ?? s,
      count: allLeads.filter((l) => l.subject === s).length,
    }));

    const monitorRuntime = getMonitorRuntimeStatus();

    return NextResponse.json(
      {
        ok: true,
        range,
        summary: {
          totalViews,
          views24h,
          periodViews,
          uniqueVisitors,
          totalLeads,
          periodLeads,
          conversionRate,
          uptimePercent,
          avgLatencyMs,
          checksCount: recentPings.length,
          serverUptimeSec: monitorRuntime.uptimeSeconds,
        },
        database: await getDbInfo(),
        timeline,
        topPages,
        devices,
        browsers,
        referrers,
        leadsBySubject,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("[/api/dashboard/stats]", err);
    return NextResponse.json(
      { ok: false, error: "Impossible de charger les statistiques." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
  }

  try {
    await db.pageView.deleteMany();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/dashboard/stats DELETE]", err);
    return NextResponse.json(
      { ok: false, error: "Réinitialisation impossible." },
      { status: 500 }
    );
  }
}
