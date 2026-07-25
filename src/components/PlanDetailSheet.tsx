import { X, ArrowRight } from "lucide-react";
import { QUEST_COPY } from "@/lib/quest-copy";
import { clampDurationWeeks } from "@/lib/mission-plan";

export interface PlanDetailFocus {
  id: string;
  title: string;
}

export interface PlanDetailPlan {
  title: string;
  description: string;
  vision: string;
  impact_bullets: string[];
  difficulty: "Hard" | "Medium" | "Easy";
  duration_weeks: number;
}

export interface PlanDetailSheetProps {
  open: boolean;
  plan: PlanDetailPlan | null;
  focuses: PlanDetailFocus[];
  isActive: boolean;
  isDisabled: boolean;
  onClose: () => void;
  onStart: () => void;
}

const difficultyColors: Record<string, string> = {
  Hard: "bg-danger/20 border-danger text-danger",
  Medium: "bg-accent/20 border-accent text-accent",
  Easy: "bg-success/20 border-success text-success",
};

/**
 * Full plan detail overlay for mobile plan picker (neo-brutalist).
 */
export function PlanDetailSheet({
  open,
  plan,
  focuses,
  isActive,
  isDisabled,
  onClose,
  onStart,
}: PlanDetailSheetProps) {
  if (!open || !plan) return null;

  const weeks = clampDurationWeeks(plan.duration_weeks);
  const diffStyle = difficultyColors[plan.difficulty] || difficultyColors.Medium;
  const ctaLabel = isActive
    ? QUEST_COPY.resumePlan
    : isDisabled
      ? QUEST_COPY.lockedPlan
      : QUEST_COPY.startPlan;

  return (
    <div
      className="fixed inset-0 z-[105] flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-0 sm:p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-detail-title"
        className="bg-card border-4 border-foreground rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative animate-in slide-in-from-bottom-4 sm:zoom-in-95 duration-200"
        style={{ boxShadow: "6px 6px 0px 0px hsl(var(--foreground))" }}
      >
        <div className="p-6 md:p-8 relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-muted rounded-lg transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          {isActive && (
            <p className="text-[10px] font-bold uppercase tracking-wide text-success mb-2">
              {QUEST_COPY.activeBadge}
            </p>
          )}

          <div
            className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide mb-3 border ${diffStyle}`}
          >
            {plan.difficulty} · {weeks} weeks
          </div>

          <h2
            id="plan-detail-title"
            className="text-xl md:text-2xl font-black leading-snug mb-3 pr-10"
          >
            {plan.title}
          </h2>

          {plan.vision && (
            <p className="text-xs text-muted-foreground leading-relaxed mb-4 rounded-xl bg-muted/60 px-3 py-2.5">
              {plan.vision}
            </p>
          )}

          <p className="text-sm text-muted-foreground leading-relaxed mb-5">
            {plan.description}
          </p>

          {focuses.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-5">
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground w-full mb-0.5">
                {QUEST_COPY.solvesLabel}
              </span>
              {focuses.map((f) => (
                <span
                  key={f.id}
                  className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border border-foreground/25 bg-muted/50"
                >
                  {f.title}
                </span>
              ))}
            </div>
          )}

          {(plan.impact_bullets?.length ?? 0) > 0 && (
            <div className="space-y-2.5 mb-8">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                {QUEST_COPY.planBenefits}
              </p>
              {plan.impact_bullets.map((bullet, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <p className="text-sm leading-snug text-foreground/90">{bullet}</p>
                </div>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={onStart}
            disabled={isDisabled}
            className={`w-full py-3.5 border-2 border-foreground rounded-xl font-black uppercase tracking-wide text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
              isActive
                ? "bg-success text-success-foreground"
                : "bg-foreground text-background"
            }`}
          >
            {ctaLabel} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
