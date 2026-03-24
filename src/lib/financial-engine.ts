import type { FinancialData, FinancialMetrics, ScenarioParams } from "@/types/finance";

export function calculateMetrics(data: FinancialData): FinancialMetrics {
  const totalExpenses = Object.values(data.expenses).reduce((a, b) => a + b, 0);
  const totalAssets = Object.values(data.assets).reduce((a, b) => a + b, 0);
  const totalLiabilities = Object.values(data.liabilities).reduce((a, b) => a + b, 0);
  const netWorth = totalAssets - totalLiabilities;
  const monthlySavings = data.monthlyIncome - totalExpenses;
  const savingsRate = data.monthlyIncome > 0 ? (monthlySavings / data.monthlyIncome) * 100 : 0;
  const debtToIncomeRatio = data.monthlyIncome > 0 ? (totalLiabilities / (data.monthlyIncome * 12)) * 100 : 0;
  const liquidityRatio = totalExpenses > 0 ? data.assets.bankBalance / (totalExpenses * 3) : 0;

  const assetValues = Object.values(data.assets).filter(v => v > 0);
  const assetDiversificationScore = totalAssets > 0
    ? Math.min(100, (assetValues.length / 5) * 100 * (1 - getConcentration(data.assets, totalAssets)))
    : 0;

  const healthScore = calculateHealthScore(savingsRate, debtToIncomeRatio, assetDiversificationScore, liquidityRatio);
  const warnings = generateWarnings(savingsRate, debtToIncomeRatio, liquidityRatio, data);

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
    warnings,
  };
}

function getConcentration(assets: object, total: number): number {
  if (total === 0) return 1;
  const values = Object.values(assets);
  const hhi = values.reduce((sum, v) => sum + Math.pow(v / total, 2), 0);
  return hhi;
}

function calculateHealthScore(
  savingsRate: number,
  debtToIncome: number,
  diversification: number,
  liquidity: number
): number {
  let score = 0;

  if (savingsRate >= 30) score += 30;
  else if (savingsRate >= 20) score += 25;
  else if (savingsRate >= 10) score += 15;
  else if (savingsRate > 0) score += 5;

  if (debtToIncome <= 10) score += 25;
  else if (debtToIncome <= 30) score += 20;
  else if (debtToIncome <= 50) score += 10;
  else score += 0;

  score += Math.round(diversification * 0.25);

  if (liquidity >= 1) score += 20;
  else if (liquidity >= 0.5) score += 12;
  else if (liquidity > 0) score += 5;

  return Math.min(100, Math.max(0, score));
}

function generateWarnings(
  savingsRate: number,
  debtToIncome: number,
  liquidity: number,
  data: FinancialData
): string[] {
  const warnings: string[] = [];

  if (savingsRate < 10) warnings.push("Your savings rate is dangerously low. You're one emergency away from debt.");
  if (savingsRate < 0) warnings.push("You're spending more than you earn. This is unsustainable.");
  if (debtToIncome > 50) warnings.push("Your debt-to-income ratio is critical. Prioritize debt reduction immediately.");
  if (debtToIncome > 30) warnings.push("Your debt load is high. Consider accelerating repayment.");
  if (liquidity < 0.5) warnings.push("You lack adequate emergency funds. Build 3-6 months of expenses in liquid savings.");
  if (data.liabilities.creditCardDebt > 0) warnings.push("Credit card debt is the most expensive debt. Pay it off before investing.");
  if (data.assets.stocks > 0 && data.assets.bankBalance < Object.values(data.expenses).reduce((a, b) => a + b, 0) * 3) {
    warnings.push("You're investing in stocks without a safety net. Secure emergency funds first.");
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
    otherEMIs: 0,
  },
  riskAppetite: "medium",
};

// TODO: Replace with your OpenAI API key
// This should be stored securely (e.g., environment variable or Lovable Cloud secret)
export const LLM_API_KEY_PLACEHOLDER = "YOUR_OPENAI_API_KEY_HERE";

// TODO: Implement real AI call
export async function getAIInsights(data: FinancialData, metrics: FinancialMetrics): Promise<string> {
  // Placeholder — replace with actual OpenAI API call
  // Example:
  // const response = await fetch("https://api.openai.com/v1/chat/completions", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/json",
  //     "Authorization": `Bearer ${LLM_API_KEY_PLACEHOLDER}`,
  //   },
  //   body: JSON.stringify({
  //     model: "gpt-4o-mini",
  //     messages: [
  //       { role: "system", content: "You are a brutally honest Indian financial advisor. No sugarcoating." },
  //       { role: "user", content: JSON.stringify({ data, metrics }) },
  //     ],
  //   }),
  // });
  // const result = await response.json();
  // return result.choices[0].message.content;

  return "AI insights will be powered by OpenAI. Add your API key to enable personalized analysis.";
}
