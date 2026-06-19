import { NextResponse } from "next/server";
import { optimizeLinkedIn } from "@/lib/linkedin";
import { scoreResume } from "@/lib/score";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }
    if (plan !== "pro") {
      return NextResponse.json({ error: "Yeh feature sirf Pro users ke liye hai. Upgrade karo!" }, { status: 403 });
    }

    const body = (await req.json()) as {
      about?: string;
      experience?: string;
      targetJd?: string;
    };
    if (!body.targetJd?.trim()) {
      return NextResponse.json({ error: "Target job description required hai." }, { status: 400 });
    }
    if (!body.about?.trim() && !body.experience?.trim()) {
      return NextResponse.json({ error: "LinkedIn About ya Experience to daal do, boss!" }, { status: 400 });
    }

    const about = body.about ?? "";
    const experience = body.experience ?? "";
    const targetJd = body.targetJd;

    const pseudoResume = `About: ${about}\n\nExperience: ${experience}`;
    const scoreResult = scoreResume(pseudoResume, targetJd, "linkedin_india");

    const result = await optimizeLinkedIn(about, experience, targetJd, plan);

    return NextResponse.json({
      ...result,
      score: scoreResult.score,
      matchedKeywords: scoreResult.matchedKeywords,
      missingKeywords: scoreResult.missingKeywords,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "LinkedIn optimization failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
