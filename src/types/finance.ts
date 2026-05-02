export interface Assets {
  bankBalance: number;
  gold: number;
  mutualFunds: number;
  stocks: number;
  realEstate: number;
}

export interface Liabilities {
  homeLoan: number;
  personalLoan: number;
  creditCardDebt: number;
  others: number;
}

export interface ExpenseCategories {
  housing: number;
  food: number;
  transportation: number;
  utilities: number;
  insurance: number;
  entertainment: number;
  healthcare: number;
  education: number;
  other: number;
}

export type RiskAppetite = "low" | "medium" | "high";
export type AgeRange =
  | "under_20"
  | "20_25"
  | "26_30"
  | "31_35"
  | "36_40"
  | "41_45"
  | "46_50"
  | "51_55"
  | "56_60"
  | "above_60";

export interface FinancialData {
  monthlyIncome: number;
  expenses: ExpenseCategories;
  assets: Assets;
  liabilities: Liabilities;
  riskAppetite: RiskAppetite;
  ageRange?: AgeRange;
  targetRetirementCorpus?: number;
}

export interface FinancialMetrics {
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  totalExpenses: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  healthScore: number;
  liquidityRatio: number;
  assetDiversificationScore: number;
  warnings: string[];
}

export interface BackendFinancialMetrics {
  emergencyBufferMonths: number;
  fiMetricAvailable: boolean;
  fiRatio: number | null;
  targetRetirementCorpus: number | null;
  investedAssets: number | null;
  estimatedRetirementAge: number | null;
  emiStressRatio: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScenarioParams {
  additionalInvestment: number;
  expenseReduction: number;
  loanPrepayment: number;
}
