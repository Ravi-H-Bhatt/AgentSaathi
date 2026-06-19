import "server-only";

/**
 * Extract the text layer from a PDF buffer using pdf-parse v2's class API.
 * Returns the extracted text (may be empty for scanned/image-only PDFs).
 * Uses a dynamic import so the heavy pdfjs dependency only loads at runtime.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return (result.text || "").trim();
    } finally {
      await parser.destroy();
    }
  } catch {
    return "";
  }
}
