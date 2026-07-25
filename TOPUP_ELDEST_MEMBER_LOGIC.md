# Top-Up Mediclaim: Eldest Member Must Be Primary

## Critical Rule for Top-Up Mediclaim Premium Calculation

### The Problem
In Top-Up Mediclaim:
- **Primary member rates are HIGHER** than additional member rates
- Users might incorrectly designate a younger person as primary
- This would result in **INCORRECT and LOWER premiums**

### Example: Why This Matters

**Scenario**: Family with 2 members
- Member 1: Age 30 (18-44 band)
- Member 2: Age 55 (55-60 band)

#### ❌ WRONG Calculation (if user designates younger as primary):
```
Primary (Age 30, 18-44 band) = ₹1,800
Additional (Age 55, 55-60 band) = ₹2,010
Total = ₹3,810
```

#### ✅ CORRECT Calculation (eldest is always primary):
```
Primary (Age 55, 55-60 band) = ₹4,020
Additional (Age 30, 18-44 band) = ₹900
Total = ₹4,920
```

**Difference**: ₹1,110 (29% higher when correctly calculated!)

## The Solution

Our system **automatically identifies the eldest member** and makes them the primary member, regardless of what the user inputs.

### Implementation Logic

```typescript
// Collect all members
let allMembers = [
  { age: input.primaryMemberAge, isPrimary: true },
  ...(input.additionalMembers || []).map(m => ({ age: m.age, isPrimary: false }))
];

// Sort by age descending (eldest first)
allMembers.sort((a, b) => b.age - a.age);

// Eldest becomes primary, rest are additional
const actualPrimaryAge = allMembers[0].age;
const actualAdditionalAges = allMembers.slice(1).map(m => m.age);
```

## Premium Rate Comparison

For **Threshold ₹5L, Sum Insured ₹5L**:

| Age Band | Primary Rate | Additional Rate | Difference |
|----------|-------------|-----------------|------------|
| 0-17 | N/A | ₹700 | N/A |
| 18-44 | ₹1,800 | ₹900 | ₹900 (100% more) |
| 45-54 | ₹2,900 | ₹1,450 | ₹1,450 (100% more) |
| 55-60 | ₹4,020 | ₹2,010 | ₹2,010 (100% more) |
| 61-65 | ₹6,700 | ₹3,350 | ₹3,350 (100% more) |

**Pattern**: Primary rates are **EXACTLY DOUBLE** the additional rates!

## Why Primary Rates Are Higher

According to New India Assurance policy structure:
1. **Primary member** = Main policyholder (higher risk classification)
2. **Additional members** = Dependent family members (lower risk classification)
3. The eldest member typically has **highest health risk**
4. Therefore, **eldest must be primary** to ensure correct risk pricing

## Test Cases

### Test Case 1: Single Member (No Swap Needed)
**Input**:
- Primary: Age 35
- Additional: None

**Result**: No swap (only 1 member)
- Primary (Age 35) = ₹1,800
- **Total**: ₹1,800

### Test Case 2: Younger Primary, Older Additional (SWAP HAPPENS)
**Input**:
- Primary: Age 30
- Additional: Age 50

**Before Swap**:
- Primary (30) = ₹1,800
- Additional (50) = ₹1,450
- Total = ₹3,250 ❌ WRONG

**After Swap** (automatic):
- Primary (50) = ₹2,900 ← Swapped to primary
- Additional (30) = ₹900 ← Swapped to additional
- **Total**: ₹3,800 ✅ CORRECT

**Difference**: ₹550 (17% higher)

### Test Case 3: Multiple Members (Eldest Becomes Primary)
**Input**:
- Primary: Age 40
- Additional 1: Age 62
- Additional 2: Age 12

**After Auto-Sort**:
- Primary (62) = ₹6,700 ← Eldest becomes primary
- Additional (40) = ₹900
- Additional (12) = ₹700
- **Total**: ₹8,300 ✅ CORRECT

If we used Age 40 as primary:
- Primary (40) = ₹1,800
- Additional (62) = ₹3,350
- Additional (12) = ₹700
- Total = ₹5,850 ❌ WRONG (₹2,450 less!)

## User Experience

**In the UI:**
- Users enter "Primary Member Age" and "Additional Members"
- The system displays member-wise premium breakdown
- Members are sorted by premium amount (highest to lowest)
- Users can see that the eldest member has the highest premium
- The total is always correctly calculated

**No user confusion because:**
- The breakdown clearly shows each member's age and premium
- The sorting makes it obvious that older = higher premium
- The system handles the calculation correctly behind the scenes

## Database Structure

```sql
-- Primary member rates (higher)
INSERT INTO nia_topup_mediclaim (threshold, sum_insured, member_type, age_band, premium) VALUES
(500000, 500000, 'primary', '18-44', 1800),
(500000, 500000, 'primary', '45-54', 2900),
(500000, 500000, 'primary', '55-60', 4020),
(500000, 500000, 'primary', '61-65', 6700);

-- Additional member rates (lower)
INSERT INTO nia_topup_mediclaim (threshold, sum_insured, member_type, age_band, premium) VALUES
(500000, 500000, 'additional', '0-17', 700),
(500000, 500000, 'additional', '18-44', 900),
(500000, 500000, 'additional', '45-54', 1450),
(500000, 500000, 'additional', '55-60', 2010),
(500000, 500000, 'additional', '61-65', 3350);
```

## Summary

✅ **Fixed**: Eldest member is ALWAYS primary member  
✅ **Automatic**: System handles swapping behind the scenes  
✅ **Correct**: Premium calculation matches insurance company rates  
✅ **Transparent**: UI shows member-wise breakdown clearly  

**Result**: Accurate Top-Up Mediclaim premium calculation every time!
