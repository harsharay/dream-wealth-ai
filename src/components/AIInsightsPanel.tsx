import { useEffect, useState } from "react";
import hash from "object-hash";
import { useAuth } from "@/contexts/AuthContext";
import type { FinancialMetrics, FinancialData } from "@/types/finance";
import { Sparkles, Loader2, WifiOff } from "lucide-react";
import { fetchAIInsights, type InsightSection } from "@/lib/llm-service";
import { generateFallbackInsights } from "@/lib/financial-engine";
const ENV = import.meta.env.VITE_ENV;

interface AIInsightsPanelProps {
  metrics: FinancialMetrics;
  data: FinancialData;
}

type Status = "loading" | "success" | "error";

export function AIInsightsPanel({ metrics, data }: AIInsightsPanelProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");

  const cacheKey = `wealthpilot_insights_${hash(data)}`;

  useEffect(() => {
    let cancelled = false;

    // Check localStorage first (local fast cache)
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
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

    if (ENV === "dev") {
      // @ts-ignore - generateInsights is a dev helper defined at the bottom
      setSections(generateInsights(metrics, data));
      setStatus("success");
      return;
    }

    fetchAIInsights(data, metrics, user?.id)
      .then((result) => {
        if (cancelled) return;
        setSections(result.sections);
        setStatus("success");
        // Save to local cache too
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
    // Re-fetch if financial data changes or user logs in
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data), JSON.stringify(metrics), user?.id]);


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


// DEV: Generate these insights from LLM 
function generateInsights(metrics: FinancialMetrics, data: FinancialData) {
  const sections = [];

  const diagnosis: string[] = [];
  if (metrics.healthScore >= 70) {
    diagnosis.push("Your financial health is solid. You're in the top bracket — but there's always room to optimize.");
  } else if (metrics.healthScore >= 40) {
    diagnosis.push("Your finances are mediocre. Not terrible, but not where they should be. Time to get serious.");
  } else {
    diagnosis.push("Your financial health is in critical condition. Every month you delay action costs you real money.");
  }
  diagnosis.push(`Net worth of ${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(metrics.netWorth)} with ${metrics.savingsRate.toFixed(0)}% savings rate.`);
  sections.push({ title: "Diagnosis", items: diagnosis, emoji: "🩺", bullet: "→", bgColor: "bg-accent/20" });

  const risks: string[] = [];
  if (metrics.liquidityRatio < 1) risks.push("Insufficient emergency fund — you're one job loss away from financial crisis.");
  if (data.liabilities.creditCardDebt > 0) risks.push("Active credit card debt is silently draining your wealth at 36%+ APR.");
  if (metrics.debtToIncomeRatio > 40) risks.push("Dangerously high leverage. You're over-exposed to interest rate risk.");
  if (risks.length === 0) risks.push("No critical risks detected. Stay disciplined.");
  sections.push({ title: "Key Risks", items: risks, emoji: "⚠️", bullet: "✕", bgColor: "bg-danger/10" });

  const opps: string[] = [];
  if (data.assets.mutualFunds === 0 && data.assets.stocks === 0) {
    opps.push("You have zero market exposure. Start a SIP in a Nifty 50 index fund today.");
  }
  if (metrics.savingsRate > 20 && data.assets.realEstate === 0) {
    opps.push("Strong savings rate but no real estate. Consider REITs for diversification.");
  }
  if (data.riskAppetite === "high" && data.assets.stocks < data.assets.bankBalance) {
    opps.push("Your risk appetite is high but most money sits in the bank. Reallocate to equities.");
  }
  if (opps.length === 0) opps.push("Your allocation looks balanced. Focus on growing each bucket.");
  sections.push({ title: "Missed Opportunities", items: opps, emoji: "💡", bullet: "★", bgColor: "bg-secondary/30" });

  const actions: string[] = [];
  if (data.liabilities.creditCardDebt > 0) actions.push("IMMEDIATE: Pay off credit card debt. This is priority #1.");
  if (metrics.liquidityRatio < 1) actions.push("Build emergency fund to cover 6 months of expenses.");
  actions.push("Automate savings — transfer 20% of income on salary day.");
  if (data.assets.mutualFunds > 0 || data.assets.stocks > 0) {
    actions.push("Review portfolio quarterly. Rebalance if any single asset exceeds 40% allocation.");
  }
  sections.push({ title: "Action Plan", items: actions, emoji: "🎯", bullet: "→", bgColor: "bg-accent/10" });

  return sections;
}