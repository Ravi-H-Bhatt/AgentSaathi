import "server-only";

interface PdfItem {
  x: number;
  y: number;
  str: string;
}

/**
 * Extract the text layer from a PDF buffer using pdfjs-dist.
 *
 * Serverless-safe: worker disabled (runs on the main thread), no filesystem or
 * CDN dependencies. Items are clustered into visual rows by Y with a tolerance
 * and ordered left-to-right by X so column order is preserved (critical for the
 * policy-register parser, where Policy No. is the 2nd column).
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");

    // pdfjs-dist is a serverExternalPackage, so this module path resolves to the
    // real file inside node_modules on both local and Vercel serverless.
    pdfjs.GlobalWorkerOptions.workerSrc = "pdfjs-dist/legacy/build/pdf.worker.mjs";

    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    const pageTexts: string[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();

      const items: PdfItem[] = [];
      for (const item of textContent.items) {
        if ("str" in item && item.str.trim()) {
          items.push({
            x: item.transform[4],
            y: item.transform[5],
            str: item.str,
          });
        }
      }

      pageTexts.push(itemsToText(items));
      page.cleanup();
    }

    await pdf.destroy();
    const result = pageTexts.join("\n\n").trim();
    console.log(`[pdf] extracted ${result.length} chars from ${pdf.numPages} pages`);
    return result;
  } catch (err) {
    console.error("[pdf] extractPdfText error:", err instanceof Error ? err.message : err);
    if (err instanceof Error) console.error("[pdf] stack:", err.stack);
    return "";
  }
}

/**
 * Cluster items into rows by Y (top → bottom) with a small tolerance, then
 * order each row left → right by X. This keeps table columns in their visual
 * order even when cells have slightly different baselines.
 */
function itemsToText(items: PdfItem[]): string {
  if (items.length === 0) return "";

  // Sort top-to-bottom (PDF Y grows upward, so descending), then left-to-right.
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x));

  const Y_TOLERANCE = 3; // points; cells on the same visual row vary slightly
  const rows: PdfItem[][] = [];
  let current: PdfItem[] = [];
  let rowY = items[0].y;

  for (const item of items) {
    if (Math.abs(item.y - rowY) <= Y_TOLERANCE) {
      current.push(item);
    } else {
      rows.push(current);
      current = [item];
      rowY = item.y;
    }
  }
  if (current.length) rows.push(current);

  return rows
    .map((row) =>
      row
        .sort((a, b) => a.x - b.x)
        .map((i) => i.str.trim())
        .filter(Boolean)
        .join(" ")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter(Boolean)
    .join("\n");
}
