# Premium Calculator Visual Guide

## Floater Mediclaim - New UI

### Input Section

```
┌─────────────────────────────────────────────────────────────┐
│ Policy Type                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Floater Mediclaim                                ▼      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Zone                                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Zone 1                                          ▼      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Family Members (Minimum 2 Required)                         │
│ Floater Mediclaim covers the entire family under one sum.   │
│                                                              │
│ Member 1:  ┌──────┐  ┌────────────────┐                    │
│            │  35  │  │ Remove (gray)  │                    │
│            └──────┘  └────────────────┘                    │
│                                                              │
│ Member 2:  ┌──────┐  ┌────────────────┐                    │
│            │  32  │  │ Remove (gray)  │                    │
│            └──────┘  └────────────────┘                    │
│                                                              │
│ Member 3:  ┌──────┐  ┌────────────────┐                    │
│            │  8   │  │ Remove (red)   │                    │
│            └──────┘  └────────────────┘                    │
│                                                              │
│ ┌────────────────┐                                          │
│ │ Add Member     │                                          │
│ └────────────────┘                                          │
│                                                              │
│ Total Members: 3 | Eldest Age: 35 years                     │
│                                                              │
│ Sum Insured                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ₹5,00,000                                       ▼      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ Optional Covers                                              │
│ ☑ Optional Cover I - No Proportionate Deduction             │
│ ☑ Optional Cover II - Maternity Benefit                     │
│ ☐ Optional Cover III - Revision in Cataract Limit           │
│ ☑ Voluntary Co-Pay (20% Co-Pay = 15% Discount)             │
│ ☐ Optional Cover V - Non-Medical Items (₹1,500)             │
│                                                              │
│ Policy Term                                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ 2 Years (5% Discount)                           ▼      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │          Calculate Premium                              │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Premium Breakdown Output

```
┌─────────────────────────────────────────────────────────────┐
│ Premium Breakdown                                            │
│═════════════════════════════════════════════════════════════│
│                                                              │
│ Policy Type:                          Floater Mediclaim     │
│─────────────────────────────────────────────────────────────│
│ Base Premium:                              ₹15,000          │
│ (Blue background, bold)                                      │
│─────────────────────────────────────────────────────────────│
│                                                              │
│ Additional Covers:                                           │
│   + Optional Cover I                        +₹1,200         │
│     (No Proportionate Deduction)            (Blue)          │
│   + Optional Cover II                       +₹800           │
│     (Maternity Benefit)                     (Blue)          │
│─────────────────────────────────────────────────────────────│
│ Subtotal (before discounts):                ₹17,000         │
│ (Gray background, bold)                                      │
│─────────────────────────────────────────────────────────────│
│                                                              │
│ Discounts Applied:                                           │
│   − Voluntary Co-Pay                        −₹2,250         │
│     (20% = 15% discount)                    (Green, bold)   │
│   − Family Discount                         −₹1,700         │
│     (3 members)                             (Green, bold)   │
│   − Long Term Discount                      −₹650           │
│     (2 years)                               (Green, bold)   │
│─────────────────────────────────────────────────────────────│
│ GST (18%):               ₹0 (included)                       │
│─────────────────────────────────────────────────────────────│
│ Total Premium:                              ₹12,400         │
│ (Green background, large, bold)                              │
│═════════════════════════════════════════════════════════════│
│                                                              │
│ Policy Details:                                              │
│ • Sum Insured: ₹5,00,000                                    │
│ • Eldest Member Age: 35 years                               │
│ • Number of Members: 3                                      │
│ • Zone: Zone 1                                              │
│ • Policy Term: 2 years                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Color Coding Legend

| Element                | Background | Text Color | Font Weight |
|------------------------|-----------|-----------|-------------|
| Base Premium           | Blue-50   | Black     | Bold        |
| Additional Covers      | White     | Blue-600  | Normal      |
| Subtotal               | Gray-50   | Black     | Bold        |
| Discounts              | White     | Green-600 | Bold        |
| Total Premium          | Green-50  | Green-600 | Extra Bold  |
| Policy Details         | White     | Gray-600  | Normal      |

## Calculation Flow Diagram

```
┌─────────────────┐
│  Base Premium   │  ₹15,000
│  (Eldest: 35)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ + Optional I    │  +₹1,200
│ + Optional II   │  +₹800
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Subtotal        │  ₹17,000
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ − Vol. Co-Pay   │  −₹2,250 (15% of base)
│   (15%)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ − Family Disc.  │  −₹1,700 (10% for 3 members)
│   (10%)         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ − Long Term     │  −₹650 (5% for 2 years)
│   (5%)          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ TOTAL PREMIUM   │  ₹12,400
└─────────────────┘
```

## Discount Percentage Table

### Family Discount (Floater)
| Members | Discount |
|---------|----------|
| 2       | 7.5%     |
| 3       | 10%      |
| 4+      | 15%      |

### Voluntary Co-Pay
| Co-Pay  | Discount |
|---------|----------|
| 20%     | 15%      |

### Long Term
| Years   | Discount |
|---------|----------|
| 1       | 0%       |
| 2       | 5%       |
| 3       | 7%       |

## Example Scenarios

### Scenario 1: Young Couple (2 Members)
```
Members: Husband (30), Wife (28)
Eldest Age: 30
Sum Insured: ₹5,00,000
Zone: 1
Optional Covers: None
Policy Term: 1 year

Base Premium:        ₹12,000
Family Discount (7.5%): −₹900
─────────────────────────────
Total Premium:       ₹11,100
```

### Scenario 2: Family with 2 Kids (4 Members)
```
Members: Father (38), Mother (35), Child1 (10), Child2 (7)
Eldest Age: 38
Sum Insured: ₹10,00,000
Zone: 1
Optional Covers: I, II
Voluntary Co-Pay: Yes
Policy Term: 2 years

Base Premium:           ₹22,000
Optional Cover I:        +₹2,400
Optional Cover II:       +₹1,200
Subtotal:                ₹25,600
─────────────────────────────────
Vol. Co-Pay (15%):       −₹3,300
Family Discount (15%):   −₹3,345
Long Term (5%):          −₹948
─────────────────────────────────
Total Premium:           ₹18,007
```

### Scenario 3: Parents with Adult Children (3 Members)
```
Members: Father (58), Mother (55), Son (28)
Eldest Age: 58
Sum Insured: ₹5,00,000
Zone: 2
Optional Covers: I, III, V
Policy Term: 3 years

Base Premium:           ₹18,500
Optional Cover I:        +₹1,800
Optional Cover III:      +₹900
Optional Cover V:        +₹4,500 (₹1,500 × 3)
Subtotal:                ₹25,700
─────────────────────────────────
Family Discount (10%):   −₹2,570
Long Term (7%):          −₹1,619
─────────────────────────────────
Total Premium:           ₹21,511
```

## Key Features Highlight

### ✅ Minimum 2 Members
- System enforces minimum family size
- Remove button disabled at 2 members
- Clear error message if attempted

### ✅ Individual Ages
- Each member gets separate age field
- System auto-calculates eldest
- Easy to add/remove members

### ✅ Transparent Breakdown
- Every charge itemized
- Every discount shown clearly
- Running subtotals displayed
- Final total highlighted

### ✅ User-Friendly
- Pre-filled with 2 default members
- Add/Remove buttons clearly labeled
- Validation messages helpful
- Color coding aids understanding

---

**This visual guide helps users understand:**
1. How to input family member details
2. What the premium breakdown looks like
3. How discounts are calculated
4. Real-world pricing examples
