import "server-only";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

/**
 * Extract the text layer from a PDF buffer using pdfjs-dist directly.
 *
 * Vercel/serverless fix: Disable worker (use main thread) for maximum compatibility.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-dist
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Disable worker - run in main thread (slower but works everywhere)
    pdfjs.GlobalWorkerOptions.workerSrc = "";

    // Load the PDF document
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });
    
    const pdf = await loadingTask.promise;
    const textParts: string[] = [];

    console.log(`[pdf] Processing ${pdf.numPages} pages...`);

    // Extract text from each page
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      console.log(`[pdf] Page ${pageNum}: ${textContent.items.length} text items`);
      
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
    const result = textParts.join("\n\n").trim();
    console.log(`[pdf] Extracted ${result.length} characters`);
    return result;
  } catch (err) {
    console.error("[pdf] extractPdfText error:", err instanceof Error ? err.message : err);
    if (err instanceof Error) {
      console.error("[pdf] stack:", err.stack);
    }
    return "";
  }
}
