import { formatCurrency } from "@/lib/financial-engine";
import type { FinancialData } from "@/types/finance";

interface MobileMoneyFlowCardProps {
  data: FinancialData;
}

const BRANCH_COLORS = {
  fixed: "hsl(var(--destructive))",
  essential: "hsl(var(--primary))",
  discretionary: "hsl(var(--secondary))",
  savings: "hsl(var(--accent))",
} as const;

export function MobileMoneyFlowCard({ data }: MobileMoneyFlowCardProps) {
  const fixed = Math.max(0, data.expenses.housing);
  const essential = Math.max(
    0,
    data.expenses.food +
      data.expenses.utilities +
      data.expenses.transportation +
      data.expenses.insurance +
      data.expenses.healthcare +
      data.expenses.education
  );
  const discretionary = Math.max(
    0,
    data.expenses.entertainment +
      data.expenses.other +
      (data.customExpenses ?? []).reduce((sum, item) => sum + (item.amount || 0), 0)
  );
  const savings = Math.max(0, data.monthlyIncome - (fixed + essential + discretionary));
  const inflow = Math.max(data.monthlyIncome, fixed + essential + discretionary + savings);
  const safeInflow = inflow > 0 ? inflow : 1;

  const rows = [
    { name: "Fixed (Rent/EMI)", value: fixed, color: BRANCH_COLORS.fixed },
    { name: "Essential", value: essential, color: BRANCH_COLORS.essential },
    { name: "Discretionary", value: discretionary, color: BRANCH_COLORS.discretionary },
    { name: "Savings", value: savings, color: BRANCH_COLORS.savings },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      <p className="text-xs text-muted-foreground leading-relaxed">
        {formatCurrency(data.monthlyIncome)}/mo splits across committed costs, lifestyle, and savings.
      </p>
      <div className="h-3.5 w-full overflow-hidden rounded-full bg-muted flex">
        {rows.map((row) => {
          const width = (row.value / safeInflow) * 100;
          if (width <= 0) return null;
          return (
            <div
              key={row.name}
              className="h-full"
              style={{ width: `${width}%`, backgroundColor: row.color }}
              title={`${row.name}: ${formatCurrency(row.value)}`}
            />
          );
        })}
      </div>
      <ul className="space-y-2">
        {rows.map((row) => (
          <li key={row.name} className="flex items-center justify-between gap-3 text-sm">
            <span className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: row.color }} />
              <span className="text-muted-foreground truncate">{row.name}</span>
            </span>
            <span className="font-mono text-xs font-bold tabular-nums text-foreground">
              {formatCurrency(row.value)} · {((row.value / safeInflow) * 100).toFixed(0)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
