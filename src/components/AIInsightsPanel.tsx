import { useEffect, useState } from "react";
import hash from "object-hash";
import type { FinancialMetrics, FinancialData } from "@/types/finance";
import { Sparkles, Loader2, WifiOff } from "lucide-react";
import { fetchAIInsights, type InsightSection } from "@/lib/llm-service";
import { generateFallbackInsights } from "@/lib/financial-engine";

interface AIInsightsPanelProps {
  metrics: FinancialMetrics;
  data: FinancialData;
}

type Status = "loading" | "success" | "error";

export function AIInsightsPanel({ metrics, data }: AIInsightsPanelProps) {
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const cacheKey = `wealthpilot_insights_${hash(data)}`;

  useEffect(() => {
    let cancelled = false;

    // Check localStorage first
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        // User changed storage format to { data: result, timestamp, version }
        const actualData = parsed.data || parsed;
        if (actualData && actualData.sections) {
          setSections(actualData.sections);
          setStatus("success");
          return;
        }
      } catch (e) {
        console.error("Failed to parse cached insights", e);
      }
    }

    setStatus("loading");
    setSections([]);

    fetchAIInsights(data, metrics)
      .then((result) => {
        if (cancelled) return;
        setSections(result.sections);
        setStatus("success");
        // Save to cache
        localStorage.setItem(cacheKey, JSON.stringify({
          data: result,
          timestamp: Date.now(),
          version: 1
        }));
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.warn("LLM fetch failed, using fallback:", err.message);
        setErrorMsg(err.message);
        // Graceful fallback to static insights
        setSections(generateFallbackInsights(metrics, data));
        setStatus("error");
      });

    return () => { cancelled = true; };
    // Re-fetch if financial data changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(metrics)]);

  const colors = ["bg-accent/20", "bg-secondary/20", "bg-primary/20", "bg-success/20"];

  return (
    <div className="nb-card">
      <div className="flex items-center justify-between gap-2 mb-6">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-secondary border-2 border-foreground flex items-center justify-center"
            style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
          >
            <Sparkles className="w-4 h-4 text-foreground" />
          </div>
          <h3 className="font-sans font-bold text-foreground text-lg">
            AI Financial Diagnosis
          </h3>
        </div>

        {status === "loading" && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Analyzing with Gemini…
          </div>
        )}
        {status === "error" && (
          <div
            className="flex items-center gap-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-2 py-1"
            title={errorMsg}
          >
            <WifiOff className="w-3.5 h-3.5" />
            {errorMsg.includes("429") ? "Too many requests — try again in 15m" : "Fallback mode — backend offline"}
          </div>
        )}
        {status === "success" && (
          <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-md px-2 py-1">
            <Sparkles className="w-3 h-3" />
            Gemini AI
          </div>
        )}
      </div>

      {/* Loading skeleton */}
      {status === "loading" && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-lg p-4 border-2 border-foreground/30 ${colors[(i - 1) % colors.length]}`}
              style={{
                boxShadow: "4px 4px 0px 0px hsl(var(--foreground))",
              }}
            >
              {/* SHIMMER LAYER: Extra vibrant for Neobrutalism */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />

              {/* CONTENT */}
              <div className="relative z-10">
                <div className="h-3 w-28 bg-foreground/30 rounded mb-4 animate-bounce-slow" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-foreground/15 rounded animate-pulse-fast" />
                  <div className="h-3 w-5/6 bg-foreground/15 rounded animate-pulse-fast delay-100" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insight sections */}
      {status !== "loading" && sections.length > 0 && (
        <div className="space-y-6">
          {sections.map((section, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 border-2 border-foreground ${section.bgColor}`}
              style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
                {section.emoji} {section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="text-sm text-foreground flex gap-2 font-medium">
                    <span className="shrink-0">{section.bullet}</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
