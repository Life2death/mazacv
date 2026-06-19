import { renderToBuffer } from "@react-pdf/renderer";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
} from "docx";
import type { JsonResume, TemplateId } from "./types";
import { getTemplateComponent, ClassicTemplate } from "./templates";

/** Build a .docx resume from plain text (one line per paragraph). */
export async function toDocx(resumeText: string): Promise<Buffer> {
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
