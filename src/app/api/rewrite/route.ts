import { NextResponse } from "next/server";
import { rewriteResume } from "@/lib/rewrite";
import { scoreResume } from "@/lib/score";
import { heuristicParseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    const gate = await checkAndConsume(userId, plan, "rewrite");
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
    const rewritten = await rewriteResume(resumeText, jd, before.missingKeywords);
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
