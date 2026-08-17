import type {
  FinancialData,
  FinancialMetrics,
  ScenarioParams,
  ScoreBreakdown,
  ScoreBreakdownMeta,
} from "@/types/finance";

const SCORE_WEIGHTS = {
  emergency: 25,
  savings: 25,
  debt: 20,
  investing: 15,
  diversification: 15,
} as const;

/** Clamp linear ramp: 0 at `lo`, 1 at `hi`. */
function ramp(value: number, lo: number, hi: number): number {
  if (hi <= lo) return value >= hi ? 1 : 0;
  return Math.min(1, Math.max(0, (value - lo) / (hi - lo)));
}

/** Soft saturation past target — full at `target`, gentle taper beyond `softCap`. */
function savingsCurve(ratePct: number): number {
  if (ratePct <= 0) return 0;
  // Linear to 20%, then slower climb to 30% (full), tiny bonus taper to 40%
  if (ratePct <= 20) return ramp(ratePct, 0, 20) * 0.8;
  if (ratePct <= 30) return 0.8 + ramp(ratePct, 20, 30) * 0.2;
  // Soft cap: stay at 1.0 past 30–40% (no penalty for high savers)
  return 1;
}

function debtCurve(dtiPct: number, hasCreditCard: boolean): number {
  // Full points at ≤10% DTI; zero by 60%
  let score = 1 - ramp(dtiPct, 10, 60);
  if (hasCreditCard) score *= 0.85; // credit-card penalty
  return Math.max(0, score);
}

function emergencyCurve(monthsOfExpenses: number): number {
  // 0 at 0 months → full at 6 months (India 3–6 mo guidance)
  return ramp(monthsOfExpenses, 0, 6);
}

function investingCurve(ratePct: number, provisional: boolean): number {
  // Target ~15% of income into investments; provisional (no SIP entered) capped at 70% of pillar
  const raw = ramp(ratePct, 0, 15);
  return provisional ? raw * 0.7 : raw;
}

/** Liquid cash + named other investments (PPF/FD/etc.) — matches Copilot “counted with liquid savings”. */
export function getLiquidAssets(data: FinancialData): number {
  const custom = (data.customAssets ?? []).reduce((a, item) => a + (item.amount || 0), 0);
  return data.assets.bankBalance + custom;
}

export function getTotalAssets(data: FinancialData): number {
  const categories = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const custom = (data.customAssets ?? []).reduce((a, item) => a + (item.amount || 0), 0);
  return categories + custom;
}

export function getTotalLiabilities(data: FinancialData): number {
  const categories = Object.values(data.liabilities).reduce((a, b) => a + b, 0);
  const custom = (data.customLiabilities ?? []).reduce((a, item) => a + (item.amount || 0), 0);
  return categories + custom;
}

