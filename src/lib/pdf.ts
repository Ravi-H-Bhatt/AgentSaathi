import "server-only";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Extract the text layer from a PDF buffer using pdfjs-dist directly.
 *
 * Vercel/serverless fix: Use CDN-hosted worker for reliable serverless operation.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-dist
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Use CDN-hosted worker - this works reliably in serverless environments
    // Version must match the installed pdfjs-dist version (5.4.296)
    pdfjs.GlobalWorkerOptions.workerSrc = 
      "https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/legacy/build/pdf.worker.min.mjs";

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
    });
    
    const pdf = await loadingTask.promise;
    const textParts: string[] = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Group text items by line (Y-coordinate) to preserve line structure
      const lines: Map<number, string[]> = new Map();
      
      for (const item of textContent.items) {
        if ("str" in item && item.str.trim()) {
          // Use Y-coordinate (transform[5]) as line identifier
          const y = Math.round(item.transform[5]);
          if (!lines.has(y)) {
            lines.set(y, []);
          }
          lines.get(y)!.push(item.str);
        }
      }
      
      // Sort lines by Y-coordinate (top to bottom) and join
      const sortedLines = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([_, parts]) => parts.join(" ").trim())
        .filter(line => line);
      
      textParts.push(sortedLines.join("\n"));
      page.cleanup();
    }

    await pdf.destroy();
    return textParts.join("\n\n").trim();
  } catch (err) {
    console.error("[pdf] extractPdfText error:", err instanceof Error ? err.message : err);
    if (err instanceof Error) {
      console.error("[pdf] stack:", err.stack);
    }
    return "";
  }
}
