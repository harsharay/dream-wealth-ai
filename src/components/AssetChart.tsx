import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/financial-engine";
import type { Assets } from "@/types/finance";

interface AssetChartProps {
  assets: Assets;
}

const COLORS = [
  "hsl(var(--accent))",
  "hsl(var(--primary))",
  "hsl(var(--secondary))",
  "hsl(var(--destructive))",
  "hsl(200, 80%, 55%)"
];
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
      <div className="nb-card h-full min-h-[360px] flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
          Asset Allocation
        </h3>
        <p className="text-muted-foreground text-sm text-center py-8 flex-1 flex items-center justify-center">
          No assets recorded
        </p>
      </div>
    );
  }

  const RADIAN = Math.PI / 180;
  const renderCustomizedLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percent,
  }: {
    cx: number;
    cy: number;
    midAngle: number;
    innerRadius: number;
    outerRadius: number;
    percent: number;
  }) => {
    if (percent < 0.05) return null; // Hide for small slices
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="white"
        className="text-[10px] font-black"
        textAnchor="middle"
        dominantBaseline="central"
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <div className="nb-card h-full min-h-[360px] flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-4">
        Asset Allocation
      </h3>
      <div className="flex-1 min-h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={4}
            dataKey="value"
            stroke="hsl(var(--foreground))"
            strokeWidth={2}
            label={renderCustomizedLabel}
            labelLine={false}
          >
            {data.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
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
        </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-2 justify-center">
        {data.map((item, i) => (
          <div key={item.name} className="flex items-center gap-1.5 text-[10px] font-bold">
            <div className="w-2.5 h-2.5 rounded-sm border-[1.5px] border-foreground" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-foreground/70 uppercase tracking-tighter">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
