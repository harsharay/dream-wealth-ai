import { Gauge } from "lucide-react";

interface EmiStressGaugeProps {
  emiStressRatio: number;
}

export function EmiStressGauge({ emiStressRatio }: EmiStressGaugeProps) {
  const ratio = Math.max(0, emiStressRatio);
  const percent = ratio * 100;
  const normalized = Math.min(1, ratio / 0.6); // 60% and above treated as max stress.
  const needleAngle = -90 + normalized * 180;

  const zoneLabel = ratio >= 0.4 ? "Red" : ratio >= 0.25 ? "Orange" : "Green";
  const zoneColorClass =
    ratio >= 0.4 ? "text-destructive" : ratio >= 0.25 ? "text-warning" : "text-success";

  return (
    <div className="nb-card h-full min-h-[280px] flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Gauge className="w-4 h-4" />
        EMI Stress Test
      </h3>

      <div className="relative w-full h-32">
        <svg viewBox="0 0 200 120" className="w-full h-full">
          <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--muted))" strokeWidth="16" />
          <path d="M20 100 A80 80 0 0 1 86 24" fill="none" stroke="hsl(var(--primary))" strokeWidth="16" />
          <path d="M86 24 A80 80 0 0 1 126 24" fill="none" stroke="hsl(var(--warning))" strokeWidth="16" />
          <path d="M126 24 A80 80 0 0 1 180 100" fill="none" stroke="hsl(var(--destructive))" strokeWidth="16" />
        </svg>

        <div
          className="absolute left-1/2 bottom-[20px] w-[2px] h-[68px] bg-foreground origin-bottom transition-transform duration-700"
          style={{ transform: `translateX(-50%) rotate(${needleAngle}deg)` }}
        />
        <div className="absolute left-1/2 bottom-[14px] -translate-x-1/2 w-3 h-3 rounded-full bg-foreground border border-background" />
      </div>

      <div className="text-center">
        <p className="font-mono text-2xl font-black text-foreground">{percent.toFixed(1)}%</p>
        <p className={`text-xs font-bold uppercase tracking-wider ${zoneColorClass}`}>
          {zoneLabel} stress zone
        </p>
      </div>

      <p className="text-sm text-muted-foreground text-center leading-relaxed">
        Your EMI stress is <span className={`font-bold ${zoneColorClass}`}>{zoneLabel}</span>.
        {" "}
        {ratio >= 0.4
          ? "You are already in the red zone (above 40% income)."
          : "Adding a new loan can push you into the red zone (above 40% income)."}
      </p>
    </div>
  );
}
