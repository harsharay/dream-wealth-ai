import {
  formatCurrency,
  getScoreLabel,
} from "@/lib/financial-engine";
import type { BackendFinancialMetrics, FinancialData, FinancialMetrics } from "@/types/finance";

export type CheckupStatus = "strong" | "watch" | "risk";

export type FocusIntent = "improve" | "optimize" | "stress_test" | "maintain_and_raise_bar";

export interface CheckupItem {
  id: string;
  title: string;
  status: CheckupStatus;
  summary: string;
  detail: string;
}

export interface QuestFocus {
  id: string;
  title: string;
  status: CheckupStatus;
  summary: string;
  intent: FocusIntent;
  note?: string;
}

export interface MoneyStory {
  headline: string;
  healthLabel: string;
  healthScore: number;
  checkup: CheckupItem[];
  focusId: string;
}

export const STATUS_RANK: Record<CheckupStatus, number> = { risk: 0, watch: 1, strong: 2 };

export const FOCUS_THEME_MAP: Record<string, string> = {
  emergency: "safety",
  debt: "liabilities",
  spending: "leaks",
  investing: "investments",
  future: "goals",
};

export const STRONG_INTENT_OPTIONS: { intent: FocusIntent; label: string }[] = [
  { intent: "optimize", label: "Go further" },
  { intent: "stress_test", label: "Stress-test it" },
  { intent: "maintain_and_raise_bar", label: "Protect & raise the bar" },
];

function monthsLabel(months: number): string {
  const m = Number.isFinite(months) ? months : 0;
  return `${m.toFixed(1)} month${m === 1 ? "" : "s"}`;
}

export function sortCheckupBySeverity(items: CheckupItem[]): CheckupItem[] {
  return [...items].sort((a, b) => STATUS_RANK[a.status] - STATUS_RANK[b.status]);
}

/** Pre-select the two worst checkup rows (risk > watch > strong). */
export function preselectWorstFocusIds(checkup: CheckupItem[], count = 2): string[] {
  return sortCheckupBySeverity(checkup)
    .slice(0, count)
    .map((item) => item.id);
}

export function checkupToQuestFocus(
  item: CheckupItem,
  intent: FocusIntent,
  note?: string
): QuestFocus {
  return {
    id: item.id,
    title: item.title,
    status: item.status,
    summary: item.summary,
    intent: item.status === "strong" ? intent : "improve",
    ...(note?.trim() ? { note: note.trim().slice(0, 120) } : {}),
  };
}

