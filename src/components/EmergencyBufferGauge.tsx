import { useMemo } from "react";
import { BatteryFull } from "lucide-react";

interface EmergencyBufferGaugeProps {
  emergencyBufferMonths: number;
}

export function EmergencyBufferGauge({ emergencyBufferMonths }: EmergencyBufferGaugeProps) {
  const displayMonths = Number.isFinite(emergencyBufferMonths) ? emergencyBufferMonths : 0;

  // 12-month coverage is treated as fully charged resilience.
  const score = Math.min(100, Math.max(0, (displayMonths / 12) * 100));
  const circumference = 283;
  const offset = circumference - (score / 100) * circumference;

  const strokeColor = useMemo(() => {
    if (displayMonths >= 6) return "hsl(158, 64%, 42%)";
    if (displayMonths >= 3) return "hsl(45, 93%, 58%)";
    return "hsl(0, 84%, 60%)";
  }, [displayMonths]);

  const coverageLabel = displayMonths >= 6 ? "Strong" : displayMonths >= 3 ? "Moderate" : "Low";

  return (
    <div className="nb-card flex flex-col items-center justify-center h-full gap-3 px-3 sm:px-5">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <BatteryFull className="w-4 h-4" />
        Emergency Buffer
      </h3>

      <div className="relative score-ring">
        <svg width="160" height="160" viewBox="0 0 100 100" className="-rotate-90">
          <circle
            cx="50" cy="50" r="45"
            fill="none"
            stroke="hsl(0, 0%, 90%)"
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
          <span className="font-mono text-3xl sm:text-4xl font-bold text-foreground">
            {displayMonths.toFixed(1)}
          </span>
          <span className="text-xs text-muted-foreground font-bold uppercase tracking-wide">
            months
          </span>
        </div>
      </div>

      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        {coverageLabel} resilience
      </p>
      <p className="text-center text-xs sm:text-sm text-muted-foreground leading-relaxed">
        Your liquid cash covers {displayMonths.toFixed(1)} months of your current lifestyle.
      </p>
    </div>
  );
}
