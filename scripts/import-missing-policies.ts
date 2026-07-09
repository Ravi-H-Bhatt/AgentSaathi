#!/usr/bin/env tsx
/**
 * Import missing policies from PDFs into the database.
 * This script finds policies in PDFs that are not in the database and adds them.
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
const agentId = process.env.AGENT_ID;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

if (!agentId) {
  console.error('❌ Missing AGENT_ID');
  console.error('   Set AGENT_ID environment variable to the agent UUID');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExtractedPolicy {
  policy_number: string;
  client_name: string;
  client_phone: string | null;
  start_date: string | null;
  renewal_date: string | null;
  policy_type: string | null;
  mode: string | null;
  premium: number | null;
  sum_insured: number | null;
}

function cleanName(name: string | null): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s&.-]/g, '')
    .toUpperCase();
}

function nameKey(name: string): string {
  return cleanName(name).replace(/\s+/g, '').toLowerCase();
}

async function findPDFs(dir: string): Promise<string[]> {
  const pdfs: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        pdfs.push(...await findPDFs(fullPath));
      } else if (item.toLowerCase().endsWith('.pdf')) {
        pdfs.push(fullPath);
      }
    }
  } catch (err) {
    // Directory doesn't exist
  }
  
  return pdfs;
}

async function extractPoliciesFromPDF(filePath: string): Promise<ExtractedPolicy[]> {
  try {
    const buffer = readFileSync(filePath);
    const data = await pdf(buffer);
    const text = data.text;
    
    let rows: any[] = [];
    
    if (looksLikeNewIndiaRegister(text)) {
      rows = parseNewIndiaRegister(text);
    } else if (looksLikeLICRegister(text)) {
      rows = parseLICRegister(text);
    } else {
      return [];
    }
    
    return rows
      .filter(r => r.policy_number && r.client_name)
      .map(r => ({
        policy_number: r.policy_number!,
        client_name: r.client_name!,
        client_phone: r.client_phone,
        start_date: r.start_date,
        renewal_date: r.renewal_date,
        policy_type: r.policy_type,
        mode: r.mode,
        premium: r.premium,
        sum_insured: r.sum_insured,
      }));
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err);
    return [];
  }
}

async function main() {
  console.log('🚀 Starting policy import...\n');
  console.log(`Agent ID: ${agentId}\n`);
  
  // Get upload directory from environment or use defaults
  const uploadDirs = [
    process.env.UPLOAD_DIR,
    './uploads',
    './public/uploads',
  ].filter(Boolean) as string[];
  
  let allPDFs: string[] = [];
  for (const dir of uploadDirs) {
    const pdfs = await findPDFs(dir);
    allPDFs.push(...pdfs);
  }
  
  if (allPDFs.length === 0) {
    console.log('❌ No PDFs found');
    console.log('   Checked:', uploadDirs.join(', '));
    console.log('\n💡 Set UPLOAD_DIR environment variable to specify PDF location');
    return;
  }
  
  console.log(`📁 Found ${allPDFs.length} PDF files\n`);
  
  // Extract all policies
  let allExtractedPolicies: ExtractedPolicy[] = [];
  for (const pdfPath of allPDFs) {
    console.log(`📄 Processing: ${pdfPath}`);
    const policies = await extractPoliciesFromPDF(pdfPath);
    console.log(`   Extracted ${policies.length} policies`);
    allExtractedPolicies.push(...policies);
  }
  
  console.log(`\n✅ Total extracted: ${allExtractedPolicies.length} policies`);
  
  // Get existing policies from database
  const { data: dbPolicies, error: policiesError } = await supabase
    .from('policies')
    .select('policy_number')
    .eq('agent_id', agentId);
  
  if (policiesError) {
    console.error('❌ Error fetching policies:', policiesError);
    return;
  }
  
  const existingNumbers = new Set(dbPolicies.map(p => p.policy_number));
  console.log(`📊 Database contains: ${existingNumbers.size} policies`);
  
  // Find missing policies
  const missingPolicies = allExtractedPolicies.filter(p => !existingNumbers.has(p.policy_number));
  
  console.log(`\n🔍 Found ${missingPolicies.length} missing policies\n`);
  
  if (missingPolicies.length === 0) {
    console.log('✨ No missing policies - database is up to date!');
    return;
  }
  
  // Confirm before proceeding
  const dryRun = process.env.DRY_RUN === 'true';
  
  if (dryRun) {
    console.log('🔸 DRY RUN MODE - No data will be added\n');
    console.log('Sample missing policies:');
    missingPolicies.slice(0, 10).forEach(p => {
      console.log(`   - ${p.policy_number} | ${p.client_name} | ₹${p.premium || 0}`);
    });
    if (missingPolicies.length > 10) {
      console.log(`   ... and ${missingPolicies.length - 10} more`);
    }
    console.log('\n💡 To import, run without DRY_RUN=true');
    return;
  }
  
  console.log('⚠️  About to import policies to database');
  console.log('   Press Ctrl+C to cancel, or wait 5 seconds to continue...\n');
  
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  console.log('📥 Starting import...\n');
  
  // Step 1: Get or create clients
  const clientsByName = new Map<string, string>();
  
  // Get existing clients
  const { data: existingClients, error: clientsError } = await supabase
    .from('clients')
    .select('id, full_name')
    .eq('agent_id', agentId);
  
  if (clientsError) {
    console.error('❌ Error fetching clients:', clientsError);
    return;
  }
  
  for (const client of existingClients || []) {
    clientsByName.set(nameKey(client.full_name), client.id);
  }
  
  console.log(`   Found ${clientsByName.size} existing clients`);
  
  // Create new clients for missing names
  const uniqueNames = new Set(missingPolicies.map(p => nameKey(p.client_name)));
  const newNames = Array.from(uniqueNames).filter(n => !clientsByName.has(n));
  
  if (newNames.length > 0) {
    console.log(`   Creating ${newNames.length} new clients...`);
    
    const newClientsData = newNames.map(key => {
      const policy = missingPolicies.find(p => nameKey(p.client_name) === key)!;
      return {
        agent_id: agentId,
        full_name: cleanName(policy.client_name),
        phone: policy.client_phone,
      };
    });
    
    const { data: newClients, error: createError } = await supabase
      .from('clients')
      .insert(newClientsData)
      .select('id, full_name');
    
    if (createError) {
      console.error('❌ Error creating clients:', createError);
      return;
    }
    
    for (const client of newClients || []) {
      clientsByName.set(nameKey(client.full_name), client.id);
    }
    
    console.log(`   ✓ Created ${newClients?.length || 0} new clients`);
  }
  
  // Step 2: Insert policies
  console.log(`\n   Inserting ${missingPolicies.length} policies...`);
  
  const policiesToInsert = missingPolicies.map(p => {
    const clientId = clientsByName.get(nameKey(p.client_name));
    
    if (!clientId) {
      console.warn(`   ⚠️  No client ID for ${p.client_name}`);
      return null;
    }
    
    return {
      agent_id: agentId,
      client_id: clientId,
      policy_number: p.policy_number,
      company: p.policy_type?.includes('LIC') ? 'LIC' : 'New India',
      policy_type: p.policy_type,
      sum_insured: p.sum_insured,
      premium: p.premium,
      mode: p.mode,
      start_date: p.start_date,
      renewal_date: p.renewal_date,
      status: 'active',
    };
  }).filter(Boolean);
  
  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < policiesToInsert.length; i += 100) {
    const batch = policiesToInsert.slice(i, i + 100);
    const { error: insertError } = await supabase
      .from('policies')
      .insert(batch);
    
    if (insertError) {
      console.error(`   ❌ Error inserting batch ${i / 100 + 1}:`, insertError);
      continue;
    }
    
    inserted += batch.length;
    console.log(`   ✓ Inserted batch ${Math.floor(i / 100) + 1}/${Math.ceil(policiesToInsert.length / 100)}`);
  }
  
  console.log(`\n✨ Import complete!`);
  console.log(`   ${inserted} policies added to database`);
  
  // Calculate totals
  const totalPremium = missingPolicies.reduce((sum, p) => sum + (p.premium || 0), 0);
  const totalSI = missingPolicies.reduce((sum, p) => sum + (p.sum_insured || 0), 0);
  
  console.log(`\n💰 Financial impact:`);
  console.log(`   Premium: ₹${totalPremium.toLocaleString('en-IN')}`);
  console.log(`   Sum Insured: ₹${totalSI.toLocaleString('en-IN')}`);
  console.log('\n');
}

main().catch(console.error);
