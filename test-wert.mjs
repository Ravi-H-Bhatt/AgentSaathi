import fs from 'fs';

function itemsToText(items) {
  if (items.length === 0) return '';
  items.sort((a, b) => (b.y - a.y) || (a.x - b.x));
  const Y_TOLERANCE = 3;
  const rows = [];
  let current = [];
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
      row.sort((a, b) => a.x - b.x).map((i) => i.str.trim()).filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
    )
    .filter(Boolean)
    .join('\n');
}

async function run() {
  const buffer = fs.readFileSync('wert.pdf');
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = 'pdfjs-dist/legacy/build/pdf.worker.mjs';
  const pdf = await pdfjs.getDocument({ data: new Uint8Array(buffer), useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  const pageTexts = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const tc = await page.getTextContent();
    const items = [];
    for (const it of tc.items) {
      if (it.str && it.str.trim()) items.push({ x: it.transform[4], y: it.transform[5], str: it.str });
    }
    pageTexts.push(itemsToText(items));
    page.cleanup();
  }
  await pdf.destroy();
  const text = pageTexts.join('\n\n').trim();
  console.log('=== FIRST 1200 CHARS ===');
  console.log(text.substring(0, 1200));
  console.log('\n=== Total length:', text.length, '===');
  fs.writeFileSync('/tmp/wert-extracted.txt', text);
  console.log('Wrote /tmp/wert-extracted.txt');
}

run();
