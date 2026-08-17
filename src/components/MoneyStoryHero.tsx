import { getScoreColor } from "@/lib/financial-engine";
import { NotebookText, Wallet, Percent, Activity } from "lucide-react";

export interface MoneyStoryProofMetric {
  label: string;
  value: string;
  /** Icon tint: purple | green | orange */
  tone: "purple" | "green" | "orange";
  icon: "wallet" | "percent" | "activity";
}

interface MoneyStoryHeroProps {
  healthScore: number;
  healthLabel: string;
  headline: string;
  metrics: MoneyStoryProofMetric[];
}

const TONE_STYLES = {
  purple: {
    bg: "bg-violet-100",
    icon: "text-violet-700",
  },
  green: {
    bg: "bg-emerald-100",
    icon: "text-emerald-700",
  },
  orange: {
    bg: "bg-orange-100",
    icon: "text-orange-700",
  },
} as const;

const ICONS = {
  wallet: Wallet,
  percent: Percent,
  activity: Activity,
} as const;

export function MoneyStoryHero({
  healthScore,
  healthLabel,
  headline,
  metrics,
}: MoneyStoryHeroProps) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (Math.min(100, Math.max(0, healthScore)) / 100) * circumference;
  const scoreColor =
    healthScore >= 75
      ? "hsl(158, 64%, 42%)"
      : healthScore >= 50
        ? "hsl(45, 93%, 52%)"
        : "hsl(0, 84%, 60%)";

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border/70 bg-[#F7F7F8] shadow-sm">
      {/* Top: gauge + story */}
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-8 px-5 pt-5 pb-5 sm:px-6 sm:pt-6 sm:pb-6">
        <div className="shrink-0 flex justify-center sm:justify-start">
          <div className="relative w-[7.25rem] h-[7.25rem]">
            <svg width="116" height="116" viewBox="0 0 100 100" className="-rotate-90">
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="hsl(220 14% 90%)"
                strokeWidth="9"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreColor}
                strokeWidth="9"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-mono text-[2rem] leading-none font-black ${getScoreColor(healthScore)}`}
                style={
                  healthScore >= 50 && healthScore < 75
                    ? { color: "hsl(45, 93%, 42%)" }
                    : undefined
                }
              >
                {healthScore}
              </span>
              <span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {healthLabel}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 space-y-2.5 min-w-0 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-violet-600">
            <NotebookText className="w-3.5 h-3.5" />
            Your money story
          </div>
          <h2 className="font-sans text-lg sm:text-xl font-bold text-foreground leading-snug text-balance">
            {headline}
          </h2>
          <p className="text-sm text-muted-foreground font-medium">
            Expand to get a full diagnosis and personalized insights.
          </p>
        </div>
      </div>

      {/* Bottom: proof metrics — always 3-up; mweb stacks label above icon+value */}
      <div className="border-t border-border/80 px-3 py-4 sm:px-6 sm:py-4">
      <div className="grid grid-flow-col auto-cols-max sm:grid-cols-3 sm:auto-cols-auto">
  {metrics.map((item, idx) => {
    const Icon = ICONS[item.icon];
    const tone = TONE_STYLES[item.tone];

    return (
      <div
        key={item.label}
        className={`min-w-0 px-3 sm:px-4 ${
          idx > 0 ? "border-l border-border/80" : ""
        }`}
      >
        {/* Mobile */}
        <div className="sm:hidden flex flex-col gap-1.5">
          <p className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground leading-tight">
            {item.label}
          </p>

          <div className="flex items-center gap-1.5 min-w-0">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${tone.bg}`}
            >
              <Icon
                className={`w-3.5 h-3.5 ${tone.icon}`}
                strokeWidth={2.25}
              />
            </div>

            <p className="font-mono text-xs font-bold text-foreground truncate leading-tight">
              {item.value}
            </p>
          </div>
        </div>

        {/* Desktop */}
        <div className="hidden sm:flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone.bg}`}
          >
            <Icon
              className={`w-4 h-4 ${tone.icon}`}
              strokeWidth={2.25}
            />
          </div>

          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {item.label}
            </p>

            <p className="font-mono text-lg font-bold text-foreground truncate leading-tight">
              {item.value}
            </p>
          </div>
        </div>
      </div>
    );
  })}
</div>
      </div>
    </section>
  );
}
