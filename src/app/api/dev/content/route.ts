import { NextResponse } from "next/server";
import { bundleSchema, describeBundleIssue } from "@/lib/content-schema";
import { getContentBundleFresh, saveContentBundle } from "@/lib/content";
import { isAuthorized } from "@/lib/dev-auth";
import { checkLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function guard(request: Request): NextResponse | null {
  if (isAuthorized(request)) return null;
  return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });
}

export async function GET(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const limit = checkLimit(request, "dev-content");
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const bundle = await getContentBundleFresh();
  return NextResponse.json(
    { ok: true, bundle },
    { headers: { "Cache-Control": "no-store" } }
  );
}

export async function PUT(request: Request) {
  const denied = guard(request);
  if (denied) return denied;

  const limit = checkLimit(request, "dev-content");
  if (!limit.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de requêtes." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  try {
    const body = await request.json();
    const parsed = bundleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: describeBundleIssue(parsed.error) },
        { status: 400 }
      );
    }
    await saveContentBundle(parsed.data);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/dev/content]", err);
    return NextResponse.json(
      { ok: false, error: "Erreur serveur. Réessayez dans un instant." },
      { status: 500 }
    );
  }
}
