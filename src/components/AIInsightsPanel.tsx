import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { FinancialMetrics, FinancialData } from "@/types/finance";
import { Sparkles, Loader2, WifiOff, History, ChevronLeft, ChevronRight } from "lucide-react";
import { fetchAIInsights, type InsightSection } from "@/lib/llm-service";
import { generateFallbackInsights } from "@/lib/financial-engine";
import { format } from "date-fns";

const isDev = import.meta.env.VITE_ENV === 'dev';
const BACKEND_URL = isDev ? "http://localhost:3001" : (import.meta.env.VITE_API_URL || "http://localhost:3001");

interface AIInsightsPanelProps {
  metrics: FinancialMetrics;
  data: FinancialData;
}

type Status = "loading" | "success" | "error";

interface HistoryEntry {
  insight_data: { sections: InsightSection[], warnings: string[] };
  created_at: string;
}

export function AIInsightsPanel({ metrics, data }: AIInsightsPanelProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<InsightSection[]>([]);
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(0); // 0 = latest, 1 = older, etc

  const fetchHistory = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await import("@/lib/supabase").then(m => m.supabase.auth.getSession());
      const res = await fetch(`${BACKEND_URL}/api/insights/history`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch(err) {
      console.error("Could not fetch insight history", err);
    }
  };

  useEffect(() => {
    let cancelled = false;
    
    setStatus("loading");
    setSections([]);

    if (isDev) {
      setSections(generateFallbackInsights(metrics, data));
      setStatus("success");
      return;
    }

    fetchAIInsights(data, metrics)
      .then((result) => {
        if (cancelled) return;
        setSections(result.sections);
        setStatus("success");
        fetchHistory(); // fetch history seamlessly after current load
      })
      .catch((err: Error) => {
        if (cancelled) return;
        console.warn("LLM fetch failed, using fallback:", err.message);
        setErrorMsg(err.message);
        setSections(generateFallbackInsights(metrics, data));
        setStatus("error");
        fetchHistory(); // We try to fetch history anyway
      });

    return () => { cancelled = true; };
  }, [JSON.stringify(data), JSON.stringify(metrics), user]);

  const displayedSections = historyIndex === 0 ? sections : history[historyIndex - 1]?.insight_data.sections;

  const colors = ["bg-accent/20", "bg-secondary/20", "bg-primary/20", "bg-success/20"];

  return (
    <div className="nb-card">
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg bg-secondary border-2 border-foreground flex items-center justify-center nb-shadow"
          >
            <Sparkles className="w-4 h-4 text-foreground" />
          </div>
          <h3 className="font-sans font-bold text-foreground text-lg flex items-center gap-2">
            AI Financial Diagnosis
            {historyIndex > 0 && <span className="text-xs font-mono bg-warning/20 text-warning px-2 py-0.5 rounded-full border border-warning/50">Historical</span>}
          </h3>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 0 && (
             <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border-2 border-foreground">
               <button 
                 disabled={historyIndex >= history.length} 
                 onClick={() => setHistoryIndex(v => v + 1)}
                 className="p-1 hover:bg-foreground hover:text-background rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
                 title="Older Insights"
               >
                 <ChevronLeft className="w-4 h-4" />
               </button>
               <span className="text-[10px] font-black uppercase w-16 text-center text-muted-foreground font-mono">
                 {historyIndex === 0 ? "Latest" : format(new Date(history[historyIndex - 1].created_at), "MMM d")}
               </span>
               <button 
                 disabled={historyIndex === 0} 
                 onClick={() => setHistoryIndex(v => v - 1)}
                 className="p-1 hover:bg-foreground hover:text-background rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-foreground"
                 title="Newer Insights"
               >
                 <ChevronRight className="w-4 h-4" />
               </button>
             </div>
          )}

          {status === "loading" && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Analyzing...
            </div>
          )}
          {status === "error" && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-danger bg-danger/10 border border-danger/30 rounded-md px-2 py-1">
              <WifiOff className="w-3.5 h-3.5" />
              Fallback Mode
            </div>
          )}
          {status === "success" && historyIndex === 0 && (
            <div className="flex items-center gap-1.5 text-xs font-bold text-success bg-success/10 border border-success/30 rounded-md px-2 py-1">
              <Sparkles className="w-3 h-3 text-success" />
              Gemini 2.0
            </div>
          )}
        </div>
      </div>

      {status === "loading" && (
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`relative overflow-hidden rounded-lg p-4 border-2 border-foreground/30 ${colors[(i - 1) % colors.length]} nb-shadow`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
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

      {status !== "loading" && displayedSections && displayedSections.length > 0 && (
        <div className="space-y-6">
          {displayedSections.map((section, i) => (
            <div
              key={i}
              className={`rounded-lg p-4 border-2 border-foreground ${section.bgColor} nb-shadow-sm`}
            >
              <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-2">
                <span>{section.emoji}</span> {section.title}
              </h4>
              <ul className="space-y-2">
                {section.items.map((item, j) => (
                  <li key={j} className="text-sm text-foreground flex gap-2 font-medium">
                    <span className="shrink-0">{section.bullet}</span>
                    <span>
                      {item.split(/(\*\*.*?\*\*)/g).map((part, k) => (
                        part.startsWith('**') ? <strong key={k}>{part.slice(2, -2)}</strong> : part
                      ))}
                    </span>
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