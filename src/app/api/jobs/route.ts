import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { findJobs } from "@/lib/jobs";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await getSessionUser(req);

    const body = await req.json();
    const skills: string[] = body.skills ?? [];
    const location: string | undefined = body.location;

    if (!Array.isArray(skills) || skills.length === 0) {
      return NextResponse.json({ jobs: [] });
    }

    const jobs = await findJobs(skills, location);
    return NextResponse.json({ jobs });
  } catch {
    return NextResponse.json({ jobs: [] });
  }
}
