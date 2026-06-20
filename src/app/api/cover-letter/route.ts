import { NextResponse } from "next/server";
import { generateCoverLetter } from "@/lib/coverletter";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume, refundUsage } from "@/lib/usage";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, plan, credits } = await getSessionUser(req);

    const { resumeText, jd } = (await req.json()) as {
      resumeText?: string;
      jd?: string;
    };
    // Validate input BEFORE consuming quota, so a bad request never burns a credit.
    if (!resumeText?.trim() || !jd?.trim()) {
      return NextResponse.json(
        { error: "resumeText and jd are required." },
        { status: 400 }
      );
    }

    const gate = await checkAndConsume(userId, plan, "cover-letter", credits);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    let result;
    try {
      result = await generateCoverLetter(resumeText, jd, plan);
    } catch (aiErr) {
      await refundUsage(userId, "cover-letter");
      throw aiErr;
    }

    return NextResponse.json({
      ...result,
      remaining: gate.remaining,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Cover letter generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
