import { NextResponse } from "next/server";
import { extractText } from "@/lib/parse";
import { scoreResume } from "@/lib/score";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    const gate = await checkAndConsume(userId, plan, "score");
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const form = await req.formData();
    const file = form.get("resume") as File | null;
    const jd = (form.get("jd") as string | null) ?? "";
    const pastedResume = (form.get("resumeText") as string | null) ?? "";

    if (!jd.trim()) {
      return NextResponse.json(
        { error: "Job description is required." },
        { status: 400 }
      );
    }

    let resumeText = pastedResume;
    if (file && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      resumeText = await extractText(buffer, file.name);
    }

    if (!resumeText.trim()) {
      return NextResponse.json(
        { error: "Upload a resume file or paste resume text." },
        { status: 400 }
      );
    }

    const result = scoreResume(resumeText, jd);
    return NextResponse.json({ ...result, resumeText, remaining: gate.remaining });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scoring failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
