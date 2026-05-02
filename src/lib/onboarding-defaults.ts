import type { ExpenseCategories } from "@/types/finance";

export type CityTier = "metro" | "tier1" | "tier2";

export type HousingSituation = "rent" | "emi" | "own" | "family";

// Expense ratios by city tier. Each must sum to 1.0 and the "other" key acts as residual.
const EXPENSE_RATIOS: Record<CityTier, Record<keyof ExpenseCategories, number>> = {
  metro: {
    housing: 0.38,
    food: 0.17,
    transportation: 0.10,
    utilities: 0.06,
    insurance: 0.05,
    entertainment: 0.07,
    healthcare: 0.05,
    education: 0.08,
    other: 0.04,
  },
  tier1: {
    housing: 0.30,
    food: 0.20,
    transportation: 0.10,
    utilities: 0.07,
    insurance: 0.05,
    entertainment: 0.06,
    healthcare: 0.06,
    education: 0.11,
    other: 0.05,
  },
  tier2: {
    housing: 0.25,
    food: 0.22,
    transportation: 0.09,
    utilities: 0.08,
    insurance: 0.05,
    entertainment: 0.05,
    healthcare: 0.07,
    education: 0.13,
    other: 0.06,
  },
};

// Override housing ratio for non-rent situations (housing cost assumed lower).
const HOUSING_SITUATION_HOUSING_RATIO: Record<HousingSituation, number | null> = {
  rent: null, // Use default for city tier
  emi: null,  // EMI captured via liabilities; housing still reflects maintenance/rent
  own: 0.05,  // Own outright — much lower housing expense
  family: 0.02, // Living with family — minimal housing cost
};

/**
 * Returns an ExpenseCategories object with values distributed from a given
 * total using the ratio table for the given city tier. The "other" key
 * absorbs any rounding residual so all values always sum exactly to total.
 */
export function distributeExpenses(
  total: number,
  cityTier: CityTier,
  housingSituation: HousingSituation = "rent"
): ExpenseCategories {
  const baseRatios = { ...EXPENSE_RATIOS[cityTier] };

  // Adjust housing ratio if the situation warrants it.
  const housingOverride = HOUSING_SITUATION_HOUSING_RATIO[housingSituation];
  if (housingOverride !== null) {
    const delta = baseRatios.housing - housingOverride;
    baseRatios.housing = housingOverride;
    // Re-distribute the delta proportionally across non-housing, non-other categories.
    const redistributable: (keyof ExpenseCategories)[] = [
      "food", "transportation", "utilities", "insurance", "entertainment", "healthcare", "education",
    ];
    const redistributableSum = redistributable.reduce((s, k) => s + baseRatios[k], 0);
    for (const key of redistributable) {
      baseRatios[key] += delta * (baseRatios[key] / redistributableSum);
    }
  }

  // Apply ratios and round to nearest rupee.
  const result = {} as ExpenseCategories;
  const keys = Object.keys(baseRatios) as (keyof ExpenseCategories)[];
  let allocated = 0;

  for (const key of keys) {
    if (key === "other") continue;
    const val = Math.round(total * baseRatios[key]);
    result[key] = val;
    allocated += val;
  }

  // "other" absorbs residual.
  result.other = Math.max(0, total - allocated);

  return result;
}

/**
 * Income range chips shown in step 1 of onboarding.
 * midpoint is the value stored in monthlyIncome when the chip is tapped.
 */
export const INCOME_RANGES = [
  { label: "< ₹50k", midpoint: 35000 },
  { label: "₹50k – ₹1L", midpoint: 75000 },
  { label: "₹1L – ₹2L", midpoint: 150000 },
  { label: "₹2L – ₹5L", midpoint: 350000 },
  { label: "> ₹5L", midpoint: 600000 },
] as const;

/**
 * Default expense-to-income ratio by city tier.
 * Used to seed the total-expense estimate in step 4.
 */
export const DEFAULT_EXPENSE_RATIO: Record<CityTier, number> = {
  metro: 0.72,
  tier1: 0.65,
  tier2: 0.60,
};
