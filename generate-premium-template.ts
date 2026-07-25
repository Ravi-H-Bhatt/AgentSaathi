/**
 * Helper script to generate JSON template for premium data
 * 
 * This generates the structure - you need to fill in the actual premium values from PDF
 * 
 * Usage:
 *   npx tsx generate-premium-template.ts > premium-data-template.json
 */

const SUM_INSURED_VALUES = [
  100000,   // ₹1L
  200000,   // ₹2L
  300000,   // ₹3L
  400000,   // ₹4L
  500000,   // ₹5L
  600000,   // ₹6L
  700000,   // ₹7L
  800000,   // ₹8L
  1000000,  // ₹10L
  1200000,  // ₹12L
  1500000,  // ₹15L
];

interface IndividualMediclaimRow {
  zone: string;
  age_min: number;
  age_max: number;
  sum_insured: number;
  premium: number | string;
}

/**
 * Generate template for Individual Mediclaim
 * Ages 11-100 (ages 0-10, 25, 35, 40, 45 already exist)
 */
function generateIndividualMediclaimTemplate(): IndividualMediclaimRow[] {
  const rows: IndividualMediclaimRow[] = [];
  
  // Ages that are MISSING from current seed file
  const missingAges = [
    ...Array.from({ length: 14 }, (_, i) => 11 + i),  // 11-24
    ...Array.from({ length: 9 }, (_, i) => 26 + i),   // 26-34
    ...Array.from({ length: 4 }, (_, i) => 36 + i),   // 36-39
    ...Array.from({ length: 4 }, (_, i) => 41 + i),   // 41-44
    ...Array.from({ length: 55 }, (_, i) => 46 + i),  // 46-100
  ];

  for (const age of missingAges) {
    for (const sumInsured of SUM_INSURED_VALUES) {
      rows.push({
        zone: "zone1",
        age_min: age,
        age_max: age,
        sum_insured: sumInsured,
        premium: "FILL_FROM_PDF", // Replace with actual value from PDF
      });
    }
  }

  return rows;
}

/**
 * Generate template with instructions
 */
function generateTemplate() {
  const template = {
    _instructions: {
      description: "Premium data template for New India Assurance Individual Mediclaim",
      steps: [
        "1. Open the PDF: New India All Mediclaim Premium Chart-08-06-2024 (Page 1)",
        "2. For each age in the 'Age' column, find the premium for each Sum Insured",
        "3. Replace 'FILL_FROM_PDF' with the actual premium value from PDF",
        "4. Remove this '_instructions' object when done",
        "5. Upload via /admin/premium-data interface",
      ],
      example_row: {
        zone: "zone1",
        age_min: 11,
        age_max: 11,
        sum_insured: 100000,
        premium: 3599,
      },
      notes: [
        "This template includes ages 11-24, 26-34, 36-39, 41-44, 46-100",
        "Ages 0-10, 25, 35, 40, 45 are already in the database",
        "Zone 1 = Maharashtra & Gujarat",
        "After completing Zone 1, generate Zone 2 data by changing zone to 'zone2'",
      ],
    },
    missing_ages_count: {
      ages_11_to_24: 14,
      ages_26_to_34: 9,
      ages_36_to_39: 4,
      ages_41_to_44: 4,
      ages_46_to_100: 55,
      total_missing_ages: 86,
      rows_per_age: 11,
      total_rows_needed: 946,
    },
    data: generateIndividualMediclaimTemplate(),
  };

  console.log(JSON.stringify(template, null, 2));
}

/**
 * Generate smaller batches for easier data entry
 */
function generateBatchTemplate(startAge: number, endAge: number) {
  const rows: IndividualMediclaimRow[] = [];
  
  for (let age = startAge; age <= endAge; age++) {
    // Skip ages that already exist
    if ([...Array.from({ length: 11 }, (_, i) => i), 25, 35, 40, 45].includes(age)) {
      continue;
    }
    
    for (const sumInsured of SUM_INSURED_VALUES) {
      rows.push({
        zone: "zone1",
        age_min: age,
        age_max: age,
        sum_insured: sumInsured,
        premium: "FILL_FROM_PDF",
      });
    }
  }

  return {
    _batch_info: {
      age_range: `${startAge}-${endAge}`,
      total_rows: rows.length,
      instruction: "Replace 'FILL_FROM_PDF' with actual premium from PDF Page 1",
    },
    data: rows,
  };
}

// Main execution
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage:");
  console.error("  # Generate full template:");
  console.error("  npx tsx generate-premium-template.ts full");
  console.error("");
  console.error("  # Generate batch (easier to work with):");
  console.error("  npx tsx generate-premium-template.ts batch 11 20");
  console.error("  npx tsx generate-premium-template.ts batch 21 30");
  console.error("  npx tsx generate-premium-template.ts batch 31 40");
  console.error("");
  console.error("Recommended batches:");
  console.error("  Batch 1: ages 11-20  (110 rows)");
  console.error("  Batch 2: ages 21-24  (44 rows)");
  console.error("  Batch 3: ages 26-34  (99 rows)");
  console.error("  Batch 4: ages 36-39  (44 rows)");
  console.error("  Batch 5: ages 41-44  (44 rows)");
  console.error("  Batch 6: ages 46-55  (110 rows)");
  console.error("  Batch 7: ages 56-65  (110 rows)");
  console.error("  Batch 8: ages 66-75  (110 rows)");
  console.error("  Batch 9: ages 76-85  (110 rows)");
  console.error("  Batch 10: ages 86-100 (165 rows)");
  process.exit(1);
}

if (args[0] === "full") {
  generateTemplate();
} else if (args[0] === "batch" && args.length === 3) {
  const startAge = parseInt(args[1]);
  const endAge = parseInt(args[2]);
  console.log(JSON.stringify(generateBatchTemplate(startAge, endAge), null, 2));
} else {
  console.error("Invalid arguments. Use 'full' or 'batch <start> <end>'");
  process.exit(1);
}
