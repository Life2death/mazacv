import { NextResponse } from "next/server";
import { toDocx, toPdf } from "@/lib/export";
import { getSessionUser } from "@/lib/auth";
import { checkAndConsume } from "@/lib/usage";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { userId, plan } = await getSessionUser(req);
    const gate = await checkAndConsume(userId, plan, "export");
    if (!gate.allowed) {
      return NextResponse.json({ error: gate.reason }, { status: 402 });
    }

    const { resumeText, format } = (await req.json()) as {
      resumeText?: string;
      format?: "pdf" | "docx";
    };
    if (!resumeText?.trim()) {
      return NextResponse.json({ error: "resumeText is required." }, { status: 400 });
    }

    if (format === "pdf") {
      const buf = await toPdf(resumeText);
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
