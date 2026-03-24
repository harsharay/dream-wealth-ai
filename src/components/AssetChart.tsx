import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/financial-engine";
import type { Assets } from "@/types/finance";

interface AssetChartProps {
  assets: Assets;
}

const COLORS = ["#2b9a66", "#0ea5e9", "#d97706", "#8b5cf6", "#ec4899"];
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
      <div className="neu-card">
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
          Asset Allocation
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8">No assets recorded</p>
      </div>
    );
  }

  return (
    <div className="neu-card">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
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
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
