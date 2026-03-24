import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/financial-engine";
import type { Assets } from "@/types/finance";

interface AssetChartProps {
  assets: Assets;
}

const COLORS = ["hsl(158, 64%, 42%)", "hsl(200, 80%, 55%)", "hsl(45, 93%, 58%)", "hsl(258, 90%, 66%)", "hsl(340, 80%, 60%)"];
const LABELS: Record<keyof Assets, string> = {
  bankBalance: "Bank",
  gold: "Gold",
  mutualFunds: "Mutual Funds",
  stocks: "Stocks",
  realEstate: "Real Estate",
};

export function AssetChart({ assets }: AssetChartProps) {
  const data = (Object.entries(assets) as [keyof Assets, number][])
    .filter(([, v]) => v > 0)
    .map(([key, value]) => ({ name: LABELS[key], value }));

  if (data.length === 0) {
    return (
      <div className="nb-card">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Asset Allocation
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8">No assets recorded</p>
      </div>
    );
  }

  return (
    <div className="nb-card">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Asset Allocation
      </h3>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            stroke="hsl(0, 0%, 9%)"
            strokeWidth={2}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(val: number) => formatCurrency(val)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs font-bold">
            <div className="w-3 h-3 rounded-sm border-2 border-foreground" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