export function calculateHealthScoreBreakdown(
  data: FinancialData,
  savingsRate: number,
  debtToIncome: number,
  diversificationScore: number,
  totalExpenses: number
): { breakdown: ScoreBreakdown; meta: ScoreBreakdownMeta; healthScore: number } {
  const liquid = getLiquidAssets(data);
  const monthsBuffer = totalExpenses > 0 ? liquid / totalExpenses : liquid > 0 ? 6 : 0;

  const monthlyInvestments = data.monthlyInvestments ?? 0;
  const growthAssets =
    data.assets.mutualFunds + data.assets.stocks + data.assets.gold + data.assets.realEstate;
  const investingEstimated = monthlyInvestments <= 0;
  // Provisional: treat ~1% of growth corpus / month as implied habit (capped)
  const provisionalRate =
    data.monthlyIncome > 0 ? Math.min(15, (growthAssets * 0.01) / data.monthlyIncome * 100) : 0;
  const investingRatePct =
    data.monthlyIncome > 0
      ? investingEstimated
        ? provisionalRate
        : (monthlyInvestments / data.monthlyIncome) * 100
      : 0;

  const emergency = Math.round(emergencyCurve(monthsBuffer) * SCORE_WEIGHTS.emergency);
  const savings = Math.round(savingsCurve(savingsRate) * SCORE_WEIGHTS.savings);
  const debt = Math.round(
    debtCurve(debtToIncome, data.liabilities.creditCardDebt > 0) * SCORE_WEIGHTS.debt
  );
  const investing = Math.round(
    investingCurve(investingRatePct, investingEstimated) * SCORE_WEIGHTS.investing
  );
  const diversification = Math.round(
    Math.min(100, Math.max(0, diversificationScore)) * (SCORE_WEIGHTS.diversification / 100)
  );

  const breakdown: ScoreBreakdown = {
    emergency,
    savings,
    debt,
    investing,
    diversification,
  };

  const healthScore = Math.min(
    100,
    Math.max(
      0,
      breakdown.emergency +
        breakdown.savings +
        breakdown.debt +
        breakdown.investing +
        breakdown.diversification
    )
  );

  const meta: ScoreBreakdownMeta = {
    investingEstimated,
    maxPoints: { ...SCORE_WEIGHTS },
  };

  return { breakdown, meta, healthScore };
}

export function getTotalExpenses(data: FinancialData): number {
  const categories = Object.values(data.expenses).reduce((a, b) => a + b, 0);
  const custom = (data.customExpenses ?? []).reduce((a, item) => a + (item.amount || 0), 0);
  return categories + custom;
}

export function calculateMetrics(data: FinancialData): FinancialMetrics {
  const totalExpenses = getTotalExpenses(data);
  const totalAssets = getTotalAssets(data);
  const totalLiabilities = getTotalLiabilities(data);
  const netWorth = totalAssets - totalLiabilities;
  const monthlySavings = data.monthlyIncome - totalExpenses;
  const savingsRate = data.monthlyIncome > 0 ? (monthlySavings / data.monthlyIncome) * 100 : 0;
  const debtToIncomeRatio =
    data.monthlyIncome > 0 ? (totalLiabilities / (data.monthlyIncome * 12)) * 100 : 0;
  const liquid = getLiquidAssets(data);
  const liquidityRatio = totalExpenses > 0 ? liquid / (totalExpenses * 3) : 0;

  const assetValues = Object.values(data.assets).filter((v) => v > 0);
  const customAssetTotal = (data.customAssets ?? []).reduce((a, i) => a + (i.amount || 0), 0);
  const categoryCount = assetValues.length + (customAssetTotal > 0 ? 1 : 0);
  // Concentration over fixed buckets + one aggregated “other” slice
  const concentrationAssets: Record<string, number> = { ...data.assets };
  if (customAssetTotal > 0) concentrationAssets.otherCustom = customAssetTotal;
  const assetDiversificationScore =
    totalAssets > 0
      ? Math.min(
          100,
          (categoryCount / 6) * 100 * (1 - getConcentration(concentrationAssets, totalAssets))
        )
      : 0;

  const { breakdown, meta, healthScore } = calculateHealthScoreBreakdown(
    data,
    savingsRate,
    debtToIncomeRatio,
    assetDiversificationScore,
    totalExpenses
  );

  const warnings = generateWarnings(savingsRate, debtToIncomeRatio, liquidityRatio, data, meta);

  return {
    totalAssets,
    totalLiabilities,
    netWorth,
    totalExpenses,
    savingsRate,
    debtToIncomeRatio,
    healthScore,
    liquidityRatio,
    assetDiversificationScore,
    scoreBreakdown: breakdown,
    scoreBreakdownMeta: meta,
    warnings,
  };
}

function getConcentration(assets: object, total: number): number {
  if (total === 0) return 1;
  const values = Object.values(assets);
  const hhi = values.reduce((sum: number, v: number) => sum + Math.pow(v / total, 2), 0);
  return hhi;
}

