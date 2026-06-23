import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { listJobs, type JobFilters } from "@/lib/jobboard";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const url = new URL(req.url);
    const filters: JobFilters = {};
    if (url.searchParams.get("portal")) filters.portal = url.searchParams.get("portal")!;
    if (url.searchParams.get("status")) filters.status = url.searchParams.get("status")!;
    if (url.searchParams.get("freshness")) filters.freshness = url.searchParams.get("freshness")!;
    if (url.searchParams.get("q")) filters.q = url.searchParams.get("q")!;
    const minFit = url.searchParams.get("minFit");
    if (minFit) filters.minFit = Number(minFit);

    const jobs = await listJobs(userId, filters);
    return NextResponse.json({ jobs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch jobs.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