export function buildMoneyStory(
  data: FinancialData,
  metrics: FinancialMetrics,
  backend: BackendFinancialMetrics
): MoneyStory {
  const buffer = Number.isFinite(backend.emergencyBufferMonths) ? backend.emergencyBufferMonths : 0;
  const emi = Number.isFinite(backend.emiStressRatio) ? backend.emiStressRatio : 0;
  const hasCreditCard = data.liabilities.creditCardDebt > 0;
  const stocksWithoutBuffer = data.assets.stocks > 0 && buffer < 3;

  const checkup: CheckupItem[] = [
    {
      id: "emergency",
      title: "Emergency buffer",
      status: buffer >= 6 ? "strong" : buffer >= 3 ? "watch" : "risk",
      summary:
        buffer >= 6
          ? `${monthsLabel(buffer)} of expenses in liquid cash`
          : buffer >= 3
            ? `${monthsLabel(buffer)} covered — aim for 6`
            : `Only ${monthsLabel(buffer)} of expenses covered`,
      detail:
        buffer >= 6
          ? "Your cash cushion can absorb a job loss or big surprise without forcing debt."
          : "Build 3–6 months of essential expenses in a liquid account before accelerating investments.",
    },
    {
      id: "debt",
      title: "Debt pressure",
      status:
        hasCreditCard || emi >= 0.4 || metrics.debtToIncomeRatio > 40
          ? "risk"
          : emi >= 0.25 || metrics.debtToIncomeRatio > 25
            ? "watch"
            : "strong",
      summary: hasCreditCard
        ? `Credit card debt of ${formatCurrency(data.liabilities.creditCardDebt)} outstanding`
        : emi >= 0.4
          ? `EMI takes ${(emi * 100).toFixed(0)}% of income`
          : `Debt-to-income at ${metrics.debtToIncomeRatio.toFixed(0)}%`,
      detail: hasCreditCard
        ? "Credit card interest usually outruns investment returns. Clear this before increasing SIPs."
        : emi >= 0.4
          ? "EMIs above ~40% of income leave little room for savings or shocks. Prioritize reducing obligations."
          : "Keep high-interest and EMI load in check so savings can compound instead of servicing debt.",
    },
    {
      id: "spending",
      title: "Spending & savings",
      status: metrics.savingsRate >= 30 ? "strong" : metrics.savingsRate >= 15 ? "watch" : "risk",
      summary: `Saving ${metrics.savingsRate.toFixed(0)}% of income (${formatCurrency(data.monthlyIncome - metrics.totalExpenses)}/mo)`,
      detail:
        metrics.savingsRate >= 30
          ? "Strong savings rate — keep directing surplus to goals before lifestyle creep expands."
          : metrics.savingsRate >= 15
            ? "Decent savings, but a higher rate would accelerate net worth and emergency funding."
            : "Too little of your income is left after expenses. Cap discretionary spend before anything else.",
    },
    {
      id: "investing",
      title: "Investing readiness",
      status: stocksWithoutBuffer
        ? "risk"
        : metrics.assetDiversificationScore >= 50
          ? "strong"
          : "watch",
      summary: stocksWithoutBuffer
        ? "Invested in stocks without a solid cash safety net"
        : `Diversification score ${metrics.assetDiversificationScore.toFixed(0)}/100`,
      detail: stocksWithoutBuffer
        ? "Market risk without emergency cash means you may sell at the worst time. Secure the buffer first."
        : "Spread across cash, debt, and equity so one asset class cannot sink your plan.",
    },
  ];

  if (backend.fiMetricAvailable && backend.fiRatio !== null && backend.targetRetirementCorpus !== null) {
    const pct = Math.round(backend.fiRatio * 100);
    checkup.push({
      id: "future",
      title: "Future / FI path",
      status: pct >= 25 ? "strong" : pct >= 5 ? "watch" : "risk",
      summary:
        backend.estimatedRetirementAge != null
          ? `${pct}% of target corpus · projected retire age ${backend.estimatedRetirementAge}`
          : `${pct}% of your retirement corpus funded`,
      detail: `Invested assets ${formatCurrency(backend.investedAssets ?? 0)} toward a ${formatCurrency(backend.targetRetirementCorpus)} goal. Consistent investing after fixing cash and debt moves this needle.`,
    });
  }

  const worst = sortCheckupBySeverity(checkup)[0];
  const incomeLabel = formatCurrency(data.monthlyIncome);
  const netWorthLabel = formatCurrency(metrics.netWorth);

  let headline: string;

  if (worst?.id === "emergency" && worst.status !== "strong") {
    headline = `You earn ${incomeLabel}/mo, but your buffer covers only ${buffer.toFixed(1)} months.`;
  } else if (worst?.id === "debt" && worst.status === "risk") {
    headline = hasCreditCard
      ? `Net worth is ${netWorthLabel}, but credit card debt is dragging you down.`
      : `EMI stress is ${((emi) * 100).toFixed(0)}% — limiting your wealth building.`;
  } else if (worst?.id === "spending" && worst.status === "risk") {
    headline = `You save only ${metrics.savingsRate.toFixed(0)}% of your ${incomeLabel}/mo income.`;
  } else if (worst?.id === "investing" && worst.status === "risk") {
    headline = `Your investments lack a safety cushion.`;
  } else if (worst?.status === "strong") {
    headline = `Your finances look solid. Keep building toward your goals.`;
  } else {
    headline = `${netWorthLabel} net worth, ${getScoreLabel(metrics.healthScore).toLowerCase()} health — focus on ${worst.title.toLowerCase()}.`;
  }

  return {
    headline,
    healthLabel: getScoreLabel(metrics.healthScore),
    healthScore: metrics.healthScore,
    checkup,
    focusId: worst?.id ?? checkup[0]?.id ?? "",
  };
}
