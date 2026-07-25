# Premium Calculator - Implementation Guide

## ✅ What's Been Completed

### 1. Database Schema
- ✅ All premium tables created (`0013_premium_calculator.sql`)
- ✅ Individual Mediclaim table
- ✅ Floater Mediclaim table
- ✅ Optional Cover I, II, III tables
- ✅ Top-Up Mediclaim table
- ✅ Premium config table with discount rules
- ✅ Helper functions for age bands

### 2. Calculator Logic
- ✅ Complete calculator library (`src/lib/premium-calculator.ts`)
- ✅ Individual Mediclaim calculation with all optional covers
- ✅ Floater Mediclaim calculation with family discounts
- ✅ Top-Up Mediclaim calculation (logic complete)
- ✅ Automatic discount application (co-pay, family, long-term)
- ✅ Exact lookup from database (NO formulas or estimates)

### 3. API Endpoints
- ✅ `/api/premium/calculate` - Calculate premium for any policy type
- ✅ `/api/premium/upload-data` - Admin endpoint to bulk upload premium data

### 4. User Interfaces
- ✅ `/premium-calculator` - Premium calculator page (accessible to agents AND colleagues)
- ✅ `/admin/premium-data` - Admin data management interface
- ✅ Dynamic form fields based on policy type
- ✅ Detailed premium breakdown display
- ✅ Optional covers with eligibility rules
- ✅ JSON data upload interface for admins

### 5. Permissions
- ✅ Both agents AND colleagues can calculate premiums
- ✅ Only admins can manage premium data

---

## ⚠️ CRITICAL: Incomplete Premium Data

### Current Status
The seed file (`supabase/seed_premium_data.sql`) contains **PARTIAL** data:

**✓ Ages loaded:**
- Ages 0-10 (complete)
- Ages 25, 35, 40, 45 (sample)

**✗ Missing ages (from PDF Page 1):**
- Ages 11-24 (14 ages)
- Ages 26-34 (9 ages)
- Ages 36-39 (4 ages)
- Ages 41-44 (4 ages)
- Ages 46-100 (55 ages)

**Total missing: ~946 rows** for Zone 1 Individual Mediclaim alone

---

## 📋 How to Complete the Premium Data

### Option 1: Web Interface (RECOMMENDED)

1. **Run the migrations:**
   ```bash
   # Apply the schema
   # Run in Supabase SQL Editor or via migration
   ```

2. **Access the admin interface:**
   - Navigate to `/admin/premium-data`
   - Select the table you want to populate
   - Click "Load Example" to see the JSON format

3. **Prepare your data from PDF:**
   - Extract values from PDF Page 1
   - Format as JSON array
   - Example for Individual Mediclaim:
   ```json
   [
     {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 100000, "premium": 3599},
     {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 200000, "premium": 4937},
     {"zone": "zone1", "age_min": 11, "age_max": 11, "sum_insured": 300000, "premium": 5446},
     ... (for all 11 sum insured values)
   ]
   ```

4. **Upload in batches:**
   - Recommend uploading 50-100 rows at a time
   - Duplicate keys will be updated automatically (upsert)
   - You can re-run the same data to fix errors

### Option 2: Direct SQL (For bulk operations)

Add INSERT statements to the seed file:

```sql
-- Ages 11-24 (example)
INSERT INTO nia_mediclaim_individual (zone, age_min, age_max, sum_insured, premium) VALUES
('zone1', 11, 11, 100000, 3599),
('zone1', 11, 11, 200000, 4937),
... (repeat for all ages and sum insured values)

ON CONFLICT (zone, age_min, age_max, sum_insured) DO UPDATE
SET premium = EXCLUDED.premium;
```

---

## 📊 Data Requirements from PDF

### Individual Mediclaim (Page 1)
For **each age** from 0 to 100, you need premiums for these Sum Insured values:
- ₹1,00,000
- ₹2,00,000
- ₹3,00,000
- ₹4,00,000
- ₹5,00,000
- ₹6,00,000
- ₹7,00,000
- ₹8,00,000
- ₹10,00,000
- ₹12,00,000
- ₹15,00,000

**Total rows needed:** 101 ages × 11 sum insured values = **1,111 rows**

### Floater Mediclaim
Same structure as Individual but fewer age entries (based on eldest member)

### Optional Covers
- **Cover I:** Different premiums by sum insured and age band
- **Cover II:** Fixed premium by sum insured (₹5L and above)
- **Cover III:** For ₹8L+ sum insured only, by age band

### Top-Up Mediclaim
- Multiple threshold options (₹1L, ₹2L, ₹3L, ₹5L, ₹10L, etc.)
- Primary vs Additional member pricing
- Different age bands

