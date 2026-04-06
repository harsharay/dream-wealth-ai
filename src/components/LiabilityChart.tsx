import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts";
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

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--destructive))",
  "hsl(var(--accent))"
];

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
            cursor={{ fill: "transparent" }}
            formatter={(val: number) => formatCurrency(val)}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              borderColor: "hsl(var(--foreground))",
              borderRadius: "8px",
              boxShadow: "4px 4px 0px 0px hsl(var(--foreground))",
              padding: "8px 12px",
            }}
            itemStyle={{
              color: "hsl(var(--foreground))",
              fontSize: "12px",
              fontWeight: "bold",
            }}
            labelStyle={{
              color: "hsl(var(--muted-foreground))",
              fontSize: "10px",
              fontWeight: "bold",
              marginBottom: "4px",
              textTransform: "uppercase",
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            minPointSize={4}
          >
            <Cell key={0} fill={COLORS[0]} />
            <Cell key={1} fill={COLORS[1]} />
            <Cell key={2} fill={COLORS[2]} />
            <Cell key={3} fill={COLORS[3]} />
            <LabelList 
              dataKey="value" 
              position="right" 
              offset={10}
              formatter={(v: number) => v > 0 ? `₹${(v / 1000).toFixed(0)}k` : ""}
              style={{ fill: "hsl(var(--foreground))", fontSize: 10, fontWeight: "900" }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
