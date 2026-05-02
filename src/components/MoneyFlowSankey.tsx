import { ResponsiveContainer, Sankey, Tooltip } from "recharts";
import { formatCurrency } from "@/lib/financial-engine";
import type { FinancialData } from "@/types/finance";

interface MoneyFlowSankeyProps {
  data: FinancialData;
}

const BRANCH_COLORS = {
  income: "hsl(var(--foreground))",
  fixed: "hsl(var(--destructive))",
  essential: "hsl(var(--primary))",
  discretionary: "hsl(var(--secondary))",
  savings: "hsl(var(--accent))",
} as const;

export function MoneyFlowSankey({ data }: MoneyFlowSankeyProps) {
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
  const discretionary = Math.max(0, data.expenses.entertainment + data.expenses.other);
  const savings = Math.max(0, data.monthlyIncome - (fixed + essential + discretionary));

  const inflow = Math.max(data.monthlyIncome, fixed + essential + discretionary + savings);
  const safeInflow = inflow > 0 ? inflow : 1;

  const fixedPct = (fixed / safeInflow) * 100;
  const discretionaryPct = (discretionary / safeInflow) * 100;

  const chartData = {
    nodes: [
      { name: "Income", color: BRANCH_COLORS.income },
      { name: "Fixed (Rent/EMI)", color: BRANCH_COLORS.fixed },
      { name: "Essential (Groceries/Bills)", color: BRANCH_COLORS.essential },
      { name: "Discretionary (Dining/OTT)", color: BRANCH_COLORS.discretionary },
      { name: "Savings", color: BRANCH_COLORS.savings },
    ],
    links: [
      { source: 0, target: 1, value: fixed, color: BRANCH_COLORS.fixed },
      { source: 0, target: 2, value: essential, color: BRANCH_COLORS.essential },
      { source: 0, target: 3, value: discretionary, color: BRANCH_COLORS.discretionary },
      { source: 0, target: 4, value: savings, color: BRANCH_COLORS.savings },
    ],
  };

  const renderColoredNode = (props: any) => {
    const { x, y, width, height, payload } = props;
    return (
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={payload?.color ?? "hsl(var(--foreground))"}
        stroke="hsl(var(--foreground))"
        strokeWidth={1.5}
        rx={4}
      />
    );
  };

  const renderColoredLink = (props: any) => {
    const {
      sourceX,
      targetX,
      sourceY,
      targetY,
      sourceControlX,
      targetControlX,
      linkWidth,
      payload,
    } = props;

    return (
      <path
        d={`
          M${sourceX},${sourceY}
          C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}
        `}
        fill="none"
        stroke={payload?.color ?? "hsl(var(--foreground) / 0.28)"}
        strokeOpacity={0.45}
        strokeWidth={Math.max(1, linkWidth)}
      />
    );
  };

  return (
    <div className="nb-card h-full min-h-[390px] flex flex-col">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2">
        Income Flow Leak Map
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4">
        {`${fixedPct.toFixed(0)}% of your income is "Committed" to Rent/EMI, while ${discretionaryPct.toFixed(0)}% is "Invisible" discretionary UPI-style spend.`}
      </p>

      <div className="flex-1 min-h-[240px]">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={chartData}
            nodePadding={24}
            margin={{ left: 12, right: 12, top: 8, bottom: 8 }}
            node={renderColoredNode}
            link={renderColoredLink}
          >
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
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
          </Sankey>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {chartData.nodes.map((node, index) => (
          <div key={node.name} className="flex items-center gap-1.5 text-[10px] font-bold">
            <span
              className="w-2.5 h-2.5 rounded-sm border-[1.5px] border-foreground"
              style={{ backgroundColor: node.color }}
            />
            <span className="text-foreground/70 uppercase tracking-tighter">{node.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
