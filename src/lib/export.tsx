import { renderToBuffer } from "@react-pdf/renderer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "docx";
import type { JsonResume, TemplateId } from "./types";
import { getTemplateComponent, ClassicTemplate } from "./templates";

/** Build a .docx resume from structured JSON Resume data. */
export async function toDocx(resume: JsonResume): Promise<Buffer> {
  const children: Paragraph[] = [];

  // Header: name + contact
  const b = resume.basics;
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      heading: HeadingLevel.TITLE,
      children: [new TextRun({ text: b.name, bold: true, size: 32 })],
    })
  );
  const contactParts = [b.email, b.phone, b.location].filter(Boolean);
  if (contactParts.length > 0) {
    children.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
        children: [new TextRun({ text: contactParts.join(" · "), size: 20 })],
      })
    );
  }

  // Summary
  if (b.summary) {
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: b.summary, size: 20 })],
      })
    );
  }

  // Experience
  for (const w of resume.work) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 40 },
        children: [new TextRun({ text: w.position, bold: true, size: 22 })],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: w.company, size: 20 }),
          new TextRun({
            text: `  —  ${w.startDate} — ${w.endDate || "Present"}`,
            size: 18,
            color: "666666",
          }),
        ],
      })
    );
    for (const h of w.highlights) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [new TextRun({ text: h, size: 20 })],
        })
      );
    }
  }

  // Education
  for (const e of resume.education) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 40 },
        children: [new TextRun({ text: "Education", bold: true, size: 22 })],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 80 },
        children: [
          new TextRun({ text: `${e.studyType} in ${e.area}`, size: 20, bold: true }),
          new TextRun({
            text: `  —  ${e.startDate} — ${e.endDate || "Present"}`,
            size: 18,
            color: "666666",
          }),
        ],
      })
    );
    children.push(
      new Paragraph({
        spacing: { after: 200 },
        children: [new TextRun({ text: e.institution, size: 20 })],
      })
    );
  }

  // Skills
  if (resume.skills.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: "Skills", bold: true, size: 22 })],
      })
    );
    for (const sk of resume.skills) {
      children.push(
        new Paragraph({
          spacing: { after: 40 },
          children: [
            new TextRun({ text: `${sk.name}: `, bold: true, size: 20 }),
            new TextRun({ text: sk.keywords.join(", "), size: 20 }),
          ],
        })
      );
    }
  }

  // Certifications
  if (resume.certifications && resume.certifications.length > 0) {
    children.push(
      new Paragraph({
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 300, after: 120 },
        children: [new TextRun({ text: "Certifications", bold: true, size: 22 })],
      })
    );
    for (const c of resume.certifications) {
      children.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 40 },
          children: [
            new TextRun({ text: c.name, size: 20 }),
            ...(c.issuer ? [new TextRun({ text: ` — ${c.issuer}`, size: 18, color: "666666" })] : []),
          ],
        })
      );
    }
  }

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Legacy plain-text DOCX fallback (for cover letters etc.). */
export async function toDocxLegacy(resumeText: string): Promise<Buffer> {
  const lines = resumeText.split(/\r?\n/);
  const children = lines.map((line) => {
    const trimmed = line.trim();
    const isHeading =
      (trimmed.length > 0 &&
        trimmed.length < 40 &&
        trimmed === trimmed.toUpperCase() &&
        /[A-Z]/.test(trimmed)) ||
      /^[A-Z][A-Za-z ]+:$/.test(trimmed);
    if (isHeading) {
      return new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: trimmed, bold: true })],
      });
    }
    return new Paragraph({ children: [new TextRun(line)] });
  });

  const doc = new Document({ sections: [{ children }] });
  return Buffer.from(await Packer.toBuffer(doc));
}

/** Build a designed PDF resume using @react-pdf/renderer templates. */
export async function renderPdf(
  resume: JsonResume,
  accentColor: string = "#4f46e5"
): Promise<Buffer> {
  const TemplateComponent = ClassicTemplate;
  return await renderToBuffer(
    <TemplateComponent resume={resume} accentColor={accentColor} />
  );
}

export async function renderPdfWithTemplate(
  resume: JsonResume,
  templateId: TemplateId = "classic",
  accentColor: string = "#4f46e5"
): Promise<Buffer> {
  const TemplateComponent = getTemplateComponent(templateId);
  return await renderToBuffer(
    <TemplateComponent resume={resume} accentColor={accentColor} />
  );
}

/** Legacy plain-text PDF export (kept for cover letters etc.). */
export async function toPdfLegacy(resumeText: string): Promise<Buffer> {
  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const margin = 50;
  const fontSize = 10.5;
  const lineHeight = 15;
  const maxWidth = pageWidth - margin * 2;

  let page = pdf.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const rawLines = resumeText.split(/\r?\n/);

  for (const raw of rawLines) {
    const trimmed = raw.trim();
    const isHeading =
      trimmed.length > 0 &&
      trimmed.length < 40 &&
      trimmed === trimmed.toUpperCase() &&
      /[A-Z]/.test(trimmed);
    const useFont = isHeading ? fontBold : font;

    const wrapped = wrapText(trimmed || " ", useFont, fontSize, maxWidth);
    for (const wline of wrapped) {
      if (y < margin) {
        page = pdf.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(wline, {
        x: margin,
        y,
        size: fontSize,
        font: useFont,
        color: rgb(0.1, 0.1, 0.1),
      });
      y -= lineHeight;
    }
  }

  return Buffer.from(await pdf.save());
}

function wrapText(
  text: string,
  font: import("pdf-lib").PDFFont,
  size: number,
  maxWidth: number
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? current + " " + word : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [" "];
}