---

## 🔍 How to Verify Data Accuracy

### 1. Spot Check Examples
Test the calculator with known values from PDF:
- Age 35, ₹5L sum insured should return exactly ₹9,349 base premium (Zone 1)
- Age 45, ₹10L sum insured should return exactly ₹18,944 base premium (Zone 1)

### 2. Check Optional Covers
- Optional Cover II for ₹5L should add ₹5,000
- Optional Cover V should add ₹1,500 (for ₹8L+ sum insured)

### 3. Check Discounts
- Voluntary co-pay should reduce base premium by 15%
- 3 members floater should get 5% discount
- 4+ members floater should get 10% discount
- 2-year term should get 5% discount
- 3-year term should get 7% discount

---

## 🚀 Testing the Calculator

### Test Individual Mediclaim
```typescript
// Navigate to /premium-calculator
// Select: Individual Mediclaim
// Input:
//   Age: 35
//   Sum Insured: ₹5,00,000
//   Zone: Zone 1
//   Policy Term: 1 Year
// Expected Base Premium: ₹9,349
```

### Test Floater Mediclaim
```typescript
// Navigate to /premium-calculator
// Select: Floater Mediclaim
// Input:
//   Eldest Age: 40
//   Number of Members: 4
//   Sum Insured: ₹5,00,000
//   Zone: Zone 1
//   Policy Term: 1 Year
// Expected: Base premium + 10% family discount
```

### Test Top-Up
```typescript
// Navigate to /premium-calculator
// Select: Top-Up Mediclaim
// Input:
//   Threshold: ₹3,00,000
//   Sum Insured: ₹5,00,000
//   Primary Member Age: 35
// Expected: Premium from Top-Up table
```

---

## 🔐 Permissions Summary

| Role      | Calculate Premium | Manage Premium Data |
|-----------|-------------------|---------------------|
| Admin     | ✅ Yes            | ✅ Yes              |
| Agent     | ✅ Yes            | ❌ No               |
| Colleague | ✅ Yes            | ❌ No               |

---

## 📁 Files Created

### API Routes
- `src/app/api/premium/calculate/route.ts` - Premium calculation endpoint
- `src/app/api/premium/upload-data/route.ts` - Admin bulk upload endpoint

### Pages
- `src/app/(app)/premium-calculator/page.tsx` - Calculator page (agents + colleagues)
- `src/app/admin/premium-data/page.tsx` - Data management page (admins only)

### Components
- `src/components/PremiumCalculatorForm.tsx` - Main calculator form
- `src/components/PremiumDataManager.tsx` - Admin data upload interface

### Database
- `supabase/migrations/0013_premium_calculator.sql` - Schema (complete)
- `supabase/seed_premium_data.sql` - Seed data (PARTIAL - needs completion)

### Library
- `src/lib/premium-calculator.ts` - Calculator logic (complete)

---

## ⏭️ Next Steps

1. **Complete the premium data:**
   - Extract ALL ages (0-100) from PDF Page 1
   - Use `/admin/premium-data` interface to upload data
   - Verify with spot checks

2. **Add Zone 2 data:**
   - Repeat for "Rest of India" zone
   - Follow same format with `zone: "zone2"`

3. **Complete Floater data:**
   - Currently only has sample ages 0 and 35
   - Add all relevant ages from Floater premium chart

4. **Add Top-Up data:**
   - Multiple thresholds and sum insured combinations
   - Primary and additional member pricing

5. **Test thoroughly:**
   - Test with exact values from PDF
   - Ensure optional covers calculate correctly
   - Verify all discounts apply properly

---

## 🎯 Production Checklist

- [x] Database schema created
- [x] Calculator logic implemented
- [x] API endpoints created
- [x] User interface built
- [x] Admin interface built
- [x] Permissions configured
- [ ] **Complete premium data from PDF**
- [ ] Zone 2 data added
- [ ] Floater data completed
- [ ] Top-Up data added
- [ ] All calculations verified against PDF
- [ ] Production testing completed

---

## ❓ Common Issues

### Calculator returns "Premium not available"
- **Cause:** Data not loaded for that age/sum insured combination
- **Fix:** Upload the missing data via `/admin/premium-data`

### Optional covers not calculating
- **Cause:** Optional cover data not uploaded
- **Fix:** Upload optional cover premiums from PDF

### Discounts not applying
- **Cause:** Premium config not inserted
- **Fix:** Re-run the migration which inserts discount rules

---

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Verify data exists in Supabase tables
3. Test with known values from PDF
4. Check API response in Network tab
