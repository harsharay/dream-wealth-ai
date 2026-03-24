import { useState, type ChangeEvent } from "react";
import { simulateScenario, formatCurrency, getScoreColor } from "@/lib/financial-engine";
import type { FinancialData, ScenarioParams } from "@/types/finance";

interface ScenarioSimulatorProps {
  data: FinancialData;
}

export function ScenarioSimulator({ data }: ScenarioSimulatorProps) {
  const [params, setParams] = useState<ScenarioParams>({
    additionalInvestment: 5000,
    expenseReduction: 3000,
    loanPrepayment: 100000,
  });

  const { current, projected } = simulateScenario(data, params);

  const updateParam = (field: keyof ScenarioParams, value: string) => {
    setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const inputClass = "neu-input w-full text-sm text-foreground bg-background";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  const comparison = (label: string, currentVal: number, projectedVal: number, format: (v: number) => string) => {
    const improved = projectedVal > currentVal;
    return (
      <div className="flex justify-between items-center py-2">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-foreground">{format(currentVal)}</span>
          <span className="text-muted-foreground">→</span>
          <span className={improved ? "text-success font-semibold" : "text-danger font-semibold"}>
            {format(projectedVal)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Scenario Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Extra Monthly Investment</label>
            <input
              type="number"
              className={inputClass}
              value={params.additionalInvestment || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("additionalInvestment", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Monthly Expense Cut</label>
            <input
              type="number"
              className={inputClass}
              value={params.expenseReduction || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("expenseReduction", e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Loan Prepayment (lump sum)</label>
            <input
              type="number"
              className={inputClass}
              value={params.loanPrepayment || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("loanPrepayment", e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Projected Impact (12 months)</h3>
        <div className="divide-y divide-border">
          {comparison("Net Worth", current.netWorth, projected.netWorth, formatCurrency)}
          {comparison("Savings Rate", current.savingsRate, projected.savingsRate, (v) => `${v.toFixed(1)}%`)}
          {comparison("Debt-to-Income", current.debtToIncomeRatio, projected.debtToIncomeRatio, (v) => `${v.toFixed(1)}%`)}
          <div className="flex justify-between items-center py-2">
            <span className="text-sm text-muted-foreground">Health Score</span>
            <div className="flex items-center gap-3 text-sm">
              <span className={`font-semibold ${getScoreColor(current.healthScore)}`}>{current.healthScore}</span>
              <span className="text-muted-foreground">→</span>
              <span className={`font-semibold ${getScoreColor(projected.healthScore)}`}>{projected.healthScore}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
