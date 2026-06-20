import fs from 'fs';

async function testPdf() {
  try {
    console.log('Loading PDF...');
    const buffer = fs.readFileSync('wert.pdf');
    console.log('PDF size:', buffer.length, 'bytes');
    
    // Import pdfjs-dist
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    
    // Point to worker in node_modules
    const workerPath = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
    pdfjs.GlobalWorkerOptions.workerSrc = workerPath;

    console.log('Loading PDF document...');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
    });
    
    const pdf = await loadingTask.promise;
    console.log('Pages:', pdf.numPages);
    
    const textParts = [];

    // Extract text from each page
    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 2); pageNum++) {
      console.log('Extracting page', pageNum);
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      console.log('Text items on page', pageNum + ':', textContent.items.length);
      
      // Group text items by line
      const lines = new Map();
      
      for (const item of textContent.items) {
        if (item.str && item.str.trim()) {
          const y = Math.round(item.transform[5]);
          if (!lines.has(y)) {
            lines.set(y, []);
          }
          lines.get(y).push(item.str);
        }
      }
      
      const sortedLines = Array.from(lines.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([_, parts]) => parts.join(' ').trim())
        .filter(line => line);
      
      textParts.push(sortedLines.join('\n'));
      page.cleanup();
    }

    await pdf.destroy();
    
    const fullText = textParts.join('\n\n').trim();
    console.log('\n=== EXTRACTED TEXT (first 1000 chars) ===');
    console.log(fullText.substring(0, 1000));
    console.log('\n=== Total length:', fullText.length, 'characters ===');
    
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error('Stack:', err.stack);
  }
}

testPdf();
