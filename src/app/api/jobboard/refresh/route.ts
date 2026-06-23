import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { checkPipelineQuota, insertRun } from "@/lib/jobboard";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    // Quota gate (inert unless PIPELINE_QUOTA_ENABLED=true)
    const quota = checkPipelineQuota(userId);
    if (!quota.allowed) {
      return NextResponse.json({ error: quota.reason }, { status: 429 });
    }

    if (!process.env.GH_DISPATCH_TOKEN) {
      return NextResponse.json(
        { error: "Pipeline not configured — GH_DISPATCH_TOKEN not set." },
        { status: 501 }
      );
    }

    if (!process.env.GH_REPO) {
      return NextResponse.json(
        { error: "Pipeline not configured — GH_REPO not set." },
        { status: 501 }
      );
    }

    const portals = ["Adzuna", "LinkedIn"];
    const runId = await insertRun(userId, portals);
    if (!runId) {
      return NextResponse.json(
        { error: "Failed to create pipeline run." },
        { status: 500 }
      );
    }

    // Fire GitHub repository_dispatch
    const ghResp = await fetch(
      `https://api.github.com/repos/${process.env.GH_REPO}/dispatches`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.GH_DISPATCH_TOKEN}`,
          "Content-Type": "application/json",
          "User-Agent": "MazaCV/1.0",
        },
        body: JSON.stringify({
          event_type: "scrape-request",
          client_payload: {
            userId,
            runId,
            email: "",
            track: "PM",
          },
        }),
      }
    );

    if (!ghResp.ok) {
      const body = await ghResp.text().catch(() => "");
      // Don't fail — run is logged; dispatch can be retried
      console.error(`GitHub dispatch failed (${ghResp.status}): ${body.slice(0, 200)}`);
    }

    return NextResponse.json({ runId, status: "queued" }, { status: 202 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to trigger pipeline.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
