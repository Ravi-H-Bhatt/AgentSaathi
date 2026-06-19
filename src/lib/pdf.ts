import "server-only";

/**
 * Extract the text layer from a PDF buffer using pdfjs-dist directly.
 *
 * Vercel/serverless fix: We use pdfjs-dist directly (not via pdf-parse) and
 * disable the worker. In Node.js/serverless, pdfjs runs perfectly fine in-thread
 * without a worker. This avoids all worker-path bundling issues.
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    // Import pdfjs-dist
    const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
    
    // Disable worker - use the built-in worker file path but disable worker fetch
    pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

    // Load the PDF document with options that work in serverless
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
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
