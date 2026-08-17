import type { InsightSection } from "@/lib/llm-service";
import { splitInsightItems, renderBoldMarkdown } from "@/lib/insight-copy";
import { ChevronLeft, ChevronRight, Loader2, Sparkles, WifiOff } from "lucide-react";

type Status = "loading" | "success" | "error";

const SECTION_TINT: Record<string, { card: string; dot: string }> = {
  Diagnosis: { card: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-600" },
  "Key Risks": { card: "bg-rose-50 dark:bg-rose-500/10", dot: "bg-rose-600" },
  "Action Plan": { card: "bg-violet-50 dark:bg-violet-500/10", dot: "bg-violet-600" },
  "Missed Opportunities": { card: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500" },
};

const CARD = "rounded-2xl border border-neutral-200/80 dark:border-white/10";

interface MobileAIInsightsPanelProps {
  status: Status;
  sections: InsightSection[] | undefined;
  warnings: string[] | undefined;
  historyCount: number;
  historyIndex: number;
  historyLabel: string;
  onOlder: () => void;
  onNewer: () => void;
}

export function MobileAIInsightsPanel({
  status,
  sections,
  warnings,
  historyCount,
  historyIndex,
  historyLabel,
  onOlder,
  onNewer,
}: MobileAIInsightsPanelProps) {
  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#EDE9FE] text-[#6D28D9] flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-neutral-900 dark:text-foreground text-base leading-tight">
              AI Financial Diagnosis
            </h3>
            {historyIndex > 0 && (
              <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-600 mt-0.5">
                Historical
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          {status === "loading" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-neutral-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing
            </span>
          )}
          {status === "error" && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-500/10 px-2 py-1 rounded-full">
              <WifiOff className="w-3.5 h-3.5" />
              Fallback
            </span>
          )}
          {status === "success" && historyIndex === 0 && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-1 rounded-full">
              <Sparkles className="w-3 h-3" />
              Gemini 2.0
            </span>
          )}
        </div>
      </div>

      {historyCount > 0 && (
        <div className="flex items-center justify-center gap-1 p-1 rounded-full bg-neutral-100 dark:bg-white/10">
          <button
            type="button"
            disabled={historyIndex >= historyCount}
            onClick={onOlder}
            className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-700 dark:text-foreground disabled:opacity-30"
            title="Older insights"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-bold uppercase tracking-wide text-neutral-500 w-16 text-center">
            {historyLabel}
          </span>
          <button
            type="button"
            disabled={historyIndex === 0}
            onClick={onNewer}
            className="h-9 w-9 rounded-full flex items-center justify-center text-neutral-700 dark:text-foreground disabled:opacity-30"
            title="Newer insights"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {status === "loading" && (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`${CARD} bg-card p-4 overflow-hidden relative`}>
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-full animate-shimmer" />
              <div className="h-3 w-24 bg-neutral-200 dark:bg-white/10 rounded mb-4" />
              <div className="space-y-2">
                <div className="h-3 w-full bg-neutral-100 dark:bg-white/10 rounded" />
                <div className="h-3 w-5/6 bg-neutral-100 dark:bg-white/10 rounded" />
                <div className="h-3 w-2/3 bg-neutral-100 dark:bg-white/10 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {status !== "loading" && sections && sections.length > 0 && (
        <div className="space-y-3">
          {sections.map((section) => {
            const tint = SECTION_TINT[section.title] ?? {
              card: "bg-card",
              dot: "bg-[#6D28D9]",
            };
            const bullets = splitInsightItems(section.items);
            return (
              <section key={section.title} className={`${CARD} ${tint.card} p-4`}>
                <h4 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-3 flex items-center gap-2">
                  <span>{section.emoji}</span> {section.title}
                </h4>
                <ul className="space-y-2.5">
                  {bullets.map((item, index) => (
                    <li key={`${section.title}-${index}`} className="flex gap-2.5 text-sm text-neutral-800 dark:text-foreground leading-relaxed">
                      <span className={`mt-2 w-1.5 h-1.5 rounded-full shrink-0 ${tint.dot}`} />
                      <span>{renderBoldMarkdown(item)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {status !== "loading" && warnings && warnings.length > 0 && (
        <section className={`${CARD} bg-rose-50 dark:bg-rose-500/10 p-4`}>
          <h4 className="text-[11px] font-bold uppercase tracking-wider text-rose-600 mb-3">
            Critical alerts
          </h4>
          <ul className="space-y-2.5">
            {splitInsightItems(warnings).map((warning, index) => (
              <li key={index} className="flex gap-2.5 text-sm text-neutral-800 dark:text-foreground leading-relaxed">
                <span className="mt-2 w-1.5 h-1.5 rounded-full shrink-0 bg-rose-600" />
                <span>{renderBoldMarkdown(warning)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
