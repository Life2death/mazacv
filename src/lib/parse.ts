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
 * Verify the file's actual content matches its claimed type via magic bytes.
 * Extension and client-sent MIME are both trivially spoofable, so this is the
 * real gate before we hand bytes to pdf-parse / mammoth. Call with the buffer.
 */
export function validateContent(buffer: Buffer, filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    // PDF must start with "%PDF-"
    if (buffer.subarray(0, 5).toString("latin1") !== "%PDF-") {
      return "Yeh valid PDF nahi lag raha — file corrupt ya galat hai.";
    }
  } else if (ext === "docx") {
    // DOCX is a ZIP container: "PK\x03\x04"
    if (buffer.subarray(0, 4).toString("latin1") !== "PK\x03\x04") {
      return "Yeh valid DOCX nahi lag raha — file corrupt ya galat hai.";
    }
  } else if (ext === "txt") {
    // Reject content with NUL bytes (binary masquerading as text)
    if (buffer.subarray(0, 8192).includes(0x00)) {
      return "TXT file me binary data hai — plain text daal.";
    }
  }
  return null;
}

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
