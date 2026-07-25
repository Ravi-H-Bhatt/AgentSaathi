# Premium Calculator Setup Guide

## Overview
The Premium Calculator is a **database-driven** system that calculates exact premiums for New India Assurance policies. It does NOT require PDF uploads at runtime - all premium data is stored in database tables.

## Architecture

### Database Tables Created
1. **nia_mediclaim_individual** - Individual policy premiums by age and sum insured
2. **nia_mediclaim_floater** - Floater policy premiums by eldest age and sum insured  
3. **nia_optional_cover_i** - No Proportionate Deduction premiums
4. **nia_optional_cover_ii** - Maternity Benefit premiums
5. **nia_optional_cover_iii** - Cataract Limit Revision premiums
6. **nia_topup_mediclaim** - Top-Up policy premiums with threshold and member type
7. **premium_config** - Configuration for discounts and rules (family, long-term, co-pay)

### Files Created/Modified

**Library:**
- `src/lib/premium-calculator.ts` - Core calculation engine with lookup logic

**API:**
- `src/app/api/premium/calculate/route.ts` - Premium calculation endpoint

**UI:**
- `src/components/PremiumCalculator.tsx` - Interactive calculator component
- `src/app/(app)/premium/page.tsx` - Premium calculator page
- `src/components/AppShell.tsx` - Added "Premium Calculator" navigation link

**Database:**
- `supabase/migrations/0013_premium_calculator.sql` - Table schema
- `supabase/seed_premium_data.sql` - Sample seed data (page 1 only)
- `RUN_THIS_IN_SUPABASE.sql` - Updated with premium calculator migration

## Setup Instructions

### Step 1: Run Database Migration

Copy and paste the contents of **`RUN_THIS_IN_SUPABASE.sql`** into your Supabase SQL Editor and execute it. This will:
- Create all 7 premium tables
- Create helper functions for age band calculation
- Insert configuration data (discounts, rules)
- Set up proper indexes for fast lookups
- Grant SELECT permissions to authenticated users

### Step 2: Seed Sample Data (Optional)

Run `supabase/seed_premium_data.sql` to load sample premium data from page 1 of the PDF. This will let you test the calculator immediately with limited data.

### Step 3: Load Full Premium Data

The calculator currently has SAMPLE DATA ONLY from page 1 of the premium charts. You need to populate the tables with complete premium data from all pages.

**Two options:**

#### Option A: Manual SQL Inserts
Extract premium values from the PDF and create INSERT statements like:

```sql
-- Example: Individual Mediclaim Zone 1, Age 18-25, SI 1L = Rs 2,568
INSERT INTO nia_mediclaim_individual (zone, age_min, age_max, sum_insured, premium)
VALUES ('zone1', 18, 25, 100000, 2568);

-- Example: Floater Mediclaim Zone 1, Eldest Age 26-35, SI 3L = Rs 7,009  
INSERT INTO nia_mediclaim_floater (zone, age_min, age_max, sum_insured, premium)
VALUES ('zone1', 26, 35, 300000, 7009);

-- Example: Optional Cover I, SI 5L, Age Band 36-45 = Rs 1,900
INSERT INTO nia_optional_cover_i (sum_insured, age_band, premium)
VALUES (500000, '36-45', 1900);
```

#### Option B: Build Admin Bulk Upload Tool (Recommended)
Create an admin interface that:
1. Accepts CSV/Excel files with premium data
2. Validates the data format
3. Bulk inserts into the appropriate tables
4. Provides progress feedback

**CSV Format Example (Individual):**
```csv
zone,age_min,age_max,sum_insured,premium
zone1,18,25,100000,2568
zone1,18,25,200000,3842
zone1,26,35,100000,3045
```

## How It Works

### Calculation Flow

1. **User selects policy type** (Individual, Floater, or Top-Up)
2. **User enters details** (age, sum insured, zone, optional covers, etc.)
3. **Frontend sends request** to `/api/premium/calculate`
4. **Backend looks up exact premium** from database tables
5. **Backend applies optional covers** (if selected and eligible)
6. **Backend applies discounts** (voluntary co-pay, family, long-term)
7. **Backend returns breakdown** with line-by-line details
8. **Frontend displays** itemized premium breakdown

### Key Rules Implemented

