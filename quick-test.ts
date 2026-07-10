import { readFileSync } from 'fs';
import { parseERegister } from './src/lib/eregister-parser';
import { homedir } from 'os';
import { join } from 'path';

async function test() {
  const buffer = readFileSync(join(homedir(), 'Downloads', 'example_compressed.pdf'));
  const policies = await parseERegister(buffer);
  console.log(`Extracted: ${policies.length} policies`);
  console.log(`Expected: 840 rows`);
  console.log(`Match: ${policies.length === 840 ? '✅' : '❌'}`);
}
test().catch(console.error);
