import { NextResponse } from "next/server";
import { extractText, validateFile, validateContent } from "@/lib/parse";
import { heuristicParseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

function getIp(req: Request): string {
  return req.headers.get("cf-connecting-ip")
    || req.headers.get("x-real-ip")
    || req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "127.0.0.1";
}

export async function POST(req: Request) {
  try {
    const { userId } = await getSessionUser(req);
    if (!userId) {
      return NextResponse.json({ error: "Please log in first." }, { status: 401 });
    }

    const rl = await checkRateLimit(getIp(req), userId);
    if (!rl.allowed) {
      return NextResponse.json({ error: "Bahut ho gaya, thoda ruk!" }, { status: 429 });
    }

    const form = await req.formData();
    const file = form.get("resume") as File | null;
    const resumeText = (form.get("resumeText") as string | null) ?? "";

    let text = resumeText;
    if (file && file.size > 0) {
      const invalid = validateFile(file);
      if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });
      const buffer = Buffer.from(await file.arrayBuffer());
      const badContent = validateContent(buffer, file.name);
      if (badContent) return NextResponse.json({ error: badContent }, { status: 400 });
      text = await extractText(buffer, file.name);
    }

    if (!text.trim()) {
      return NextResponse.json({ skills: [] });
    }

    const parsed = heuristicParseResume(text);
    const skills = [
      ...new Set(
        (parsed.skills ?? [])
          .flatMap((s) => [s.name, ...(s.keywords ?? [])])
          .map((s) => s.toLowerCase().trim())
          .filter(Boolean)
      ),
    ];

    return NextResponse.json({ skills });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to extract skills.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
