import mammoth from "mammoth";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIMES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export function validateFile(file: { size: number; type: string; name: string }): string | null {
  if (file.size === 0) return "File khaali hai — koi content nahi.";
  if (file.size > MAX_FILE_SIZE) return "File 10 MB se bada hai — chhota file daal na, boss!";
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!ext || !["pdf", "docx", "txt"].includes(ext)) {
    return "Sirf PDF, DOCX, ya TXT file upload kar sakte ho.";
  }
  if (file.type && file.type !== "" && !ALLOWED_MIMES.includes(file.type)) {
    return "File type sahi nahi hai — PDF, DOCX, ya TXT daal.";
  }
  return null;
}

/**
 * Extract plain text from an uploaded resume file (PDF or DOCX).
 * Runs server-side only (Node runtime) because unpdf/mammoth need Buffers.
 *
 * PDF parsing uses unpdf (a serverless build of Mozilla's pdf.js). It throws
 * typed errors (e.g. InvalidPDFException) on malformed input rather than hanging,
 * which matters because this path handles untrusted uploads.
 */
export async function extractText(
  buffer: Buffer,
  filename: string
): Promise<string> {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".pdf")) {
    // Lazy-import keeps the pdf.js build out of the client/edge bundle.
    const { extractText: pdfExtractText, getDocumentProxy } = await import("unpdf");
    try {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await pdfExtractText(pdf, { mergePages: true });
      return text;
    } catch {
      // Normalize pdf.js's internal exception types into a user-facing message.
      throw new Error("PDF padha nahi ja saka — file corrupt ya password-protected ho sakti hai.");
    }
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
