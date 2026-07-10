import { readFileSync, readdirSync } from 'fs';
import { parseNewIndiaRegisterFast } from './src/lib/newindia-fast';
import { homedir } from 'os';
import { join } from 'path';

async function searchHarshal() {
  const downloadDir = join(homedir(), 'Downloads');
  const files = readdirSync(downloadDir).filter(f => f.startsWith('NEW ') && f.endsWith('.pdf')).sort();
  
  console.log(`Searching for "HARSHAL" in ${files.length} PDFs\n`);
  
  let totalHarshal = 0;
  const harshalPolicies: any[] = [];
  
  for (const filename of files) {
    const pdfPath = join(downloadDir, filename);
    
    try {
      const buffer = readFileSync(pdfPath);
      const policies = await parseNewIndiaRegisterFast(buffer);
      
      const harshalInFile = policies.filter(p => 
        p.client_name?.toUpperCase().includes('HARSHAL')
      );
      
      if (harshalInFile.length > 0) {
        console.log(`📄 ${filename}: ${harshalInFile.length} policies`);
        harshalInFile.forEach(p => {
          console.log(`   ✓ ${p.client_name} - ${p.policy_type} - ${p.policy_number}`);
          harshalPolicies.push({
            file: filename,
            name: p.client_name,
            type: p.policy_type,
            number: p.policy_number,
            date: p.renewal_date
          });
        });
        totalHarshal += harshalInFile.length;
      }
      
    } catch (error: any) {
      console.error(`❌ Error processing ${filename}: ${error.message}`);
    }
  }
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`TOTAL HARSHAL POLICIES: ${totalHarshal}`);
  console.log('='.repeat(80));
  
  if (totalHarshal > 0) {
    console.log('\nUNIQUE NAMES:');
    const uniqueNames = new Set(harshalPolicies.map(p => p.name));
    uniqueNames.forEach(name => {
      const count = harshalPolicies.filter(p => p.name === name).length;
      console.log(`  • ${name}: ${count} ${count === 1 ? 'policy' : 'policies'}`);
    });
  }
}

searchHarshal().catch(console.error);
