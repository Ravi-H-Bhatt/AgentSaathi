# Top-Up Mediclaim Premium Calculation - Verification

## How Top-Up Mediclaim Premium Works

### Age Band Structure
Top-Up Mediclaim uses **age bands** (not individual ages):

| Age Band | Description | Member Type |
|----------|-------------|-------------|
| 0-17 | Child | Additional only |
| 18-44 | Young Adult | Primary + Additional |
| 45-54 | Middle Age | Primary + Additional |
| 55-60 | Senior | Primary + Additional |
| 61-65 | Elderly | Primary + Additional |

### Premium Calculation Formula
```
Total Premium = Primary Member Premium + Sum of Additional Member Premiums
```

Each member's premium is determined by:
1. Their age band
2. The threshold value
3. The sum insured
4. Their member type (primary/additional)

### Example 1: Single Primary Member
- Threshold: ₹5,00,000
- Sum Insured: ₹5,00,000
- Primary Member: Age 30 (18-44 band)

**Premium**: ₹1,800 (primary member only)

### Example 2: Primary + 1 Additional Member
- Threshold: ₹5,00,000
- Sum Insured: ₹5,00,000
- Primary Member: Age 35 (18-44 band) = ₹1,800
- Additional Member: Age 8 (0-17 band) = ₹700

**Total Premium**: ₹1,800 + ₹700 = **₹2,500**

### Example 3: Primary + 2 Additional Members (Different Ages)
- Threshold: ₹5,00,000
- Sum Insured: ₹5,00,000
- Primary Member: Age 50 (45-54 band) = ₹2,900
- Additional Member 1: Age 48 (45-54 band) = ₹1,450
- Additional Member 2: Age 10 (0-17 band) = ₹700

**Total Premium**: ₹2,900 + ₹1,450 + ₹700 = **₹5,050**

## Why Premium Changes with Age

**Scenario**: Change primary member age from 30 to 50
- Age 30 → 18-44 band → ₹1,800
- Age 50 → 45-54 band → ₹2,900
- **Difference**: ₹1,100 increase (61% more)

**Scenario**: Change primary member age from 50 to 62
- Age 50 → 45-54 band → ₹2,900
- Age 62 → 61-65 band → ₹6,700
- **Difference**: ₹3,800 increase (131% more)

## Database Table: nia_topup_mediclaim

Sample data for Threshold ₹5L, Sum Insured ₹5L:

```sql
-- Primary Member Rates
(500000, 500000, 'primary', '18-44', 1800)
(500000, 500000, 'primary', '45-54', 2900)
(500000, 500000, 'primary', '55-60', 4020)
(500000, 500000, 'primary', '61-65', 6700)

-- Additional Member Rates
(500000, 500000, 'additional', '0-17', 700)
(500000, 500000, 'additional', '18-44', 900)
(500000, 500000, 'additional', '45-54', 1450)
(500000, 500000, 'additional', '55-60', 2010)
(500000, 500000, 'additional', '61-65', 3350)
```

## Key Points

1. ✅ **Each member has their own premium** (based on their age band)
2. ✅ **Total premium = sum of all member premiums**
3. ✅ **Age DOES affect premium** (through age bands)
4. ✅ **Additional members cost less than primary** (different rate tables)
5. ✅ **No discounts applied** (unlike Floater which has family discount)

## Current Implementation Status

The current implementation in `src/lib/premium-calculator.ts` is **CORRECT**:
- Fetches primary member premium based on age band
- Fetches each additional member premium based on their age band
- Sums all member premiums for total
- Displays member-wise breakdown in UI

## Test in UI

To verify in Premium Calculator:
1. Go to Premium Calculator page
2. Select "Top-Up Mediclaim"
3. Set Threshold: ₹5,00,000
4. Set Sum Insured: ₹5,00,000
5. Set Primary Member Age: 30
6. Click "Calculate Premium"
7. **Expected Result**: ₹1,800

Now change Primary Age to 50 and recalculate:
8. **Expected Result**: ₹2,900 (increased due to age band change)

Add an additional member (Age 10):
9. **Expected Result**: ₹2,900 + ₹700 = ₹3,600

---

**Conclusion**: Top-Up Mediclaim premium calculation is working correctly. Premium DOES change based on age (through age bands), and each member contributes their own premium to the total.
