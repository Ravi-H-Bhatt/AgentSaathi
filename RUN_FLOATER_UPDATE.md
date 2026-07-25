# Update Floater Mediclaim Premium Data

## Problem
The floater mediclaim calculator was failing for many ages (like 32, 31, 26-29, 36-39, etc.) because the database only had premium data for limited ages (0, 1, 10, 25, 30, 35, 40, 45, 50, 55, 60, 65).

## Solution
Created `COMPLETE_FLOATER_PREMIUM_DATA.sql` with ALL ages 0-100 for floater mediclaim.

## How to Run

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Open the file `COMPLETE_FLOATER_PREMIUM_DATA.sql` from this folder
5. Copy ALL the contents
6. Paste into the Supabase SQL Editor
7. Click "Run" button
8. Wait for success message

### Option 2: Using psql CLI
```bash
psql -h <your-supabase-host> -U postgres -d postgres -f COMPLETE_FLOATER_PREMIUM_DATA.sql
```

## What This Does
- Deletes existing floater data for zone1
- Inserts 707 records (ages 0-100, 7 sum insured values each)
- Uses interpolation for missing ages based on known premium values
- Covers all sum insured values: 2L, 3L, 5L, 8L, 10L, 12L, 15L

## Verify Success
After running, execute this query to verify:
```sql
SELECT COUNT(*) FROM nia_mediclaim_floater WHERE zone = 'zone1';
```
Expected result: 707

## Test the Calculator
After running the SQL:
1. Go to your app
2. Select "Floater Mediclaim"
3. Try member ages: 32, 35 (or any age)
4. Select sum insured: ₹5,00,000
5. Select policy term: 1 year
6. Click "Calculate Premium"
7. Should now show premium breakdown without errors

## Data Quality
- Ages 0-10: Direct values from PDF + interpolation
- Ages 11-24: Interpolated between ages 10-25
- Ages 25-65: Mix of direct PDF values and interpolation
- Ages 66-100: Extended using growth pattern from 60-65
- All values follow the premium progression pattern from the official PDF
