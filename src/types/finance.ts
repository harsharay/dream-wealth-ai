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

/** Named extra money lines (expenses, assets, or liabilities beyond fixed categories). */
export interface CustomMoneyItem {
  label: string;
  amount: number;
}

/** @deprecated Prefer CustomMoneyItem — alias kept for existing expense call sites. */
export type CustomExpenseItem = CustomMoneyItem;

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
  /** Monthly SIP / NPS / other recurring investments (optional; improves investing pillar) */
  monthlyInvestments?: number;
  /** Optional named expense rows beyond the fixed categories */
  customExpenses?: CustomMoneyItem[];
  /** Optional named asset rows (e.g. PPF, FD) — counted with liquid for emergency buffer */
  customAssets?: CustomMoneyItem[];
  /** Optional named liability rows beyond the fixed categories */
  customLiabilities?: CustomMoneyItem[];
}

export interface ScoreBreakdown {
  emergency: number;
  savings: number;
  debt: number;
  investing: number;
  diversification: number;
}

export interface ScoreBreakdownMeta {
  /** True when investing pillar used provisional growth-asset proxy instead of monthlyInvestments */
  investingEstimated: boolean;
  maxPoints: {
    emergency: number;
    savings: number;
    debt: number;
    investing: number;
    diversification: number;
  };
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
  scoreBreakdown: ScoreBreakdown;
  scoreBreakdownMeta: ScoreBreakdownMeta;
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
