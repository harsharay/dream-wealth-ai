import { useState, type ChangeEvent } from "react";
import { simulateScenario, formatCurrency, getScoreColor } from "@/lib/financial-engine";
import type { FinancialData, ScenarioParams } from "@/types/finance";

interface ScenarioSimulatorProps {
  data: FinancialData;
}

export function ScenarioSimulator({ data }: ScenarioSimulatorProps) {
  const [params, setParams] = useState<ScenarioParams>({
    additionalInvestment: 0,
    expenseReduction: 0,
    loanPrepayment: 0,
  });

  const { current, projected } = simulateScenario(data, params);

  const updateParam = (field: keyof ScenarioParams, value: string) => {
    setParams(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const inputClass = "nb-input w-full text-sm";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

  const comparison = (label: string, currentVal: number, projectedVal: number, format: (v: number) => string) => {
    const improved = projectedVal > currentVal;
    return (
      <div className="flex justify-between items-center py-3 border-b-2 border-foreground/10 last:border-0">
        <span className="text-sm text-foreground font-bold">{label}</span>
        <div className="flex items-center gap-3 text-sm font-mono">
          <span className="text-muted-foreground">{format(currentVal)}</span>
          <span className="text-foreground font-bold">→</span>
          <span className={`font-bold ${improved ? "text-success" : "text-danger"}`}>
            {format(projectedVal)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">🔬 Scenario Parameters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={labelClass}>Extra Monthly Investment</label>
            <input
              type="number"
              className={inputClass}
              value={params.additionalInvestment || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("additionalInvestment", e.target.value)}
              placeholder="₹ 0"
            />
          </div>
          <div>
            <label className={labelClass}>Monthly Expense Cut</label>
            <input
              type="number"
              className={inputClass}
              value={params.expenseReduction || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("expenseReduction", e.target.value)}
              placeholder="₹ 0"
            />
          </div>
          <div>
            <label className={labelClass}>Loan Prepayment (lump sum)</label>
            <input
              type="number"
              className={inputClass}
              value={params.loanPrepayment || ""}
              onChange={(e: ChangeEvent<HTMLInputElement>) => updateParam("loanPrepayment", e.target.value)}
              placeholder="₹ 0"
            />
          </div>
        </div>
      </div>

      <div className="nb-card-accent">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">📊 Projected Impact (12 months)</h3>
        <div>
          {comparison("Net Worth", current.netWorth, projected.netWorth, formatCurrency)}
          {comparison("Savings Rate", current.savingsRate, projected.savingsRate, (v) => `${v.toFixed(1)}%`)}
          {comparison("Debt-to-Income", current.debtToIncomeRatio, projected.debtToIncomeRatio, (v) => `${v.toFixed(1)}%`)}
          <div className="flex justify-between items-center py-3">
            <span className="text-sm text-foreground font-bold">Health Score</span>
            <div className="flex items-center gap-3 text-sm font-mono">
              <span className={`font-bold ${getScoreColor(current.healthScore)}`}>{current.healthScore}</span>
              <span className="text-foreground font-bold">→</span>
              <span className={`font-bold ${getScoreColor(projected.healthScore)}`}>{projected.healthScore}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
