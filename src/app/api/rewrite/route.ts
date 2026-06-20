import { NextResponse } from "next/server";
import { rewriteResume } from "@/lib/rewrite";
import { scoreResume } from "@/lib/score";
import { heuristicParseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const maxDuration = 60;

function getIp(req: Request): string {
  // Prefer the platform's trusted client-IP header; raw x-forwarded-for is
  // attacker-controlled and only safe as a last-resort fallback.
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const { userId, plan, credits } = await getSessionUser(req);

    const rl = checkRateLimit(getIp(req), userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Bahut ho gaya, thoda ruk!" }, { status: 429 });
    }

    const gate = await checkAndConsume(userId, plan, "rewrite", credits);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const { resumeText, jd } = (await req.json()) as {
      resumeText?: string;
      jd?: string;
    };
    if (!resumeText?.trim() || !jd?.trim()) {
      return NextResponse.json(
        { error: "resumeText and jd are required." },
        { status: 400 }
      );
    }

    const before = scoreResume(resumeText, jd);
    const rewritten = await rewriteResume(resumeText, jd, before.missingKeywords, plan);
    const after = scoreResume(rewritten.resume, jd);

    const parsedResume = heuristicParseResume(rewritten.resume);

    return NextResponse.json({
      ...rewritten,
      scoreBefore: before.score,
      scoreAfter: after.score,
      parsedResume,
      remaining: gate.remaining,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Rewrite failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