function generateWarnings(
  savingsRate: number,
  debtToIncome: number,
  liquidity: number,
  data: FinancialData,
  meta: ScoreBreakdownMeta
): string[] {
  const warnings: string[] = [];

  if (savingsRate < 10)
    warnings.push("Your savings rate is dangerously low. You're one emergency away from debt.");
  if (savingsRate < 0)
    warnings.push("You're spending more than you earn. This is unsustainable.");
  if (debtToIncome > 50)
    warnings.push("Your debt-to-income ratio is critical. Prioritize debt reduction immediately.");
  if (debtToIncome > 30)
    warnings.push("Your debt load is high. Consider accelerating repayment.");
  if (liquidity < 0.5)
    warnings.push(
      "You lack adequate emergency funds. Build 3-6 months of expenses in liquid savings."
    );
  if (data.liabilities.creditCardDebt > 0)
    warnings.push("Credit card debt is the most expensive debt. Pay it off before investing.");
  if (data.assets.stocks > 0 && getLiquidAssets(data) < getTotalExpenses(data) * 3) {
    warnings.push("You're investing in stocks without a safety net. Secure emergency funds first.");
  }
  if (meta.investingEstimated && (data.monthlyInvestments ?? 0) <= 0) {
    warnings.push(
      "Monthly SIP / NPS not set — investing score is estimated. Add it to refine accuracy."
    );
  }

  return warnings;
}

export function simulateScenario(
  data: FinancialData,
  scenario: ScenarioParams
): { current: FinancialMetrics; projected: FinancialMetrics } {
  const current = calculateMetrics(data);

  const projected = calculateMetrics({
    ...data,
    expenses: {
      ...data.expenses,
      other: Math.max(0, data.expenses.other - scenario.expenseReduction),
    },
    assets: {
      ...data.assets,
      mutualFunds: data.assets.mutualFunds + scenario.additionalInvestment * 12,
    },
    monthlyInvestments: (data.monthlyInvestments ?? 0) + scenario.additionalInvestment,
    liabilities: {
      ...data.liabilities,
      homeLoan: Math.max(0, data.liabilities.homeLoan - scenario.loanPrepayment),
      personalLoan: Math.max(0, data.liabilities.personalLoan - scenario.loanPrepayment * 0.3),
    },
  });

  return { current, projected };
}

