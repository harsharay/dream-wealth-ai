import type { ExpenseCategories } from "@/types/finance";

export type CityTier = "metro" | "tier1" | "tier2";

export type HousingSituation = "rent" | "emi" | "own" | "family";

// ─── Living-expense estimator constants (editable calibration) ───────────────

/** Rent as share of take-home, before floor/cap. */
const RENT_INCOME_SHARE: Record<CityTier, number> = {
  metro: 0.32,
  tier1: 0.28,
  tier2: 0.24,
};

/** Minimum plausible monthly rent by city (₹). */
const RENT_FLOOR: Record<CityTier, number> = {
  metro: 12_000,
  tier1: 8_000,
  tier2: 5_000,
};

/** Soft cap on rent so high incomes don’t imply absurd housing (₹). */
const RENT_CAP: Record<CityTier, number> = {
  metro: 60_000,
  tier1: 40_000,
  tier2: 25_000,
};

/**
 * Fixed monthly living housing cost when not renting.
 * Home-loan EMI is captured under liabilities, not here.
 */
const NON_RENT_HOUSING: Record<HousingSituation, Record<CityTier, number>> = {
  rent: { metro: 0, tier1: 0, tier2: 0 }, // unused — rent uses share/floor/cap
  emi: { metro: 6_000, tier1: 4_000, tier2: 2_500 },
  own: { metro: 4_000, tier1: 3_000, tier2: 2_000 },
  family: { metro: 1_500, tier1: 1_000, tier2: 500 },
};

/**
 * Non-housing living costs as a share of take-home (food, transport, utilities, etc.).
 * Declines with income so high earners are not assumed to spend like mid earners.
 */
const NON_HOUSING_SHARE_BY_INCOME: {
  maxIncome: number; // inclusive upper bound; Infinity for last band
  share: Record<CityTier, number>;
}[] = [
  { maxIncome: 50_000, share: { metro: 0.4, tier1: 0.38, tier2: 0.36 } },
  { maxIncome: 200_000, share: { metro: 0.32, tier1: 0.3, tier2: 0.28 } },
  { maxIncome: Infinity, share: { metro: 0.18, tier1: 0.17, tier2: 0.16 } },
];

/** Soft floor for non-housing so very low incomes still look plausible (₹). */
const NON_HOUSING_FLOOR: Record<CityTier, number> = {
  metro: 12_000,
  tier1: 10_000,
  tier2: 8_000,
};

/** Soft cap growth: non-housing won’t grow unboundedly with HNI income (₹). */
const NON_HOUSING_CAP: Record<CityTier, number> = {
  metro: 90_000,
  tier1: 70_000,
  tier2: 50_000,
};

/**
 * Relative weights for non-housing categories by city (do not need to sum to 1 —
 * normalized at distribute time). Housing is set separately from the estimator.
 */
const NON_HOUSING_WEIGHTS: Record<
  CityTier,
  Omit<ExpenseCategories, "housing">
> = {
  metro: {
    food: 0.17,
    transportation: 0.1,
    utilities: 0.06,
    insurance: 0.05,
    entertainment: 0.07,
    healthcare: 0.05,
    education: 0.08,
    other: 0.04,
  },
  tier1: {
    food: 0.2,
    transportation: 0.1,
    utilities: 0.07,
    insurance: 0.05,
    entertainment: 0.06,
    healthcare: 0.06,
    education: 0.11,
    other: 0.05,
  },
  tier2: {
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

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}

function roundToThousand(n: number): number {
  return Math.round(n / 1000) * 1000;
}

export function estimateHousingCost(
  monthlyIncome: number,
  cityTier: CityTier,
  housingSituation: HousingSituation
): number {
  if (housingSituation === "rent") {
    const raw = monthlyIncome * RENT_INCOME_SHARE[cityTier];
    return clamp(raw, RENT_FLOOR[cityTier], RENT_CAP[cityTier]);
  }
  return NON_RENT_HOUSING[housingSituation][cityTier];
}

function estimateNonHousingCost(monthlyIncome: number, cityTier: CityTier): number {
  const band =
    NON_HOUSING_SHARE_BY_INCOME.find((b) => monthlyIncome <= b.maxIncome) ??
    NON_HOUSING_SHARE_BY_INCOME[NON_HOUSING_SHARE_BY_INCOME.length - 1];
  const raw = monthlyIncome * band.share[cityTier];
  return clamp(raw, NON_HOUSING_FLOOR[cityTier], NON_HOUSING_CAP[cityTier]);
}

/**
 * Bottom-up monthly *living* expense estimate (no EMIs / investments).
 * Factors city tier, housing situation, and income elasticity.
 */
export function estimateMonthlyLivingExpenses(params: {
  monthlyIncome: number;
  cityTier: CityTier;
  housingSituation: HousingSituation;
}): number {
  const { monthlyIncome, cityTier, housingSituation } = params;
  if (monthlyIncome <= 0) return 0;

  const housing = estimateHousingCost(monthlyIncome, cityTier, housingSituation);
  const nonHousing = estimateNonHousingCost(monthlyIncome, cityTier);
  const total = housing + nonHousing;

  // Never seed more than ~85% of take-home as living costs (safety rail).
  const capped = Math.min(total, monthlyIncome * 0.85);
  return Math.max(0, roundToThousand(capped));
}

const NON_HOUSING_KEYS = [
  "food",
  "transportation",
  "utilities",
  "insurance",
  "entertainment",
  "healthcare",
  "education",
] as const satisfies readonly (keyof Omit<ExpenseCategories, "housing" | "other">)[];

/**
 * Split a living-expense total into categories.
 * Housing is pinned to the bottom-up housing estimate (clamped into the total);
 * the remainder is split across non-housing using city weights.
 * This keeps breakdown in sync with `estimateMonthlyLivingExpenses`.
 */
export function distributeExpenses(
  total: number,
  cityTier: CityTier,
  housingSituation: HousingSituation = "rent",
  monthlyIncome = 0
): ExpenseCategories {
  if (total <= 0) {
    return {
      housing: 0,
      food: 0,
      transportation: 0,
      utilities: 0,
      insurance: 0,
      entertainment: 0,
      healthcare: 0,
      education: 0,
      other: 0,
    };
  }

  const incomeForHousing = monthlyIncome > 0 ? monthlyIncome : total;
  let housing = Math.round(
    estimateHousingCost(incomeForHousing, cityTier, housingSituation)
  );
  // Housing cannot consume the whole total — leave room for essentials.
  housing = clamp(housing, 0, Math.max(0, total - 1_000));

  const remainder = Math.max(0, total - housing);
  const weights = NON_HOUSING_WEIGHTS[cityTier];
  const weightSum =
    NON_HOUSING_KEYS.reduce((s, k) => s + weights[k], 0) + weights.other;

  const result = { housing } as ExpenseCategories;
  let allocated = housing;

  for (const key of NON_HOUSING_KEYS) {
    const val = Math.round(remainder * (weights[key] / weightSum));
    result[key] = val;
    allocated += val;
  }

  result.other = Math.max(0, total - allocated);
  return result;
}

/**
 * @deprecated Prefer `estimateMonthlyLivingExpenses` — flat ratios ignore housing & income elasticity.
 */
export const DEFAULT_EXPENSE_RATIO: Record<CityTier, number> = {
  metro: 0.72,
  tier1: 0.65,
  tier2: 0.6,
};
