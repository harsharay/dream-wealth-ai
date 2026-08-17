import { useMemo } from "react";
import {
  getScoreColor,
  getScoreLabel,
  SCORE_PILLAR_LABELS,
} from "@/lib/financial-engine";
import type { ScoreBreakdown, ScoreBreakdownMeta } from "@/types/finance";

interface HealthScoreGaugeProps {
  score: number;
  breakdown?: ScoreBreakdown;
  breakdownMeta?: ScoreBreakdownMeta;
}

const PILLAR_ORDER: (keyof ScoreBreakdown)[] = [
  "emergency",
  "savings",
  "debt",
  "investing",
  "diversification",
];

export function HealthScoreGauge({ score, breakdown, breakdownMeta }: HealthScoreGaugeProps) {
  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  const strokeColor = useMemo(() => {
    if (score >= 75) return "hsl(158, 64%, 42%)";
    if (score >= 50) return "hsl(45, 93%, 58%)";
    return "hsl(0, 84%, 60%)";
  }, [score]);

  return (
    <div className="nb-card flex flex-col items-center justify-center h-full gap-3">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
        Financial Health
      </h3>
      <div className="relative score-ring">
        <svg width="160" height="160" viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="hsl(0, 0%, 90%)"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={strokeColor}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`font-mono text-4xl font-bold ${colorClass}`}>{score}</span>
          <span className="text-xs text-muted-foreground font-bold">{label}</span>
        </div>
      </div>

      {breakdown && breakdownMeta && (
        <div className="w-full space-y-2 pt-1 border-t border-foreground/10">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-center">
            Score breakdown
          </p>
          {PILLAR_ORDER.map((key) => {
            const earned = breakdown[key];
            const max = breakdownMeta.maxPoints[key];
            const pct = max > 0 ? (earned / max) * 100 : 0;
            return (
              <div key={key} className="space-y-0.5">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-muted-foreground">
                    {SCORE_PILLAR_LABELS[key]}
                    {key === "investing" && breakdownMeta.investingEstimated ? " · est." : ""}
                  </span>
                  <span className="font-mono text-foreground">
                    {earned}/{max}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted border border-foreground/15 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