export function getScoreColor(score: number): string {
  if (score >= 75) return "text-success";
  if (score >= 50) return "text-warning";
  return "text-danger";
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  if (score >= 20) return "Poor";
  return "Critical";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export const SCORE_PILLAR_LABELS: Record<keyof ScoreBreakdown, string> = {
  emergency: "Emergency buffer",
  savings: "Savings rate",
  debt: "Debt stress",
  investing: "Investing habit",
  diversification: "Diversification",
};

/** Weakest pillar key by points earned vs max. */
export function getWeakestPillar(
  breakdown: ScoreBreakdown,
  maxPoints: ScoreBreakdownMeta["maxPoints"]
): keyof ScoreBreakdown {
  const keys = Object.keys(breakdown) as (keyof ScoreBreakdown)[];
  return keys.reduce((worst, key) => {
    const ratio = breakdown[key] / maxPoints[key];
    const worstRatio = breakdown[worst] / maxPoints[worst];
    return ratio < worstRatio ? key : worst;
  }, keys[0]);
}

// Empty default data — user must fill in the form
export const emptyFinancialData: FinancialData = {
  monthlyIncome: 0,
  expenses: {
    housing: 0,
    food: 0,
    transportation: 0,
    utilities: 0,
    insurance: 0,
    entertainment: 0,
    healthcare: 0,
    education: 0,
    other: 0,
  },
  assets: {
    bankBalance: 0,
    gold: 0,
    mutualFunds: 0,
    stocks: 0,
    realEstate: 0,
  },
  liabilities: {
    homeLoan: 0,
    personalLoan: 0,
    creditCardDebt: 0,
    others: 0,
  },
  riskAppetite: "medium",
  ageRange: undefined,
  targetRetirementCorpus: undefined,
  monthlyInvestments: 0,
  customExpenses: [],
  customAssets: [],
  customLiabilities: [],
};

// ─── Fallback insights (used when backend is offline) ─────────────────────────
// These are the original static if-else insights, exported so AIInsightsPanel
// can gracefully degrade when the backend proxy is unreachable.
export function generateFallbackInsights(
  metrics: FinancialMetrics,
  data: FinancialData
): { title: string; emoji: string; bullet: string; bgColor: string; items: string[] }[] {
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(n);

  const sections = [];

  const diagnosis: string[] = [];
  if (metrics.healthScore >= 70) {
    diagnosis.push(
      "Your financial health is solid. You're in the top bracket — but there's always room to optimize."
    );
  } else if (metrics.healthScore >= 40) {
    diagnosis.push(
      "Your finances are mediocre. Not terrible, but not where they should be. Time to get serious."
    );
  } else {
    diagnosis.push(
      "Your financial health is in critical condition. Every month you delay action costs you real money."
    );
  }
  diagnosis.push(
    `Net worth of ${fmt(metrics.netWorth)} with ${metrics.savingsRate.toFixed(0)}% savings rate.`
  );
  sections.push({
    title: "Diagnosis",
    items: diagnosis,
    emoji: "🩺",
    bullet: "→",
    bgColor: "bg-accent/20",
  });

  const risks: string[] = [];
  if (metrics.liquidityRatio < 1)
    risks.push("Insufficient emergency fund — you're one job loss away from financial crisis.");
  if (data.liabilities.creditCardDebt > 0)
    risks.push("Active credit card debt is silently draining your wealth at 36%+ APR.");
  if (metrics.debtToIncomeRatio > 40)
    risks.push("Dangerously high leverage. You're over-exposed to interest rate risk.");
  if (risks.length === 0) risks.push("No critical risks detected. Stay disciplined.");
  sections.push({
    title: "Key Risks",
    items: risks,
    emoji: "⚠️",
    bullet: "✕",
    bgColor: "bg-danger/10",
  });

  const opps: string[] = [];
  if (data.assets.mutualFunds === 0 && data.assets.stocks === 0) {
    opps.push("You have zero market exposure. Start a SIP in a Nifty 50 index fund today.");
  }
  if (metrics.savingsRate > 20 && data.assets.realEstate === 0) {
    opps.push("Strong savings rate but no real estate. Consider REITs for diversification.");
  }
  if (data.riskAppetite === "high" && data.assets.stocks < data.assets.bankBalance) {
    opps.push("Your risk appetite is high but most money sits in the bank. Reallocate to equities.");
  }
  if ((data.monthlyInvestments ?? 0) === 0 && metrics.savingsRate > 10) {
    opps.push("You're saving but not investing on autopilot. Set a monthly SIP to compound surplus.");
  }
  if (opps.length === 0) opps.push("Your allocation looks balanced. Focus on growing each bucket.");
  sections.push({
    title: "Missed Opportunities",
    items: opps,
    emoji: "💡",
    bullet: "★",
    bgColor: "bg-secondary/30",
  });

  const actions: string[] = [];
  if (data.liabilities.creditCardDebt > 0)
    actions.push("IMMEDIATE: Pay off credit card debt. This is priority #1.");
  if (metrics.liquidityRatio < 1)
    actions.push("Build emergency fund to cover 6 months of expenses.");
  actions.push("Automate savings — transfer 20% of income on salary day.");
  if (data.assets.mutualFunds > 0 || data.assets.stocks > 0) {
    actions.push(
      "Review portfolio quarterly. Rebalance if any single asset exceeds 40% allocation."
    );
  }
  sections.push({
    title: "Action Plan",
    items: actions,
    emoji: "🎯",
    bullet: "→",
    bgColor: "bg-accent/10",
  });

  return sections;
}
