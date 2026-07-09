#!/usr/bin/env tsx
/**
 * Script to fix incorrectly extracted product names in the database.
 * Re-extracts full product names (e.g., "NEW INDIA FLOATER MEDICAL POLICY" 
 * instead of just "MEDICLAIM POLICY").
 * 
 * Usage: npx tsx scripts/fix-product-names.ts
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { createClient } from '@supabase/supabase-js';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing Supabase credentials in environment');
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_KEY ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: { persistSession: false }
});

const POLICY_NUMBER_RE = /\b\d{20,25}\b/; // New India policy numbers

/**
 * Re-extract the full product name from the original text chunk.
 * Uses the improved greedy matching pattern.
 */
function extractFullProductName(textChunk: string): string | null {
  // Primary pattern: LOB code followed by product name, then policy number
  // Using GREEDY match to capture full name
  const planMatch = textChunk.match(/(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().\/]+)\s+\d{20,25}/);
  let rawPlan = planMatch ? planMatch[1].trim() : null;
  
  // Fallback pattern
  if (!rawPlan) {
    const altPlanMatch = textChunk.match(/210600\s+(?:34|11|31|36)\s+([A-Z][A-Za-z\s\-&().\/]+)(?=\s+\d{20,25})/);
    rawPlan = altPlanMatch ? altPlanMatch[1].trim() : null;
  }
  
  // Clean up the extracted name
  if (rawPlan) {
    rawPlan = rawPlan
      .replace(/\s+/g, ' ') // normalize multiple spaces
      .trim();
    
    // Remove redundant trailing words but keep qualifiers like FLOATER
    rawPlan = rawPlan
      .replace(/\s+(POLICY|PLAN)\s*$/i, '')
      .trim();
  }
  
  return rawPlan;
}

/**
 * Check if a product name looks incomplete/generic.
 */
function isIncompleteProductName(name: string | null): boolean {
  if (!name) return true;
  
  const genericPatterns = [
    /^MEDICLAIM POLICY$/i,
    /^HEALTH INSURANCE$/i,
    /^MEDICAL POLICY$/i,
    /^MOTOR INSURANCE$/i,
    /^POLICY$/i,
  ];
  
  return genericPatterns.some(pattern => pattern.test(name));
}

async function main() {
  console.log('🔍 Fetching all policies to check product names...\n');
  
  // Fetch all policies - we'll check each one
  const { data: policies, error } = await supabase
    .from('policies')
    .select('id, policy_number, policy_type, company, raw_extract')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('❌ Error fetching policies:', error);
    process.exit(1);
  }
  
  if (!policies || policies.length === 0) {
    console.log('ℹ️  No policies found in database');
    console.log('   The database appears to be empty. Upload some policies first.');
    return;
  }
  
  console.log(`📊 Found ${policies.length} total policies\n`);
  
  // Group by company
  const byCompany: Record<string, any[]> = {};
  for (const p of policies) {
    const company = p.company || 'Unknown';
    if (!byCompany[company]) byCompany[company] = [];
    byCompany[company].push(p);
  }
  
  console.log('📋 Policies by company:');
  for (const [company, pols] of Object.entries(byCompany)) {
    console.log(`   ${company}: ${pols.length} policies`);
    // Show a few sample policies
    const samples = pols.slice(0, 3);
    for (const sample of samples) {
      console.log(`      - Policy#: ${sample.policy_number || 'none'}`);
      console.log(`        Type: ${sample.policy_type || 'none'}`);
      console.log(`        Has raw_extract: ${sample.raw_extract ? 'yes' : 'no'}`);
    }
  }
  console.log('');
  
  // Filter for New India policies (check both company field and policy number pattern)
  const newIndiaPolicies = policies.filter(p => {
    const hasNewIndiaCompany = p.company && p.company.toLowerCase().includes('new india');
    const hasNewIndiaPolicyNumber = p.policy_number && /^\d{20,25}$/.test(p.policy_number);
    return hasNewIndiaCompany || hasNewIndiaPolicyNumber;
  });
  
  if (newIndiaPolicies.length === 0) {
    console.log('ℹ️  No New India Assurance policies found');
    console.log('   This script is designed to fix New India policy product names.');
    return;
  }
  
  console.log(`🎯 Processing ${newIndiaPolicies.length} New India policies...\n`);
  
  let updatedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  
  for (const policy of newIndiaPolicies) {
    const currentName = policy.policy_type;
    
    // Skip if product name looks complete
    if (!isIncompleteProductName(currentName) && currentName && currentName.length > 20) {
      console.log(`✓ ${policy.policy_number}: "${currentName}" - looks complete, skipping`);
      skippedCount++;
      continue;
    }
    
    console.log(`\n🔄 ${policy.policy_number}: "${currentName}" - attempting to fix...`);
    
    // Try to extract from raw_extract JSONB field if available
    let fullName: string | null = null;
    
    if (policy.raw_extract && typeof policy.raw_extract === 'object') {
      const rawData = policy.raw_extract as any;
      
      // Check if there's a full text chunk we can re-parse
      if (rawData.chunk || rawData.fullText || rawData.raw_text) {
        const textChunk = rawData.chunk || rawData.fullText || rawData.raw_text;
        fullName = extractFullProductName(textChunk);
      }
      
      // Or check if there's already a better name stored
      if (!fullName && rawData.policy_type && !isIncompleteProductName(rawData.policy_type)) {
        fullName = rawData.policy_type;
      }
    }
    
    if (fullName && fullName !== currentName) {
      console.log(`   → Found full name: "${fullName}"`);
      
      // Update the policy
      const { error: updateError } = await supabase
        .from('policies')
        .update({ policy_type: fullName })
        .eq('id', policy.id);
      
      if (updateError) {
        console.error(`   ❌ Failed to update: ${updateError.message}`);
        failedCount++;
      } else {
        console.log(`   ✅ Updated successfully`);
        updatedCount++;
      }
    } else if (!fullName) {
      console.log(`   ⚠️  Could not extract full product name from raw data`);
      failedCount++;
    } else {
      console.log(`   ℹ️  No change needed`);
      skippedCount++;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📈 Summary:');
  console.log(`   ✅ Updated: ${updatedCount}`);
  console.log(`   ⏭️  Skipped (already complete): ${skippedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(`   📊 Total processed: ${newIndiaPolicies.length}`);
  console.log('='.repeat(60) + '\n');
  
  if (updatedCount > 0) {
    console.log('✨ Product names have been corrected in the database!');
  } else if (failedCount === 0) {
    console.log('✨ All product names were already correct!');
  } else {
    console.log('⚠️  Some product names could not be fixed. They may need manual correction.');
  }
}

main().catch(console.error);
