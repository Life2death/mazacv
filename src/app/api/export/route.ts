import { NextResponse } from "next/server";
import { toDocx, toDocxLegacy, renderPdfWithTemplate, toPdfLegacy } from "@/lib/export";
import { parseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";
import type { TemplateId, JsonResume } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, plan, credits } = await getSessionUser(req);
    const gate = await checkAndConsume(userId, plan, "export", credits);
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const body = (await req.json()) as {
      resumeText?: string;
      parsedResume?: JsonResume;
      format?: "pdf" | "docx";
      templateId?: TemplateId;
      accentColor?: string;
      isCoverLetter?: boolean;
    };
    const { format = "pdf", templateId = "classic", accentColor = "#4f46e5", isCoverLetter, parsedResume } = body;
    const resumeText = body.resumeText;
    if (!resumeText?.trim()) {
      return NextResponse.json({ error: "resumeText is required." }, { status: 400 });
    }

    // Resolve the JSON Resume once — reuse for both PDF and DOCX.
    // If the client already parsed it (saved from score/rewrite), skip the Claude call.
    const resume: JsonResume = parsedResume ?? await parseResume(resumeText, plan);

    if (format === "pdf") {
      let buf: Buffer;
      if (isCoverLetter) {
        buf = await toPdfLegacy(resumeText);
      } else {
        buf = await renderPdfWithTemplate(resume, templateId, accentColor);
      }
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="resume.pdf"',
        },
      });
    }

    // DOCX: use structured JSON Resume for resumes, legacy for cover letters
    const buf = isCoverLetter ? await toDocxLegacy(resumeText) : await toDocx(resume);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": 'attachment; filename="resume.docx"',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
