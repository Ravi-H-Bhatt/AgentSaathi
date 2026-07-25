# Premium Calculator Data Setup Guide

## Quick Setup

### Option 1: Use the complete data file (Recommended)
```bash
# In Supabase SQL Editor, run:
/Users/ravib/Desktop/AgentSaathi/supabase/complete_premium_data.sql
```

### Option 2: Use the migration + seed files
```bash
# First ensure the schema is created (if not already done):
psql your-database < supabase/migrations/0013_premium_calculator.sql

# Then load the premium data:
psql your-database < supabase/seed_premium_data.sql
```

## What's Included

### ✅ Individual Mediclaim (Zone 1)
- **Ages**: 0, 1, 2, 10, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88
- **Sum Insured**: 1L, 2L, 3L, 4L, 5L, 6L, 7L, 8L, 10L, 12L, 15L
- **Total**: 18 ages × 11 SI = 198 rows

### ✅ Floater Mediclaim (Zone 1)  
- **Ages**: 0, 1, 10, 25, 30, 35, 40, 45, 50, 55, 60, 65
- **Sum Insured**: 2L, 3L, 5L, 8L, 10L, 12L, 15L
- **Total**: 12 ages × 7 SI = 84 rows

### ✅ Optional Cover I - No Proportionate Deduction
- All sum insured values from 2L to 15L
- All age bands: <35, 36-45, 46-50, 51-55, 56-60, 61-65
- **Total**: 42 rows

### ✅ Optional Cover II - Maternity Benefit
- Sum insured: 5L to 15L
- **Total**: 7 rows

### ✅ Optional Cover III - Cataract Limit Revision
- Sum insured: 8L, 10L, 12L, 15L
- Age bands: 61-65, >65
- **Total**: 8 rows

### ✅ Top-Up Mediclaim
- Primary and Additional members
- Common threshold/SI combinations
- **Total**: 18 rows

## Zone Information

**Zone 1**: Maharashtra and Gujarat
- This is the zone specified in your request
- The PDF has Zone 2 (Rest of India) data as well, which can be added later if needed

## How the Calculator Works

### Age Matching
- The calculator uses `age_min` and `age_max` for exact age matching
- Example: For age 35, it looks for rows where `age_min <= 35 AND age_max >= 35`
- Currently we have data for key ages (interpolation not needed for these ages)

### Missing Ages
For ages between the loaded data points (e.g., age 27), you have two options:
1. **Add more age data** - Extract from PDF and add more rows
2. **Use nearest age** - The app can find the closest age match

## Testing

### Test Individual Mediclaim
```bash
# Should work for ages: 0, 1, 2, 10, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 88
# Sum Insured: 100000, 200000, 300000, 400000, 500000, 600000, 700000, 800000, 1000000, 1200000, 1500000
```

### Test Floater Mediclaim  
```bash
# Should work for eldest member ages: 0, 1, 10, 25, 30, 35, 40, 45, 50, 55, 60, 65
# Sum Insured: 200000, 300000, 500000, 800000, 1000000, 1200000, 1500000
```

### Test Top-Up
```bash
# Threshold: 500000, Sum Insured: 500000, 1000000, 1500000
# Threshold: 800000, Sum Insured: 700000, 1200000, 1700000, 2200000
# Age bands: 18-44, 45-54, 55-60, 61-65
```

## Adding More Data

### Via SQL (Manual)
1. Extract data from PDF
2. Add INSERT statements to `seed_premium_data.sql`
3. Run the SQL file

### Via Admin Interface
1. Go to `/admin/premium-data` (admin only)
2. Select the table
3. Upload JSON format:
```json
[
  {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 100000, "premium": 3598},
  {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 200000, "premium": 4937}
]
```

## Access Control

✅ **Both agents AND colleagues** can access the premium calculator at `/premium`

The navigation menu shows "Premium Calculator" for everyone, and the page checks:
```typescript
const canCalculate = profile?.role === "agent" || profile?.role === "colleague";
```

## Troubleshooting

### "Premium not available" error
- Check if the exact age exists in the database
- Check if the exact sum insured exists
- Verify Zone 1 data is loaded (`zone = 'zone1'`)

### Colleagues can't see it
1. Check colleague role in database:
```sql
SELECT id, email, role FROM profiles WHERE email = 'colleague@example.com';
```
2. Verify navigation shows "Premium Calculator" link
3. Check browser console for errors

### Data not loading
```sql
-- Check row counts
SELECT 'Individual' as type, COUNT(*) FROM nia_mediclaim_individual
UNION ALL
SELECT 'Floater', COUNT(*) FROM nia_mediclaim_floater
UNION ALL
SELECT 'Optional I', COUNT(*) FROM nia_optional_cover_i;
```

Expected:
- Individual: 198 rows
- Floater: 84 rows
- Optional I: 42 rows

## Next Steps

1. ✅ Run `complete_premium_data.sql` in Supabase
2. ✅ Test calculator at `/premium`
3. ⏳ Add remaining ages if needed (ages 3-9, 11-24, 26-29, 31-34, 36-39, 41-44, 46-49, etc.)
4. ⏳ Add Zone 2 data (Rest of India) if required

