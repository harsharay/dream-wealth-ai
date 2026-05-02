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
      bg: "bg-accent/45 border-foreground",
    },
    {
      label: "Savings Rate",
      value: `${metrics.savingsRate.toFixed(1)}%`,
      icon: metrics.savingsRate >= 20 ? TrendingUp : TrendingDown,
      positive: metrics.savingsRate >= 20,
      bg: "bg-primary/45 border-foreground",
    },
    {
      label: "Debt-to-Income",
      value: `${metrics.debtToIncomeRatio.toFixed(1)}%`,
      icon: metrics.debtToIncomeRatio <= 30 ? TrendingDown : AlertTriangle,
      positive: metrics.debtToIncomeRatio <= 30,
      bg: "bg-destructive/45 border-foreground",
    },
    {
      label: "Total Assets",
      value: formatCurrency(metrics.totalAssets),
      icon: TrendingUp,
      positive: true,
      bg: "bg-secondary/50 border-foreground",
    },
  ];

  return (
    <div className="grid w-full grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
      {cards.map((card) => {
        return (
          <div
            key={card.label}
            className={`nb-card ${card.bg} flex flex-col justify-center gap-2 h-full transition-all hover:scale-[1.02] active:scale-[0.98] border-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] dark:shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-widest text-foreground">
                {card.label}
              </span>
              <card.icon
                className={`w-4 h-4 ${card.positive ? "text-foreground" : "text-foreground"}`}
              />
            </div>
            <span className="font-mono text-xl font-black text-foreground">
              {card.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}
