/**
 * Investigation Script: Why 371 instead of 271 policies?
 * This script will help identify the extra 100 entries
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function investigate() {
  console.log('🔍 Starting investigation...\n');

  // 1. Get total count
  const { count: totalCount, error: countError } = await supabase
    .from('policies')
    .select('*', { count: 'exact', head: true });

  console.log(`📊 Total policies in database: ${totalCount}`);

  // 2. Get all policies to analyze
  const { data: allPolicies, error: fetchError } = await supabase
    .from('policies')
    .select('*')
    .order('created_at', { ascending: true });

  if (fetchError) {
    console.error('Error fetching policies:', fetchError);
    return;
  }

  console.log(`✅ Fetched ${allPolicies?.length} policies\n`);

  // 3. Check for duplicate policy numbers
  const policyNumberMap = new Map<string, number>();
  allPolicies?.forEach(policy => {
    const num = policy.policy_number;
    policyNumberMap.set(num, (policyNumberMap.get(num) || 0) + 1);
  });

  const duplicates = Array.from(policyNumberMap.entries())
    .filter(([_, count]) => count > 1);

  console.log(`🔄 Duplicate policy numbers: ${duplicates.length}`);
  if (duplicates.length > 0) {
    console.log('First 10 duplicates:');
    duplicates.slice(0, 10).forEach(([policyNum, count]) => {
      console.log(`  - ${policyNum}: ${count} times`);
    });
  }

  // 4. Group by created_at date to see import batches
  const dateGroups = new Map<string, number>();
  allPolicies?.forEach(policy => {
    const date = new Date(policy.created_at).toISOString().split('T')[0];
    dateGroups.set(date, (dateGroups.get(date) || 0) + 1);
  });

  console.log('\n📅 Import batches by date:');
  Array.from(dateGroups.entries())
    .sort()
    .forEach(([date, count]) => {
      console.log(`  ${date}: ${count} policies`);
    });

  // 5. Check for empty or invalid entries
  const emptyNames = allPolicies?.filter(p => !p.client_name || p.client_name.trim() === '').length || 0;
  const emptyPolicyNumbers = allPolicies?.filter(p => !p.policy_number || p.policy_number.trim() === '').length || 0;
  const zeroPremium = allPolicies?.filter(p => !p.premium || p.premium === 0).length || 0;

  console.log('\n⚠️  Data quality check:');
  console.log(`  Empty client names: ${emptyNames}`);
  console.log(`  Empty policy numbers: ${emptyPolicyNumbers}`);
  console.log(`  Zero/null premium: ${zeroPremium}`);

  // 6. Check for specific patterns that might indicate the issue
  const byInsuranceCompany = new Map<string, number>();
  allPolicies?.forEach(policy => {
    const company = policy.insurance_company || 'Unknown';
    byInsuranceCompany.set(company, (byInsuranceCompany.get(company) || 0) + 1);
  });

  console.log('\n🏢 Policies by insurance company:');
  Array.from(byInsuranceCompany.entries())
    .sort((a, b) => b[1] - a[1])
    .forEach(([company, count]) => {
      console.log(`  ${company}: ${count} policies`);
    });

  // 7. Find most recent 100 entries (could be the extra ones)
  console.log('\n🔍 Last 100 entries (potential extras):');
  const last100 = allPolicies?.slice(-100) || [];
  
  const last100Summary = {
    dateRange: {
      first: last100[0]?.created_at,
      last: last100[last100.length - 1]?.created_at
    },
    uniquePolicyNumbers: new Set(last100.map(p => p.policy_number)).size,
    companies: Array.from(new Set(last100.map(p => p.insurance_company)))
  };

  console.log('  Date range:', last100Summary.dateRange);
  console.log('  Unique policy numbers in last 100:', last100Summary.uniquePolicyNumbers);
  console.log('  Companies:', last100Summary.companies);

  // 8. Check if there are exactly 271 unique policy numbers
  const uniquePolicyNumbers = new Set(allPolicies?.map(p => p.policy_number));
  console.log(`\n🎯 Unique policy numbers: ${uniquePolicyNumbers.size}`);
  console.log(`   Total records: ${allPolicies?.length}`);
  console.log(`   Difference (duplicates): ${(allPolicies?.length || 0) - uniquePolicyNumbers.size}`);

  // 9. If we have exactly 100 extra, let's find them
  if (duplicates.length > 0) {
    console.log('\n🔍 Analyzing duplicate entries...');
    
    for (const [policyNum, count] of duplicates.slice(0, 5)) {
      const dupes = allPolicies?.filter(p => p.policy_number === policyNum);
      console.log(`\nPolicy Number: ${policyNum} (${count} times)`);
      dupes?.forEach((dupe, idx) => {
        console.log(`  [${idx + 1}] ID: ${dupe.id}, Created: ${dupe.created_at}, Client: ${dupe.client_name}`);
      });
    }
  }
}

investigate().catch(console.error);
