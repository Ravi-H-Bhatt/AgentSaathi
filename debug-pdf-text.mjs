import * as fs from 'fs';
import { extractText, getDocumentProxy } from 'unpdf';

async function debug() {
  const buffer = fs.readFileSync('07-2026.pdf');
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  const fullText = (Array.isArray(text) ? text.join('\n') : text ?? '').trim();

  // Show full text for debugging
  console.log('=== FULL EXTRACTED TEXT ===\n');
  console.log(fullText);
  console.log('\n=== END ===\n');

  // Check specific patterns
  console.log('PATTERN CHECKS:');
  console.log('Policy numbers found:', fullText.match(/\d{10,}[A-Z]\d{8}/gi));
  console.log('Has "POLICY":', fullText.includes('POLICY'));
  console.log('Has "FAMILY":', fullText.includes('FAMILY'));
  console.log('Has "MEDICARE":', fullText.includes('MEDICARE'));
}

debug().catch(console.error);
