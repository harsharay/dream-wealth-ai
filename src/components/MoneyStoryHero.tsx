import { getScoreColor } from "@/lib/financial-engine";
import { NotebookText } from "lucide-react";

interface MoneyStoryHeroProps {
  healthScore: number;
  healthLabel: string;
  headline: string;
}

export function MoneyStoryHero({ healthScore, healthLabel, headline }: MoneyStoryHeroProps) {
  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (Math.min(100, Math.max(0, healthScore)) / 100) * circumference;
  const scoreColor =
    healthScore >= 75 ? "hsl(158, 64%, 42%)" : healthScore >= 50 ? "hsl(45, 93%, 58%)" : "hsl(0, 84%, 60%)";

  return (
    <section className="nb-card relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(var(--primary)) 0%, transparent 45%), radial-gradient(circle at 80% 0%, hsl(var(--accent)) 0%, transparent 40%)",
        }}
      />
      <div className="relative flex flex-col md:flex-row md:items-center gap-8">
        <div className="shrink-0 flex flex-col items-center gap-2">
          <div className="relative w-28 h-28">
            <svg width="112" height="112" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`font-mono text-3xl font-black ${getScoreColor(healthScore)}`}>
                {healthScore}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {healthLabel}
              </span>
            </div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Your money story
          </p>
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground">
            <NotebookText className="w-3.5 h-3.5 text-primary" />
            Summary
          </div>
          <h2 className="font-sans text-xl md:text-2xl font-bold text-foreground leading-snug text-balance">
            {headline}
          </h2>
          <p className="text-sm text-muted-foreground font-medium max-w-2xl">
            This is what matters right now — not a chart dump. Expand the checkup below, then dig into
            a full diagnosis when you&apos;re ready.
          </p>
        </div>
      </div>
    </section>
  );
}
