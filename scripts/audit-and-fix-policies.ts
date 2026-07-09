#!/usr/bin/env tsx
/**
 * Audit and fix policy database issues:
 * 1. Find all PDFs in uploaded directories
 * 2. Extract policies from each PDF
 * 3. Compare with database to find missing policies
 * 4. Optionally add missing policies to database
 * 5. Report statistics and discrepancies
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { parseNewIndiaRegister, looksLikeNewIndiaRegister } from '../src/lib/newindia';
import { parseLICRegister, looksLikeLICRegister } from '../src/lib/register';
import pdf from 'pdf-parse';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExtractedPolicy {
  policy_number: string;
  client_name: string | null;
  client_phone: string | null;
  start_date: string | null;
  renewal_date: string | null;
  policy_type: string | null;
  mode: string | null;
  premium: number | null;
  sum_insured: number | null;
  source_file: string;
}

interface DatabasePolicy {
  id: string;
  policy_number: string;
  agent_id: string;
  client_id: string;
  premium: number | null;
  sum_insured: number | null;
  renewal_date: string | null;
}

async function findPDFs(dir: string): Promise<string[]> {
  const pdfs: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Recursively search subdirectories
        pdfs.push(...await findPDFs(fullPath));
      } else if (item.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  } catch (err) {
    console.error(`Error reading directory ${dir}:`, err);
  }
  
  return pdfs;
}

async function extractPoliciesFromPDF(filePath: string): Promise<ExtractedPolicy[]> {
  try {
    console.log(`\n📄 Processing: ${filePath}`);
    const buffer = readFileSync(filePath);
    const data = await pdf(buffer);
    const text = data.text;
    
    let rows: any[] = [];
    
    // Detect PDF type and parse accordingly
    if (looksLikeNewIndiaRegister(text)) {
      console.log('   Detected: New India Assurance register');
      rows = parseNewIndiaRegister(text);
    } else if (looksLikeLICRegister(text)) {
      console.log('   Detected: LIC Agent Register');
      rows = parseLICRegister(text);
    } else {
      console.log('   ⚠️  Unknown PDF format - skipping');
      return [];
    }
    
    // Convert to ExtractedPolicy format
    const policies: ExtractedPolicy[] = rows
      .filter(r => r.policy_number && r.client_name) // Only include valid policies
      .map(r => ({
        policy_number: r.policy_number!,
        client_name: r.client_name,
        client_phone: r.client_phone,
        start_date: r.start_date,
        renewal_date: r.renewal_date,
        policy_type: r.policy_type,
        mode: r.mode,
        premium: r.premium,
        sum_insured: r.sum_insured,
        source_file: filePath,
      }));
    
    console.log(`   ✓ Extracted ${policies.length} valid policies (${rows.length - policies.length} skipped due to missing data)`);
    
    return policies;
  } catch (err) {
    console.error(`   ✗ Error processing ${filePath}:`, err);
    return [];
  }
}

async function getDatabasePolicies(agentId?: string): Promise<DatabasePolicy[]> {
  let query = supabase
    .from('policies')
    .select('id, policy_number, agent_id, client_id, premium, sum_insured, renewal_date');
  
  if (agentId) {
    query = query.eq('agent_id', agentId);
  }
  
  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching policies from database:', error);
    return [];
  }
  
  return data || [];
}

async function getAgents() {
  const { data, error } = await supabase
    .from('agents')
    .select('id, email, name, role');
  
  if (error) {
    console.error('Error fetching agents:', error);
    return [];
  }
  
  return data || [];
}

function formatCurrency(amount: number | null): string {
  if (!amount) return '₹0';
  return `₹${amount.toLocaleString('en-IN')}`;
}

async function main() {
  console.log('🔍 Starting policy database audit...\n');
  
  // Get all agents
  const agents = await getAgents();
  console.log(`Found ${agents.length} agents in database\n`);
  
  // Prompt for which agent to audit (or all)
  const targetAgentId = process.env.AGENT_ID; // Can be set via environment variable
  
  // Get all policies from database
  const dbPolicies = await getDatabasePolicies(targetAgentId);
  console.log(`📊 Database contains ${dbPolicies.length} policies\n`);
  
  // Find all PDFs (check common upload directories)
  const uploadDirs = [
    './uploads',
    './public/uploads',
    '/tmp/uploads',
    process.env.UPLOAD_DIR,
  ].filter(Boolean) as string[];
  
  let allPDFs: string[] = [];
  for (const dir of uploadDirs) {
    try {
      const pdfs = await findPDFs(dir);
      allPDFs.push(...pdfs);
    } catch (err) {
      // Directory doesn't exist, skip
    }
  }
  
  if (allPDFs.length === 0) {
    console.log('⚠️  No PDFs found in upload directories');
    console.log('   Checked:', uploadDirs.join(', '));
    console.log('\n💡 Tip: Set UPLOAD_DIR environment variable to specify PDF location');
    console.log('   Example: UPLOAD_DIR=/path/to/pdfs npm run audit-policies\n');
    return;
  }
  
  console.log(`📁 Found ${allPDFs.length} PDF files\n`);
  
  // Extract policies from all PDFs
  let allExtractedPolicies: ExtractedPolicy[] = [];
  for (const pdfPath of allPDFs) {
    const policies = await extractPoliciesFromPDF(pdfPath);
    allExtractedPolicies.push(...policies);
  }
  
  console.log(`\n✅ Total policies extracted from PDFs: ${allExtractedPolicies.length}`);
  
  // Calculate totals from extracted policies
  const extractedTotalPremium = allExtractedPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
  const extractedTotalSI = allExtractedPolicies.reduce((sum, p) => sum + (p.sum_insured || 0), 0);
  
  console.log(`   Total Premium (PDFs): ${formatCurrency(extractedTotalPremium)}`);
  console.log(`   Total Sum Insured (PDFs): ${formatCurrency(extractedTotalSI)}`);
  
  // Calculate totals from database
  const dbTotalPremium = dbPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
  const dbTotalSI = dbPolicies.reduce((sum, p) => sum + (p.sum_insured || 0), 0);
  
  console.log(`\n   Total Premium (Database): ${formatCurrency(dbTotalPremium)}`);
  console.log(`   Total Sum Insured (Database): ${formatCurrency(dbTotalSI)}`);
  
  // Find missing policies (in PDFs but not in database)
  const dbPolicyNumbers = new Set(dbPolicies.map(p => p.policy_number));
  const missingPolicies = allExtractedPolicies.filter(p => !dbPolicyNumbers.has(p.policy_number));
  
  console.log(`\n🔴 Missing policies (in PDFs but NOT in database): ${missingPolicies.length}`);
  
  if (missingPolicies.length > 0) {
    // Group by source file
    const byFile = new Map<string, ExtractedPolicy[]>();
    for (const policy of missingPolicies) {
      const policies = byFile.get(policy.source_file) || [];
      policies.push(policy);
      byFile.set(policy.source_file, policies);
    }
    
    console.log('\n📋 Missing policies by file:');
    for (const [file, policies] of byFile) {
      console.log(`\n   ${file}: ${policies.length} policies`);
      
      // Show first 5 missing policies from each file
      const sample = policies.slice(0, 5);
      for (const p of sample) {
        console.log(`      - ${p.policy_number} | ${p.client_name} | Premium: ${formatCurrency(p.premium)} | Renewal: ${p.renewal_date || 'N/A'}`);
      }
      
      if (policies.length > 5) {
        console.log(`      ... and ${policies.length - 5} more`);
      }
    }
    
    // Calculate totals for missing policies
    const missingTotalPremium = missingPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
    const missingTotalSI = missingPolicies.reduce((sum, p) => sum + (p.sum_insured || 0), 0);
    
    console.log(`\n💰 Missing policies financial impact:`);
    console.log(`   Total Premium: ${formatCurrency(missingTotalPremium)}`);
    console.log(`   Total Sum Insured: ${formatCurrency(missingTotalSI)}`);
  }
  
  // Check for policies in database that match extracted policy numbers
  const extractedPolicyNumbers = new Set(allExtractedPolicies.map(p => p.policy_number));
  const extraPolicies = dbPolicies.filter(p => !extractedPolicyNumbers.has(p.policy_number));
  
  if (extraPolicies.length > 0) {
    console.log(`\n🔵 Extra policies (in database but NOT in PDFs): ${extraPolicies.length}`);
    console.log('   (These may have been entered manually or from other sources)');
  }
  
  // Check renewal date distribution
  console.log(`\n📅 Renewal date analysis:`);
  
  const currentYear = new Date().getFullYear();
  const renewalsByYear = new Map<number, number>();
  
  for (const policy of allExtractedPolicies) {
    if (policy.renewal_date) {
      const year = new Date(policy.renewal_date).getFullYear();
      renewalsByYear.set(year, (renewalsByYear.get(year) || 0) + 1);
    }
  }
  
  console.log('   From extracted PDFs (BEFORE database adjustment):');
  for (const [year, count] of Array.from(renewalsByYear.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`      ${year}: ${count} policies`);
  }
  
  // Check database renewal dates
  const dbRenewalsByYear = new Map<number, number>();
  for (const policy of dbPolicies) {
    if (policy.renewal_date) {
      const year = new Date(policy.renewal_date).getFullYear();
      dbRenewalsByYear.set(year, (dbRenewalsByYear.get(year) || 0) + 1);
    }
  }
  
  console.log('\n   From database (AFTER adjustment):');
  for (const [year, count] of Array.from(dbRenewalsByYear.entries()).sort((a, b) => a[0] - b[0])) {
    console.log(`      ${year}: ${count} policies`);
  }
  
  // Monthly breakdown for current year
  const monthlyRenewals = new Array(12).fill(0);
  for (const policy of dbPolicies) {
    if (policy.renewal_date) {
      const d = new Date(policy.renewal_date);
      if (d.getFullYear() === currentYear) {
        monthlyRenewals[d.getMonth()]++;
      }
    }
  }
  
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  console.log(`\n   Monthly renewals in ${currentYear} (from database):`);
  for (let i = 0; i < 12; i++) {
    const bar = '█'.repeat(Math.ceil(monthlyRenewals[i] / 10));
    console.log(`      ${months[i]}: ${monthlyRenewals[i].toString().padStart(4)} ${bar}`);
  }
  
  console.log('\n✨ Audit complete!\n');
  
  // Recommendations
  console.log('📝 Recommendations:');
  if (missingPolicies.length > 0) {
    console.log(`   1. ${missingPolicies.length} policies are missing from database - consider re-uploading PDFs`);
  }
  if (renewalsByYear.size > 1) {
    console.log('   2. PDFs contain renewals across multiple years, but analytics only shows current year');
    console.log('      Fix: Update PremiumAnalytics.tsx to show multi-year renewals');
  }
  
  const zeroMonths = monthlyRenewals.filter(m => m === 0).length;
  if (zeroMonths > 0) {
    console.log(`   3. ${zeroMonths} months have zero renewals - this may indicate missing data or date adjustment issues`);
  }
  
  console.log('\n');
}

main().catch(console.error);
