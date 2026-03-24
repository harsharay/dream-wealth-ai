import { useMemo } from "react";
import { getScoreColor, getScoreLabel } from "@/lib/financial-engine";

interface HealthScoreGaugeProps {
  score: number;
}

export function HealthScoreGauge({ score }: HealthScoreGaugeProps) {
  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;
  const colorClass = getScoreColor(score);
  const label = getScoreLabel(score);

  const strokeColor = useMemo(() => {
    if (score >= 75) return "#2b9a66";
    if (score >= 50) return "#d97706";
    return "#dc2626";
  }, [score]);

  return (
    <div className="neu-card flex flex-col items-center gap-3">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Financial Health
      </h3>
      <div className="relative score-ring">
        <svg width="160" height="160" viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(220 15% 85%)"
            strokeWidth="8"
          />
          <circle
            cx="50" cy="50" r="45"
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
          <span className={`font-display text-4xl font-bold ${colorClass}`}>{score}</span>
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
      </div>
    </div>
  );
}
