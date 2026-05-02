import { formatCurrency } from "@/lib/financial-engine";
import { Mountain } from "lucide-react";

interface FIProgressWidgetProps {
  fiRatio: number;
  investedAssets: number;
  targetRetirementCorpus: number;
  estimatedRetirementAge: number | null;
}

export function FIProgressWidget({
  fiRatio,
  investedAssets,
  targetRetirementCorpus,
  estimatedRetirementAge,
}: FIProgressWidgetProps) {
  const targetRetirementAge = 60;
  const progressPercent = Math.min(100, Math.max(0, fiRatio * 100));
  const onTrack = estimatedRetirementAge !== null ? estimatedRetirementAge <= targetRetirementAge : null;

  return (
    <div className="nb-card h-full min-h-[280px] flex flex-col gap-4">
      <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
        <Mountain className="w-4 h-4" />
        FI Progress
      </h3>

      <div className="space-y-2">
        <div className="w-full h-4 rounded-full bg-muted border-2 border-foreground overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground uppercase">
          <span>Funded</span>
          <span>{progressPercent.toFixed(1)}%</span>
        </div>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        You have funded <span className="font-bold text-foreground">{progressPercent.toFixed(0)}%</span> of your retirement corpus.
        {" "}
        {estimatedRetirementAge !== null
          ? (
            <>
              You are projected to retire by age{" "}
              <span className="font-bold text-foreground">{estimatedRetirementAge}</span>{" "}
              (target: {targetRetirementAge}){" "}
              <span className={`font-bold ${onTrack ? "text-success" : "text-warning"}`}>
                {onTrack ? "On track" : "Needs acceleration"}
              </span>.
            </>
          )
          : "Increase your monthly surplus to estimate your retirement timeline (target age 60)."}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-auto">
        <div className="rounded-lg border-2 border-foreground/60 bg-accent/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Invested Assets</p>
          <p className="font-mono text-sm font-black text-foreground">{formatCurrency(investedAssets)}</p>
        </div>
        <div className="rounded-lg border-2 border-foreground/60 bg-secondary/20 p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Target Corpus</p>
          <p className="font-mono text-sm font-black text-foreground">{formatCurrency(targetRetirementCorpus)}</p>
        </div>
      </div>
    </div>
  );
}
