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

export interface FinancialData {
  monthlyIncome: number;
  expenses: ExpenseCategories;
  assets: Assets;
  liabilities: Liabilities;
  riskAppetite: RiskAppetite;
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

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ScenarioParams {
  additionalInvestment: number;
  expenseReduction: number;
  loanPrepayment: number;
}
