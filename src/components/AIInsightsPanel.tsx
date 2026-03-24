import type { FinancialMetrics, FinancialData } from "@/types/finance";
import { Sparkles } from "lucide-react";

interface AIInsightsPanelProps {
  metrics: FinancialMetrics;
  data: FinancialData;
}

export function AIInsightsPanel({ metrics, data }: AIInsightsPanelProps) {
  const insights = generateInsights(metrics, data);

  return (
    <div className="nb-card">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-secondary border-2 border-foreground flex items-center justify-center"
             style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
          <Sparkles className="w-4 h-4 text-foreground" />
        </div>
        <h3 className="font-sans font-bold text-foreground text-lg">
          AI Financial Diagnosis
        </h3>
      </div>

      <div className="space-y-6">
        {insights.map((section, i) => (
          <div key={i} className={`rounded-lg p-4 border-2 border-foreground ${section.bgColor}`}
               style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}>
            <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
              {section.emoji} {section.title}
            </h4>
            <ul className="space-y-2">
              {section.items.map((item, j) => (
                <li key={j} className="text-sm text-foreground flex gap-2 font-medium">
                  <span className="shrink-0">{section.bullet}</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function generateInsights(metrics: FinancialMetrics, data: FinancialData) {
  const sections = [];

  const diagnosis: string[] = [];
  if (metrics.healthScore >= 70) {
    diagnosis.push("Your financial health is solid. You're in the top bracket — but there's always room to optimize.");
  } else if (metrics.healthScore >= 40) {
    diagnosis.push("Your finances are mediocre. Not terrible, but not where they should be. Time to get serious.");
  } else {
    diagnosis.push("Your financial health is in critical condition. Every month you delay action costs you real money.");
  }
  diagnosis.push(`Net worth of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(metrics.netWorth)} with ${metrics.savingsRate.toFixed(0)}% savings rate.`);
  sections.push({ title: "Diagnosis", items: diagnosis, emoji: "🩺", bullet: "→", bgColor: "bg-accent/20" });

  const risks: string[] = [];
  if (metrics.liquidityRatio < 1) risks.push("Insufficient emergency fund — you're one job loss away from financial crisis.");
  if (data.liabilities.creditCardDebt > 0) risks.push("Active credit card debt is silently draining your wealth at 36%+ APR.");
  if (metrics.debtToIncomeRatio > 40) risks.push("Dangerously high leverage. You're over-exposed to interest rate risk.");
  if (risks.length === 0) risks.push("No critical risks detected. Stay disciplined.");
  sections.push({ title: "Key Risks", items: risks, emoji: "⚠️", bullet: "✕", bgColor: "bg-danger/10" });

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
  if (opps.length === 0) opps.push("Your allocation looks balanced. Focus on growing each bucket.");
  sections.push({ title: "Missed Opportunities", items: opps, emoji: "💡", bullet: "★", bgColor: "bg-secondary/30" });

  const actions: string[] = [];
  if (data.liabilities.creditCardDebt > 0) actions.push("IMMEDIATE: Pay off credit card debt. This is priority #1.");
  if (metrics.liquidityRatio < 1) actions.push("Build emergency fund to cover 6 months of expenses.");
  actions.push("Automate savings — transfer 20% of income on salary day.");
  if (data.assets.mutualFunds > 0 || data.assets.stocks > 0) {
    actions.push("Review portfolio quarterly. Rebalance if any single asset exceeds 40% allocation.");
  }
  sections.push({ title: "Action Plan", items: actions, emoji: "🎯", bullet: "→", bgColor: "bg-accent/10" });

  return sections;
}
