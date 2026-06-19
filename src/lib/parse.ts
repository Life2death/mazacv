import mammoth from "mammoth";

/**
 * Extract plain text from an uploaded resume file (PDF or DOCX).
 * Runs server-side only (Node runtime) because pdf-parse/mammoth need Buffers.
 */
export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    // Lazy-require keeps pdf-parse out of the client/edge bundle.
    const pdfParse = (await import("pdf-parse")).default;
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (lower.endsWith(".docx")) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (lower.endsWith(".txt")) {
    return buffer.toString("utf-8");
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT resume.");
}
