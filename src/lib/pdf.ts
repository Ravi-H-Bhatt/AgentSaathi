import "server-only";

/**
 * Extract the text layer from a PDF buffer.
 *
 * Uses `unpdf` — a serverless-native PDF extractor that bundles a worker-free
 * build of pdf.js. This avoids the entire "fake worker"/file-tracing problem
 * that breaks pdfjs-dist inside Vercel lambdas, so the same code path works
 * identically on local dev and on Vercel.
 *
 * Returns the full concatenated text of every page (one stream). Returns an
 * empty string for scanned/image-only PDFs that have no text layer.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const { extractText, getDocumentProxy } = await import("unpdf");

    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const { totalPages, text } = await extractText(pdf, { mergePages: true });

    const merged = Array.isArray(text) ? text.join("\n") : text;
    const result = (merged ?? "").trim();
    console.log(`[pdf] unpdf extracted ${result.length} chars from ${totalPages} pages`);
    return result;
  } catch (err) {
    console.error("[pdf] extractPdfText error:", err instanceof Error ? err.message : err);
    if (err instanceof Error) console.error("[pdf] stack:", err.stack);
    return "";
  }
}
