import { NextResponse } from "next/server";
import { extractText, validateFile } from "@/lib/parse";
import { heuristicParseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await getSessionUser(req);

    const form = await req.formData();
    const file = form.get("resume") as File | null;
    const resumeText = (form.get("resumeText") as string | null) ?? "";

    let text = resumeText;
    if (file && file.size > 0) {
      const invalid = validateFile(file);
      if (invalid) return NextResponse.json({ skills: [] });
      const buffer = Buffer.from(await file.arrayBuffer());
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
  } catch {
    return NextResponse.json({ skills: [] });
  }
}
