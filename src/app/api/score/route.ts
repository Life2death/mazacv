import { NextResponse } from "next/server";
import { extractText, validateFile } from "@/lib/parse";
import { scoreResume } from "@/lib/score";
import { heuristicParseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";
import { checkRateLimit } from "@/lib/rate-limit";
import type { Portal } from "@/lib/types";

export const runtime = "nodejs";

function getIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || req.headers.get("x-real-ip")
    || "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const { userId, plan, credits } = await getSessionUser(req);

    const rl = checkRateLimit(getIp(req), userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Bahut ho gaya, thoda ruk! Limit hit kar diya." }, { status: 429 });
    }

    const gate = await checkAndConsume(userId, plan, "score", credits);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const form = await req.formData();
    const file = form.get("resume") as File | null;
    const jd = (form.get("jd") as string | null) ?? "";
    const pastedResume = (form.get("resumeText") as string | null) ?? "";
    const portal = (form.get("portal") as Portal) ?? "generic";

    if (!jd.trim()) {
      return NextResponse.json(
        { error: "Job description is required." },
        { status: 400 }
      );
    }

    let resumeText = pastedResume;
    if (file && file.size > 0) {
      const invalid = validateFile(file);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      resumeText = await extractText(buffer, file.name);
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Upload a resume file or paste resume text." },
        { status: 400 }
      );
    }

    const result = scoreResume(resumeText, jd, portal);
    const parsedResume = heuristicParseResume(resumeText);
    return NextResponse.json({ ...result, resumeText, parsedResume, remaining: gate.remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
