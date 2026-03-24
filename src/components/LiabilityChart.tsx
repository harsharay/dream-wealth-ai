import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { formatCurrency } from "@/lib/financial-engine";
import type { Liabilities } from "@/types/finance";

interface LiabilityChartProps {
  liabilities: Liabilities;
}

const LABELS: Record<keyof Liabilities, string> = {
  homeLoan: "Home Loan",
  personalLoan: "Personal Loan",
  creditCardDebt: "Credit Card",
  otherEMIs: "Other EMIs",
};

const COLORS = ["#0ea5e9", "#8b5cf6", "#dc2626", "#d97706"];

export function LiabilityChart({ liabilities }: LiabilityChartProps) {
  const data = (Object.entries(liabilities) as [keyof Liabilities, number][])
    .map(([key, value], i) => ({ name: LABELS[key], value, color: COLORS[i] }));

  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="neu-card">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Liabilities
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8">No liabilities — great!</p>
      </div>
    );
  }

  return (
    <div className="neu-card">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Liabilities
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis type="number" tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
          <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
          <Tooltip formatter={(val: number) => formatCurrency(val)} />
          <Bar dataKey="value" radius={[0, 8, 8, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
