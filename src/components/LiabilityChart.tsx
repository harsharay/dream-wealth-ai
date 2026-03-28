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
  others: "Others",
};

const COLORS = ["hsl(200, 80%, 55%)", "hsl(258, 90%, 66%)", "hsl(0, 84%, 60%)", "hsl(45, 93%, 58%)"];

export function LiabilityChart({ liabilities }: LiabilityChartProps) {
  const data = (Object.entries(liabilities) as [keyof Liabilities, number][])
    .map(([key, value], i) => ({ name: LABELS[key], value, color: COLORS[i] }));

  const hasData = data.some(d => d.value > 0);

  if (!hasData) {
    return (
      <div className="nb-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Liabilities
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8 font-medium">No liabilities — great! 🎉</p>
      </div>
    );
  }

  return (
    <div className="nb-card">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Liabilities
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} layout="vertical" margin={{ left: 20 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
            stroke="hsl(var(--foreground) / 0.2)"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: 600 }}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={90}
            stroke="hsl(var(--foreground) / 0.2)"
            tick={{ fill: "hsl(var(--foreground))", fontSize: 11, fontWeight: 700 }}
          />
          <Tooltip
            formatter={(val: number) => formatCurrency(val)}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--foreground))",
              borderRadius: "8px",
              boxShadow: "4px 4px 0px 0px hsl(var(--foreground))",
              color: "hsl(var(--foreground))"
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            minPointSize={4}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
