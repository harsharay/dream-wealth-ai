import { formatCurrency } from "@/lib/financial-engine";
import type { FinancialMetrics } from "@/types/finance";
import { TrendingUp, TrendingDown, Wallet, AlertTriangle } from "lucide-react";

interface MetricCardsProps {
  metrics: FinancialMetrics;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  const cards = [
    {
      label: "Net Worth",
      value: formatCurrency(metrics.netWorth),
      icon: Wallet,
      positive: metrics.netWorth >= 0,
      bg: "bg-accent",
    },
    {
      label: "Savings Rate",
      value: `${metrics.savingsRate.toFixed(1)}%`,
      icon: metrics.savingsRate >= 20 ? TrendingUp : TrendingDown,
      positive: metrics.savingsRate >= 20,
      bg: "bg-secondary",
    },
    {
      label: "Debt-to-Income",
      value: `${metrics.debtToIncomeRatio.toFixed(1)}%`,
      icon: metrics.debtToIncomeRatio <= 30 ? TrendingDown : AlertTriangle,
      positive: metrics.debtToIncomeRatio <= 30,
      bg: metrics.debtToIncomeRatio > 30 ? "bg-danger" : "bg-card",
    },
    {
      label: "Total Assets",
      value: formatCurrency(metrics.totalAssets),
      icon: TrendingUp,
      positive: true,
      bg: "bg-card",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div key={card.label} className={`nb-card ${card.bg} flex flex-col gap-2`}>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-foreground/60">
              {card.label}
            </span>
            <card.icon
              className={`w-4 h-4 ${card.positive ? "text-success" : "text-danger"}`}
            />
          </div>
          <span className={`font-mono text-xl font-bold ${card.positive ? "text-foreground" : "text-danger"}`}>
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
}
