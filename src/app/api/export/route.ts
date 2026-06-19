import { NextResponse } from "next/server";
import { toDocx, renderPdfWithTemplate, toPdfLegacy } from "@/lib/export";
import { parseResume } from "@/lib/resume-parser";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";
import type { TemplateId } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    const gate = await checkAndConsume(userId, plan, "export");
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const body = (await req.json()) as {
      resumeText?: string;
      format?: "pdf" | "docx";
      templateId?: TemplateId;
      accentColor?: string;
      isCoverLetter?: boolean;
    };
    const { format = "pdf", templateId = "classic", accentColor = "#4f46e5", isCoverLetter } = body;
    const resumeText = body.resumeText;
    if (!resumeText?.trim()) {
      return NextResponse.json({ error: "resumeText is required." }, { status: 400 });
    }

    if (format === "pdf") {
      let buf: Buffer;
      if (isCoverLetter) {
        // Cover letters use the legacy plain-text PDF
        buf = await toPdfLegacy(resumeText);
      } else {
        // Resume PDF: parse into JSON Resume + render with template
        const parsed = await parseResume(resumeText);
        buf = await renderPdfWithTemplate(parsed, templateId, accentColor);
      }
      return new NextResponse(new Uint8Array(buf), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="resume.pdf"',
        },
      });
    }

    const buf = await toDocx(resumeText);
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