✅ **No estimation or interpolation** - Only exact lookups from database
✅ **GST is always 0** - Not added to displayed premium
✅ **Voluntary Co-Pay** - 15% discount on base premium only
✅ **Family Discount** - 0% (2 members), 5% (3), 10% (4+)
✅ **Long-Term Discount** - 0% (1yr), 5% (2yr), 7% (3yr)
✅ **Optional Cover III** - Only available for SI >= ₹8L
✅ **Optional Cover V** - Only available for SI >= ₹8L, fixed ₹1,500
✅ **Floater premiums** - Based on eldest member age only
✅ **Top-Up premiums** - Primary + sum of additional member premiums

## Access Control

✅ **All agents** can use the calculator
✅ **All colleagues** can use the calculator (no special permission needed)

The navigation link appears for everyone, and the API endpoint is accessible to all authenticated users.

## Testing the Calculator

### Before Full Data Load (Sample Data Only)
With sample data, you can only calculate premiums for:
- Zone 1
- Age 26-35 (individual) or eldest age 26-35 (floater)
- Sum Insured options from page 1
- No optional covers (not yet seeded)

### After Full Data Load
The calculator will support:
- All zones (Zone 1 and Zone 2)
- All age bands (18-100+)
- All sum insured options (₹1L to ₹30L)
- All optional covers with proper eligibility checks
- All thresholds for Top-Up policies

## Next Steps

### Immediate (Required for Production)
1. ✅ Run database migration (`RUN_THIS_IN_SUPABASE.sql`)
2. ⏳ Extract all premium data from PDF charts
3. ⏳ Populate all 7 tables with complete data
4. ⏳ Test calculator with various combinations

### Future Enhancements (Optional)
1. Admin bulk upload interface for premium data
2. Premium history tracking (for year-over-year updates)
3. Export premium breakdown to PDF
4. Multi-year premium calculations in one view
5. Premium comparison across policy types
6. Zone auto-detection based on pincode

## Troubleshooting

### "Premium not available" Error
This means the exact combination of inputs doesn't exist in the database. Check:
1. Is the data for that zone/age/SI loaded?
2. Are you using valid sum insured values?
3. For floater, are you entering eldest member age?
4. For top-up, is the threshold valid?

### Optional Cover Not Showing
Check:
- Optional Cover III requires SI >= ₹8,00,000
- Optional Cover V requires SI >= ₹8,00,000
- Data must be loaded in the respective optional cover tables

### Wrong Premium Amount
Verify:
1. The correct age band is being used (check `get_age_band()` function)
2. The premium data in the database matches the official PDF
3. Discounts are being applied in the correct order
4. GST is NOT being added

## Database Maintenance

### Updating Premium Rates
When New India releases new premium charts:
1. Backup existing tables
2. Update rows with new premiums (or insert new ones)
3. Keep old data for historical reference if needed

```sql
-- Example: Update a premium
UPDATE nia_mediclaim_individual
SET premium = 2800, updated_at = NOW()
WHERE zone = 'zone1' AND age_min = 18 AND age_max = 25 AND sum_insured = 100000;
```

### Checking Data Coverage
```sql
-- Count premiums by zone
SELECT zone, COUNT(*) FROM nia_mediclaim_individual GROUP BY zone;

-- Check age band coverage
SELECT age_min, age_max, COUNT(*) FROM nia_mediclaim_individual
WHERE zone = 'zone1' GROUP BY age_min, age_max ORDER BY age_min;

-- Check optional cover availability
SELECT sum_insured, COUNT(*) FROM nia_optional_cover_i
GROUP BY sum_insured ORDER BY sum_insured;
```

## File Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/0013_premium_calculator.sql` | Database schema |
| `supabase/seed_premium_data.sql` | Sample data (page 1) |
| `RUN_THIS_IN_SUPABASE.sql` | Complete migration script |
| `src/lib/premium-calculator.ts` | Calculation logic |
| `src/app/api/premium/calculate/route.ts` | API endpoint |
| `src/components/PremiumCalculator.tsx` | UI component |
| `src/app/(app)/premium/page.tsx` | Page route |

## Support

If the calculator is returning unexpected results:
1. Check the database has complete data
2. Verify the premium chart PDF version matches database data
3. Test with known examples from the PDF
4. Check Supabase logs for query errors
5. Review browser console for API errors
