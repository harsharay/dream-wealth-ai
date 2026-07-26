import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { BackendFinancialMetrics, FinancialData } from "@/types/finance";
import { calculateMetrics } from "@/lib/financial-engine";
import { buildMoneyStory, type QuestFocus } from "@/lib/money-story";
import { QUEST_COPY } from "@/lib/quest-copy";
import { clampDurationWeeks, type ActionCadence, type MissionCheckIn } from "@/lib/mission-plan";
import { QuestFocusPicker } from "@/components/QuestFocusPicker";
import { MissionHub } from "@/components/MissionHub";
import { ConfirmModal } from "@/components/ConfirmModal";
import { PlanDetailSheet } from "@/components/PlanDetailSheet";
import { 
  Loader2, ArrowRight, Activity, Ghost, 
  Target, PlayCircle, Gamepad2, ThumbsUp, ThumbsDown, ChevronRight
} from "lucide-react";
import { toast } from "sonner";

const isDev = import.meta.env.VITE_ENV === 'dev';
const BACKEND_URL = isDev ? "http://localhost:3001" : (import.meta.env.VITE_API_URL || "http://localhost:3001");

const EMPTY_BACKEND_METRICS: BackendFinancialMetrics = {
  emergencyBufferMonths: 0,
  fiMetricAvailable: false,
  fiRatio: null,
  targetRetirementCorpus: null,
  investedAssets: null,
  estimatedRetirementAge: null,
  emiStressRatio: 0,
};

interface ActionItem {
  text: string;
  impact: number;
  status?: "pending" | "completed" | "abandoned";
  cadence?: ActionCadence;
}

interface TrackedAction {
  id: string;
  action_text: string;
  action_items?: ActionItem[];
  target_amount?: number;
  progress: number;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
  start_date?: string;
  last_update?: string;
  mission_data?: {
    duration_weeks?: number;
    focuses?: ResolvedFocus[];
    focus_ids?: string[];
    start_snapshot?: {
      checkup?: { id: string; title: string; status: QuestFocus["status"]; summary: string }[];
      metrics?: Record<string, number>;
    } | null;
    check_ins?: MissionCheckIn[];
    last_check_in_at?: string | null;
  } | null;
}

interface ScenarioSimulatorProps {
  data: FinancialData;
  backendMetrics?: BackendFinancialMetrics;
  focusedMissionId?: string | null;
  onMissionCleared?: () => void;
  onRefreshData?: () => void;
}

type QuestFocusRole = "user" | "system";

interface ResolvedFocus extends QuestFocus {
  role: QuestFocusRole;
  theme?: string;
}

/** Normalize flat focuses[] (new) or legacy { user, system, all }. */
function normalizeFocusesResponse(raw: unknown, fallbackUser: QuestFocus[] = []): ResolvedFocus[] {
  if (Array.isArray(raw)) {
    return raw.filter((f): f is ResolvedFocus => !!f && typeof f === "object" && "id" in f);
  }
  if (raw && typeof raw === "object") {
    const o = raw as { user?: QuestFocus[]; system?: QuestFocus | null; all?: ResolvedFocus[] };
    if (Array.isArray(o.all) && o.all.length) return o.all;
    const user = (o.user || fallbackUser).map((f) => ({ ...f, role: "user" as const }));
    const system = o.system ? [{ ...o.system, role: "system" as const }] : [];
    return [...user, ...system];
  }
  return fallbackUser.map((f) => ({ ...f, role: "user" as const }));
}

type SimulatorPhase = "intro" | "questions" | "paths" | "mission";

interface Question {
  theme: string;
  q: string;
  options: string[];
}

interface Recommendation {
  title: string;
  description: string;
  vision: string;
  impact_bullets: string[];
  difficulty: "Hard" | "Medium" | "Easy";
  duration_weeks: number;
  target_amount: number;
  action_items: ActionItem[];
  focus_ids?: string[];
}

export function ScenarioSimulator({
  data,
  backendMetrics = EMPTY_BACKEND_METRICS,
  focusedMissionId,
  onMissionCleared,
  onRefreshData,
}: ScenarioSimulatorProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SimulatorPhase>("intro");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeMission, setActiveMission] = useState<TrackedAction | null>(null);
  const [eligibilityPopupOpen, setEligibilityPopupOpen] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<{ eligible: boolean; nextAvailableAt?: string; remainingDays?: number } | null>(null);
  const [focusPickerOpen, setFocusPickerOpen] = useState(false);
  const [pendingForceRefresh, setPendingForceRefresh] = useState(false);
  const [questFocuses, setQuestFocuses] = useState<ResolvedFocus[]>([]);
  const [pendingPlan, setPendingPlan] = useState<Recommendation | null>(null);
  const [detailPlan, setDetailPlan] = useState<Recommendation | null>(null);
  const [focusedPlanIndex, setFocusedPlanIndex] = useState(0);
  const [detailSlideDir, setDetailSlideDir] = useState<"left" | "right">("right");
  const planCarouselRef = useRef<HTMLDivElement>(null);
  const focusedPlanIndexRef = useRef(0);
  const planScrollSettleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const metrics = calculateMetrics(data);
  const lastGenAtRef = useRef<number>(0);

  useEffect(() => {
    focusedPlanIndexRef.current = 0;
    setFocusedPlanIndex(0);
    setDetailSlideDir("right");
  }, [recommendations]);

  const readCarouselPlanIndex = useCallback(() => {
    const el = planCarouselRef.current;
    if (!el || !recommendations.length) return 0;
    const first = el.querySelector<HTMLElement>("[data-plan-card]");
    if (!first) return 0;
    const step = first.offsetWidth + 12;
    if (step <= 0) return 0;
    return Math.max(0, Math.min(recommendations.length - 1, Math.round(el.scrollLeft / step)));
  }, [recommendations.length]);

  const settleFocusedPlanFromCarousel = useCallback(() => {
    const next = readCarouselPlanIndex();
    const prev = focusedPlanIndexRef.current;
    if (next === prev) return;
    setDetailSlideDir(next > prev ? "right" : "left");
    focusedPlanIndexRef.current = next;
    setFocusedPlanIndex(next);
  }, [readCarouselPlanIndex]);

  const focusPlanAtIndex = useCallback((index: number) => {
    const next = Math.max(0, Math.min(recommendations.length - 1, index));
    const prev = focusedPlanIndexRef.current;
    if (next !== prev) {
      setDetailSlideDir(next > prev ? "right" : "left");
      focusedPlanIndexRef.current = next;
      setFocusedPlanIndex(next);
    }
    const el = planCarouselRef.current;
    const card = el?.querySelectorAll<HTMLElement>("[data-plan-card]")[next];
    card?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [recommendations.length]);

  useEffect(() => {
    if (phase !== "paths") return;
    const el = planCarouselRef.current;
    if (!el) return;
    const onScrollEnd = () => {
      if (planScrollSettleTimer.current) clearTimeout(planScrollSettleTimer.current);
      settleFocusedPlanFromCarousel();
    };
    el.addEventListener("scrollend", onScrollEnd);
    return () => el.removeEventListener("scrollend", onScrollEnd);
  }, [phase, recommendations.length, settleFocusedPlanFromCarousel]);

  // Persistence: Save State
  const saveState = useCallback(async (state: Partial<{
    phase: SimulatorPhase;
    questions: Question[];
    answers: string[];
    currentQIndex: number;
    recommendations: Recommendation[];
    lastGeneratedAt: number;
    focuses: ResolvedFocus[];
  }>) => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${BACKEND_URL}/api/simulator/state`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify(state)
      });
    } catch (err) {
      console.error("Failed to save simulator state", err);
    }
  }, [user]);

  // Master Initialization Effect
  useEffect(() => {
    let isMounted = true;
    const initialize = async () => {
      if (!user) return;
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Authorization": `Bearer ${session?.access_token}` };
        
        // Fetch both local simulator state and backend tracking concurrently
        const [stateRes, trackRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/simulator/state`, { headers }),
          fetch(`${BACKEND_URL}/api/simulator/track`, { headers })
        ]);

        let savedState = null;
        if (stateRes.ok) {
          savedState = await stateRes.json();
          if (savedState && isMounted) {
            setPhase(savedState.phase || "intro");
            const savedQs: Question[] = (savedState.questions || [])
              .map((item: unknown): Question | null => {
                if (typeof item === "string") return item ? { theme: "general", q: item, options: [] } : null;
                if (item && typeof item === "object") {
                  const o = item as { q?: string; question?: string; text?: string; theme?: string; options?: unknown[] };
                  const q = o.q || o.question || o.text || "";
                  if (!q) return null;
                  return {
                    theme: o.theme || "general",
                    q,
                    options: Array.isArray(o.options) ? o.options.map(String).filter(Boolean) : [],
                  };
                }
                return null;
              })
              .filter((q): q is Question => q !== null);
            setQuestions(savedQs);
            setAnswers(savedState.answers || []);
            setCurrentQIndex(savedState.currentQIndex || 0);
            setRecommendations(savedState.recommendations || []);
            if (savedState.focuses) {
              setQuestFocuses(normalizeFocusesResponse(savedState.focuses));
            }
            if (savedState.lastGeneratedAt) {
              lastGenAtRef.current = savedState.lastGeneratedAt;
            }
          }
        }

        if (trackRes.ok && isMounted) {
          const missions: TrackedAction[] = await trackRes.json();
          const active = focusedMissionId 
            ? missions.find((m: TrackedAction) => m.id === focusedMissionId) 
            : missions.find((m: TrackedAction) => m.status === 'in_progress');
          
          if (active) {
            setActiveMission(active);
            // If an active mission is in progress, we must either be in the mission hub or the paths screen.
            // Bypasses the intro/questions flow.
            if (savedState?.phase === "paths") {
              setPhase("paths");
            } else {
              setPhase("mission");
            }
          } else if (!savedState || !savedState.phase) {
            setPhase("intro");
          }
        }
      } catch (err) {
        console.error("Failed to initialize simulator:", err);
      } finally {
        if (isMounted) setIsInitializing(false);
      }
    };
    
    initialize();
    return () => { isMounted = false; };
  }, [user, focusedMissionId]);

  // Auto-save state when major changes occur
  useEffect(() => {
    if (isInitializing || phase === "mission" || phase === "intro") return;
    const timeout = setTimeout(() => {
      console.log("Auto-saving simulator state...");
      saveState({
        phase,
        questions,
        answers,
        currentQIndex,
        recommendations,
        lastGeneratedAt: lastGenAtRef.current,
        focuses: questFocuses,
      });
    }, 5000); // 5s debounce for regular input
    return () => clearTimeout(timeout);
  }, [phase, questions, answers, currentQIndex, recommendations, questFocuses, saveState, isInitializing]);

  // Explicit refetch for manual actions
  const fetchActiveMission = useCallback(async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/track`, {
        headers: { "Authorization": `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        const missions: TrackedAction[] = await res.json();
        const active = focusedMissionId 
          ? missions.find((m: TrackedAction) => m.id === focusedMissionId) 
          : missions.find((m: TrackedAction) => m.status === 'in_progress');
        
        if (active) {
          setActiveMission(active);
          // If a specific mission is focused from tracker OR we're stuck in intro/questions, prioritize the mission hub
          if (focusedMissionId || phase === "intro" || phase === "questions") {
            setPhase("mission");
          }
        } else if (phase === "mission") {
          setPhase("intro");
        }
      }
    } catch (err) {
      console.error(err);
    }
  }, [user, focusedMissionId, phase]);

  useEffect(() => {
    if (isInitializing || !user) return;
    if (focusedMissionId) {
      fetchActiveMission();
    }
  }, [user, focusedMissionId, fetchActiveMission, isInitializing]);

  const openFocusPicker = (forceRefresh = false) => {
    setPendingForceRefresh(forceRefresh);
    setLoading(false);
    setFocusPickerOpen(true);
  };

  const fetchQuestions = async (userFocuses: QuestFocus[], forceRefresh = false) => {
    setFocusPickerOpen(false);
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          data, 
          metrics,
          style: "conversational",
          force_refresh: forceRefresh,
          user_focuses: userFocuses,
        })
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load level data" }));
        throw new Error(err.error || "Failed to load level data");
      }
      const result = await res.json();
      const resolvedFocuses = normalizeFocusesResponse(result.focuses, userFocuses);
      setQuestFocuses(resolvedFocuses);

      const q: Question[] = (result.questions || [])
        .map((item: unknown): Question | null => {
          if (typeof item === "string") return item ? { theme: "general", q: item, options: [] } : null;
          if (item && typeof item === "object") {
            const o = item as { q?: string; question?: string; text?: string; theme?: string; options?: unknown[] };
            const text = o.q || o.question || o.text || "";
            if (!text) return null;
            return {
              theme: o.theme || "general",
              q: text,
              options: Array.isArray(o.options) ? o.options.map(String).filter(Boolean) : [],
            };
          }
          return null;
        })
        .filter((item): item is Question => item !== null);
      setQuestions(q);
      setPhase("questions");
      setCurrentQIndex(0);
      
      // PERSIST IMMEDIATELY
      console.log("Saving initial questions state...");
      saveState({ 
        phase: "questions", 
        questions: q, 
        currentQIndex: 0, 
        answers: [], 
        recommendations: [],
        lastGeneratedAt: lastGenAtRef.current,
        focuses: resolvedFocuses,
      });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    if (!currentInput.trim()) return;
    const newAnswers = [...answers, currentInput];
    setAnswers(newAnswers);
    setCurrentInput("");

    if (currentQIndex < questions.length - 1) {
      setCurrentQIndex(currentQIndex + 1);
    } else {
      generatePaths(newAnswers);
    }
  };

  const generatePaths = async (finalAnswers: string[]) => {
    setLoading(true);
    setPhase("paths");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const qna = questions.map((q, i) => ({ question: q.q, answer: finalAnswers[i] }));
      const res = await fetch(`${BACKEND_URL}/api/simulator/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          qna,
          metrics,
          data,
          user_focuses: questFocuses.filter((f) => f.role === "user"),
          focuses: questFocuses,
        })
      });
      if (!res.ok) throw new Error("Failed to generate paths");
      const result = await res.json();

      const toStr = (v: unknown): string => {
        if (typeof v === "string") return v;
        if (typeof v === "number" || typeof v === "boolean") return String(v);
        if (v && typeof v === "object") {
          const o = v as { text?: unknown; bullet?: unknown; description?: unknown; q?: unknown };
          return toStr(o.text ?? o.bullet ?? o.description ?? o.q ?? "");
        }
        return "";
      };

      const rawRecs: unknown[] = Array.isArray(result?.recommendations)
        ? result.recommendations
        : Array.isArray(result)
          ? result
          : [];

      const recs: Recommendation[] = rawRecs
        .map((r) => {
          const o = (r ?? {}) as Record<string, unknown>;
          const bullets = Array.isArray(o.impact_bullets) ? o.impact_bullets : [];
          const items = Array.isArray(o.action_items) ? o.action_items : [];
          const rawDiff = String(o.difficulty || "").toLowerCase();
          const difficulty = (rawDiff === "easy" ? "Easy" : rawDiff === "hard" ? "Hard" : "Medium") as Recommendation["difficulty"];
          const focusIds = Array.isArray(o.focus_ids)
            ? o.focus_ids.map(String).filter(Boolean)
            : undefined;
          return {
            title: toStr(o.title),
            description: toStr(o.description),
            vision: toStr(o.vision),
            impact_bullets: bullets.map(toStr).filter((s) => s.length > 0),
            difficulty,
            duration_weeks: clampDurationWeeks(Number(o.duration_weeks) || undefined),
            target_amount: Number(o.target_amount) || 0,
            focus_ids: focusIds,
            action_items: items
              .map((it) => {
                const i = (it ?? {}) as Record<string, unknown>;
                const text = toStr(i.text ?? i);
                if (!text) return null;
                const rawCadence = String(i.cadence || "").toLowerCase();
                const cadence = (["setup", "weekly", "verify"].includes(rawCadence)
                  ? rawCadence
                  : undefined) as ActionCadence | undefined;
                return { text, impact: Number(i.impact) || 1, cadence } as ActionItem;
              })
              .filter((x): x is ActionItem => x !== null),
          };
        })
        .filter((r) => r.title.length > 0);
      setRecommendations(recs);
      
      // PERSIST IMMEDIATELY
      console.log("Saving recommendations state...");
      saveState({ 
        phase: "paths", 
        questions, 
        answers: finalAnswers, 
        currentQIndex, 
        recommendations: recs,
        lastGeneratedAt: lastGenAtRef.current,
        focuses: questFocuses,
      });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      setPhase("questions");
    } finally {
      setLoading(false);
    }
  };

  const requestSelectPath = (rec: Recommendation) => {
    if (activeMission?.action_text === rec.title) {
      setPhase("mission");
      return;
    }
    setPendingPlan(rec);
  };

  const confirmSelectPath = async () => {
    const rec = pendingPlan;
    if (!rec) return;

    const weeks = clampDurationWeeks(rec.duration_weeks);
    setPendingPlan(null);

    try {
      setLoading(true);
      const story = buildMoneyStory(data, metrics, backendMetrics);
      const pathFocuses = rec.focus_ids?.length
        ? questFocuses.filter((f) => rec.focus_ids!.includes(f.id))
        : questFocuses;
      const focusesForMission = pathFocuses.length ? pathFocuses : questFocuses;

      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({
          action_text: rec.title,
          action_items: rec.action_items,
          target_amount: rec.target_amount,
          duration_weeks: weeks,
          focuses: focusesForMission,
          focus_ids: focusesForMission.map((f) => f.id),
          vision: rec.vision,
          difficulty: rec.difficulty,
          start_snapshot: {
            checkup: story.checkup.map((c) => ({
              id: c.id,
              title: c.title,
              status: c.status,
              summary: c.summary,
            })),
            metrics: {
              healthScore: metrics.healthScore,
              savingsRate: metrics.savingsRate,
              netWorth: metrics.netWorth,
              emergencyBufferMonths: backendMetrics.emergencyBufferMonths,
              emiStressRatio: backendMetrics.emiStressRatio,
            },
          },
        })
      });
      if (!res.ok) throw new Error("Could not start mission");
      toast.success("Plan started — your weekly practice begins now.");
      fetchActiveMission();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not start mission");
    } finally {
      setLoading(false);
    }
  };

  const saveMissionCheckIn = async (checkIn: MissionCheckIn, progress: number, status: string) => {
    if (!activeMission) return;
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(`${BACKEND_URL}/api/simulator/track/${activeMission.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
      body: JSON.stringify({ check_in: checkIn, progress, status }),
    });
    if (!res.ok) {
      toast.error("Failed to save check-in");
      throw new Error("check-in failed");
    }
    toast.success(progress >= 100 ? "Plan complete — nice work." : "Check-in saved.");
    await fetchActiveMission();
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
  if (textareaRef.current) {
    textareaRef.current.style.height = 'auto';
    textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
  }
}, [currentInput]);

  // Paths / mission are page surfaces — avoid card-in-card nesting.
  // Intro / questions keep the framed "quest" shell.
  const isPageSurface = phase === "paths" || phase === "mission";

  return (
    <div
      className={
        isPageSurface
          ? "relative min-h-[420px] flex flex-col"
          : "relative border-4 border-foreground bg-card rounded-2xl overflow-hidden min-h-[500px] flex flex-col"
      }
      style={
        isPageSurface
          ? undefined
          : { boxShadow: "10px 10px 0px 0px hsl(var(--foreground))" }
      }
    >
      {isPageSurface ? (
        <div className="flex items-center gap-2 mb-1 px-0.5">
          <Gamepad2 className="w-4 h-4 text-accent" />
          <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Wealth Quest
          </span>
        </div>
      ) : (
        <div className="bg-foreground text-background p-4 border-b-4 border-foreground flex justify-between items-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iI2ZmZmZmZiI+PC9jaXJjbGU+Cjwvc3ZnPg==')] border-repeat"></div>
          <div className="flex items-center gap-3 z-10">
            <Gamepad2 className="w-8 h-8 animate-pulse text-accent" />
            <h2 className="font-black text-2xl tracking-widest uppercase">Wealth Quest</h2>
          </div>
        </div>
      )}

      {(loading || isInitializing) && (
        <div
          className={`flex-1 flex flex-col items-center justify-center p-8 z-10 animate-in fade-in duration-300 ${
            isPageSurface
              ? "relative min-h-[280px]"
              : "bg-background/80 absolute inset-0 backdrop-blur-sm"
          }`}
        >
          <div className="w-16 h-16 border-8 border-t-accent border-foreground rounded-full animate-spin speed-2x" />
          <p className="mt-6 font-black uppercase text-xl animate-pulse tracking-widest">
            Calculating Trajectories...
          </p>
        </div>
      )}

      {/* Styled Popup Overlay */}
      {eligibilityPopupOpen && eligibilityData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-card border-4 border-foreground rounded-xl p-8 w-[90%] max-w-md nb-shadow-lg text-center relative overflow-hidden nb-card">
             
             {!eligibilityData.eligible ? (
               <>
                 <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-danger">
                   <Target className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-black uppercase mb-4 leading-tight">Cooldown Active</h3>
                 <p className="text-muted-foreground font-bold mb-8 leading-relaxed">
                   New suggestions need a short cooldown. They unlock in <span className="text-foreground">{eligibilityData.remainingDays} days</span> on {new Date(eligibilityData.nextAvailableAt!).toLocaleDateString()}.
                 </p>
                 <button 
                  onClick={() => setEligibilityPopupOpen(false)}
                  className="w-full nb-button-secondary"
                 >
                   Acknowledge
                 </button>
               </>
             ) : (
               <>
                 <div className="w-16 h-16 bg-accent/10 text-accent rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-accent">
                   <Activity className="w-8 h-8" />
                 </div>
                 <h3 className="text-2xl font-black uppercase mb-4 leading-tight">Abandon Mission?</h3>
                 <p className="text-muted-foreground font-bold mb-8 leading-relaxed">
                   Generating new suggestions will clear your current quest progress. Your current mission will be marked as <span className="text-danger italic">Abandoned</span>.
                 </p>
                 <div className="flex gap-4">
                   <button 
                    onClick={() => setEligibilityPopupOpen(false)}
                    className="flex-1 py-4 border-4 border-foreground hover:bg-muted font-black uppercase tracking-widest text-xs transition-colors"
                   >
                     Cancel
                   </button>
                   <button 
                    onClick={async () => {
                      setEligibilityPopupOpen(false);
                      try {
                        if (activeMission) {
                          setLoading(true);
                          const { data: { session } } = await supabase.auth.getSession();
                          const res = await fetch(`${BACKEND_URL}/api/simulator/track/${activeMission.id}`, {
                            method: "PUT",
                            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                            body: JSON.stringify({ 
                              status: "abandoned",
                              action_items: activeMission.action_items?.map(i => ({ ...i, status: i.status === 'completed' ? 'completed' : 'abandoned' })) 
                            })
                          });
                          if (!res.ok) throw new Error("Failed to abandon mission");
                          setActiveMission(null);
                          setLoading(false);
                        }
                        lastGenAtRef.current = Date.now();
                        openFocusPicker(true);
                      } catch(err) {
                        toast.error("Error regenerating mission");
                        setLoading(false);
                      }
                    }}
                    className="flex-1 py-4 border-4 border-foreground bg-danger hover:bg-danger-foreground hover:text-danger font-black uppercase tracking-widest text-xs transition-colors"
                   >
                     Proceed
                   </button>
                 </div>
               </>
             )}
          </div>
        </div>
      )}

      {phase === "mission" && activeMission && !isInitializing && (
        <MissionHub
          mission={activeMission}
          fallbackFocuses={questFocuses}
          data={data}
          metrics={metrics}
          backendMetrics={backendMetrics}
          onBack={
            onMissionCleared
              ? () => {
                  setPhase("paths");
                  onMissionCleared();
                }
              : () => setPhase("paths")
          }
          onSaveCheckIn={saveMissionCheckIn}
          onRefreshData={onRefreshData}
          onRequestRegen={async () => {
            try {
              setLoading(true);
              if (eligibilityData) {
                setLoading(false);
                setEligibilityPopupOpen(true);
                return;
              }
              const { data: { session } } = await supabase.auth.getSession();
              const res = await fetch(`${BACKEND_URL}/api/simulator/eligibility`, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
              });
              if (res.ok) {
                setEligibilityData(await res.json());
                setEligibilityPopupOpen(true);
              } else {
                toast.error("Could not verify status");
              }
            } catch (err) {
              console.error(err);
            } finally {
              setLoading(false);
            }
          }}
        />
      )}

      {/* Intro Phase */}
      {phase === "intro" && !loading && !isInitializing && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10 bg-gradient-to-b from-card to-accent/10">
          <Ghost className="w-20 h-20 text-accent mb-6 animate-bounce" />
          <h3 className="text-3xl font-black mb-1">New Campaign</h3>
          <p className="text-muted-foreground font-bold mb-8 max-w-sm">Answer a few questions to unlock high-impact financial missions.</p>
          <button onClick={() => openFocusPicker(false)} className="nb-button text-xl px-12 py-4 flex items-center gap-3 hover:scale-105 transition-transform">
             <PlayCircle className="w-6 h-6" /> Start Quest
          </button>
        </div>
      )}

      <QuestFocusPicker
        open={focusPickerOpen}
        data={data}
        metrics={metrics}
        backendMetrics={backendMetrics}
        onClose={() => {
          setFocusPickerOpen(false);
          setLoading(false);
        }}
        onConfirm={(userFocuses) => fetchQuestions(userFocuses, pendingForceRefresh)}
      />

      {/* Questions Phase */}
      {phase === "questions" && !loading && !isInitializing && questions.length > 0 && (
        <div className="flex-1 flex flex-col p-8 pb-20 z-10">
          <div className="flex justify-between items-center mb-8 border-b-4 border-foreground/10 pb-4">
             <div className="flex flex-col">
               <span className="font-black text-muted-foreground uppercase tracking-widest text-xs">Encounter {currentQIndex + 1} / {questions.length}</span>
               <span className="text-[10px] font-bold text-accent mt-1">Tip: Be descriptive for better quest suggestions!</span>
             </div>
             <div className="flex items-center gap-4">
               {/* <div className="flex gap-1 border-2 border-foreground rounded-lg p-1 bg-background">
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex]?.q, rating: 1 })
                    });
                    toast.success("Thanks for the feedback! 🚀");
                  }}
                  className="p-1 hover:bg-success/20 rounded transition-colors" title="Rate Up"
                 >
                   <Trophy className="w-4 h-4 text-success" />
                 </button>
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex]?.q, rating: -1 })
                    });
                    toast.success("Thanks — your feedback helps improve missions.");
                  }}
                  className="p-1 hover:bg-danger/20 rounded transition-colors" title="Rate Down"
                 >
                   <Ghost className="w-4 h-4 text-danger" />
                 </button>
               </div> */}
               <div className="flex gap-2">
                 {questions.map((_, i) => (
                   <div key={i} className={`w-3 h-3 border-2 border-foreground rounded-full ${i === currentQIndex ? 'bg-accent animate-pulse' : i < currentQIndex ? 'bg-success' : 'bg-transparent'}`}></div>
                 ))}
               </div>
             </div>
          </div>

          <div className="flex gap-1 border-2 border-foreground rounded-lg p-1 bg-background absolute w-fit bottom-[20px] right-[10px]">
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex]?.q, rating: 1 })
                    });
                    toast.success("Thanks for the feedback! 🚀");
                  }}
                  className="p-1 hover:bg-success/20 rounded transition-colors" title="Rate Up"
                 >
                   <ThumbsUp className="w-4 h-4 text-success" />
                 </button>
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex]?.q, rating: -1 })
                    });
                    toast.success("Thanks — your feedback helps improve missions.");
                  }}
                  className="p-1 hover:bg-danger/20 rounded transition-colors" title="Rate Down"
                 >
                   <ThumbsDown className="w-4 h-4 text-danger" />
                 </button>
               </div>
          
          <div className="flex-1 max-w-2xl mx-auto w-full">
            <h3 className="text-2xl font-black text-foreground mb-6 leading-relaxed animate-in slide-in-from-right-8 duration-300">
              "{questions[currentQIndex]?.q}"
            </h3>

            {/* Suggested answer chips */}
            {questions[currentQIndex]?.options?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                {questions[currentQIndex].options.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      setCurrentInput(opt);
                      // Short delay so user sees the chip selected before auto-submit
                      setTimeout(() => {
                        const newAnswers = [...answers, opt];
                        setAnswers(newAnswers);
                        setCurrentInput("");
                        if (currentQIndex < questions.length - 1) {
                          setCurrentQIndex(currentQIndex + 1);
                        } else {
                          generatePaths(newAnswers);
                        }
                      }, 120);
                    }}
                    className={`px-4 py-2 rounded-lg border-2 border-foreground text-xs font-black uppercase tracking-tight transition-all active:scale-95 ${
                      currentInput === opt
                        ? "bg-accent text-background border-accent"
                        : "bg-background hover:bg-accent/10"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}

            {/* Manual entry */}
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                {questions[currentQIndex]?.options?.length > 0 ? "Or type your own answer:" : "Your answer:"}
              </p>
              <div className="relative w-full">
                <textarea
                  value={currentInput}
                  ref={textareaRef}
                  onChange={e => setCurrentInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      submitAnswer();
                    }
                  }}
                  placeholder="Or type your answer..."
                  rows={1}
                  className="w-full text-lg p-6 pr-16 rounded-xl border-4 border-foreground bg-background font-medium focus:outline-none focus:ring-4 focus:ring-accent/50 focus:border-accent transition-all nb-shadow-sm resize-none overflow-hidden max-h-[200px] overflow-y-auto"
                  autoFocus
                />
                <button
                  onClick={submitAnswer}
                  disabled={!currentInput.trim()}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 bg-foreground text-background flex items-center justify-center rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paths Phase */}
      {phase === "paths" && !loading && !isInitializing && (
        <div className="flex-1 flex flex-col pt-3 md:pt-4 z-10 md:overflow-y-auto min-h-[calc(100dvh-11rem)] md:min-h-0">
          <div className="mb-4 md:mb-8 space-y-1 md:text-center shrink-0">
            <h3 className="text-2xl md:text-3xl font-black tracking-tight">
              {QUEST_COPY.pathsTitle}
            </h3>
            <p className="text-sm text-muted-foreground font-medium max-w-lg md:mx-auto leading-snug">
              <span className="md:hidden">{QUEST_COPY.pathsSubtitleMobile}</span>
              <span className="hidden md:inline">{QUEST_COPY.pathsSubtitle}</span>
            </p>
          </div>

          {/* Mobile: snap picker + detail panel fills remaining viewport */}
          <div className="md:hidden flex flex-col flex-1 min-h-0 gap-4">
            <div
              ref={planCarouselRef}
              onScroll={() => {
                if (planScrollSettleTimer.current) clearTimeout(planScrollSettleTimer.current);
                planScrollSettleTimer.current = setTimeout(() => {
                  settleFocusedPlanFromCarousel();
                }, 90);
              }}
              className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 py-1 no-scrollbar shrink-0"
            >
              {recommendations.map((rec, i) => {
                const difficultyColors = {
                  Hard: "bg-danger/15 text-danger",
                  Medium: "bg-accent/15 text-accent",
                  Easy: "bg-success/15 text-success",
                };
                const diffStyle = difficultyColors[rec.difficulty] || difficultyColors.Medium;
                const isActive = activeMission?.action_text === rec.title;
                const weeks = clampDurationWeeks(rec.duration_weeks);
                const isFocused = focusedPlanIndex === i;

                return (
                  <button
                    key={`m-${i}`}
                    type="button"
                    data-plan-card
                    onClick={() => focusPlanAtIndex(i)}
                    className={`flex flex-col text-left w-[min(72vw,16rem)] shrink-0 snap-center rounded-2xl p-4 border transition-colors duration-200 ${
                      isFocused
                        ? "bg-card border-foreground shadow-sm"
                        : "bg-muted/40 border-transparent opacity-70"
                    } ${isActive ? "ring-2 ring-success/60" : ""}`}
                  >
                    <div className={`inline-flex self-start px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide mb-2 ${diffStyle}`}>
                      {rec.difficulty} · {weeks} wks
                    </div>
                    <h4 className="text-base font-black leading-snug line-clamp-2">{rec.title}</h4>
                  </button>
                );
              })}
            </div>

            {(() => {
              const rec = recommendations[focusedPlanIndex] ?? recommendations[0];
              if (!rec) return null;
              const isActive = activeMission?.action_text === rec.title;
              const isDisabled = !!(activeMission && !isActive);
              const weeks = clampDurationWeeks(rec.duration_weeks);
              const cardFocuses = rec.focus_ids?.length
                ? questFocuses.filter((f) => rec.focus_ids!.includes(f.id))
                : questFocuses;
              const bullets = (rec.impact_bullets || []).slice(0, 3);
              const slideClass =
                detailSlideDir === "right"
                  ? "slide-in-from-right-6"
                  : "slide-in-from-left-6";

              return (
                <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-border bg-card/80 overflow-hidden">
                  <div
                    key={rec.title}
                    className={`flex-1 flex flex-col min-h-0 p-5 animate-in fade-in ${slideClass} duration-300`}
                  >
                    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4">
                      <div className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                          {rec.difficulty} · {weeks} weeks · Plan {focusedPlanIndex + 1} of{" "}
                          {recommendations.length}
                        </p>
                        <h4 className="text-lg font-black leading-snug">{rec.title}</h4>
                      </div>

                      {rec.vision && (
                        <p className="text-xs text-muted-foreground leading-relaxed bg-muted/50 rounded-xl px-3 py-2.5">
                          {rec.vision}
                        </p>
                      )}
                      <p className="text-sm text-foreground/85 leading-relaxed">{rec.description}</p>

                      {cardFocuses.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {cardFocuses.map((f) => (
                            <span
                              key={f.id}
                              className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border border-border bg-muted/40"
                            >
                              {f.title}
                            </span>
                          ))}
                        </div>
                      )}

                      {bullets.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                            {QUEST_COPY.planBenefits}
                          </p>
                          {bullets.map((bullet, idx) => (
                            <div key={idx} className="flex items-start gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                              <p className="text-sm leading-snug">{bullet}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="shrink-0 flex flex-col gap-2 pt-2 border-t border-border/60">
                      {(rec.impact_bullets?.length ?? 0) > 3 && (
                        <button
                          type="button"
                          onClick={() => setDetailPlan(rec)}
                          className="text-xs font-bold text-muted-foreground inline-flex items-center gap-1 self-center py-1"
                        >
                          {QUEST_COPY.seeDetails} <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => !isDisabled && requestSelectPath(rec)}
                        disabled={isDisabled}
                        className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wide flex items-center justify-center gap-2 disabled:opacity-45 ${
                          isActive
                            ? "bg-success text-success-foreground"
                            : "bg-foreground text-background"
                        }`}
                      >
                        {isActive
                          ? QUEST_COPY.resumePlan
                          : isDisabled
                            ? QUEST_COPY.lockedPlan
                            : QUEST_COPY.startPlan}{" "}
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Desktop: full-detail 3-column grid */}
          <div className="hidden md:grid md:grid-cols-3 gap-8">
            {recommendations.map((rec, i) => {
              const difficultyColors = {
                Hard: "bg-danger/20 border-danger text-danger",
                Medium: "bg-accent/20 border-accent text-accent",
                Easy: "bg-success/20 border-success text-success",
              };
              const diffStyle = difficultyColors[rec.difficulty] || difficultyColors.Medium;
              const isActive = activeMission?.action_text === rec.title;
              const isDisabled = !!(activeMission && !isActive);
              const weeks = clampDurationWeeks(rec.duration_weeks);
              const cardFocuses = rec.focus_ids?.length
                ? questFocuses.filter((f) => rec.focus_ids!.includes(f.id))
                : questFocuses;

              return (
                <div
                  key={`d-${i}`}
                  className={`group relative flex flex-col bg-background border-4 border-foreground p-8 rounded-xl transition-all duration-300 overflow-hidden ${
                    isDisabled
                      ? "opacity-50 grayscale cursor-not-allowed"
                      : "hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)]"
                  }`}
                >
                  <div
                    className={`absolute top-0 left-0 right-0 text-background text-[10px] font-black uppercase py-2 text-center tracking-widest translate-y-0 transition-colors ${
                      isActive ? "bg-success" : "bg-foreground group-hover:bg-primary"
                    }`}
                  >
                    {isActive ? QUEST_COPY.activeBadge : rec.vision || "Current → Future"}
                  </div>

                  <div className="relative z-10 flex-1 mt-8">
                    <div className={`inline-block px-3 py-1 border-2 rounded-full text-[10px] font-black uppercase mb-4 ${diffStyle}`}>
                      {rec.difficulty} ({weeks} weeks)
                    </div>
                    <h4 className="text-2xl font-black mb-4 leading-tight">{rec.title}</h4>
                    <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-4 border-l-4 border-foreground/10 pl-4">
                      {rec.description}
                    </p>

                    {cardFocuses.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground w-full">
                          {QUEST_COPY.solvesLabel}
                        </span>
                        {cardFocuses.map((f) => (
                          <span
                            key={f.id}
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border-2 border-foreground bg-muted"
                          >
                            {f.title}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="space-y-3 mb-8">
                      <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50">
                        {QUEST_COPY.planBenefits}
                      </p>
                      {(rec.impact_bullets || []).map((bullet, idx) => (
                        <div key={idx} className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                          <p className="text-xs font-bold leading-tight uppercase tracking-tight">{bullet}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => !isDisabled && requestSelectPath(rec)}
                    disabled={isDisabled}
                    className={`relative z-10 mt-auto w-full py-5 border-4 border-foreground font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${
                      isActive
                        ? "bg-success text-success-foreground"
                        : "bg-foreground text-background group-hover:bg-primary group-hover:text-foreground nb-button"
                    }`}
                  >
                    {isActive ? QUEST_COPY.resumePlan : isDisabled ? QUEST_COPY.lockedPlan : QUEST_COPY.startPlan}{" "}
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <PlanDetailSheet
        open={!!detailPlan}
        plan={detailPlan}
        focuses={
          detailPlan
            ? (detailPlan.focus_ids?.length
                ? questFocuses.filter((f) => detailPlan.focus_ids!.includes(f.id))
                : questFocuses
              ).map((f) => ({ id: f.id, title: f.title }))
            : []
        }
        isActive={!!detailPlan && activeMission?.action_text === detailPlan.title}
        isDisabled={!!(detailPlan && activeMission && activeMission.action_text !== detailPlan.title)}
        onClose={() => setDetailPlan(null)}
        onStart={() => {
          if (!detailPlan) return;
          const plan = detailPlan;
          setDetailPlan(null);
          requestSelectPath(plan);
        }}
      />

      <ConfirmModal
        open={!!pendingPlan}
        title={QUEST_COPY.confirmStartTitle}
        description={
          pendingPlan
            ? QUEST_COPY.confirmStart(clampDurationWeeks(pendingPlan.duration_weeks))
            : null
        }
        confirmLabel={QUEST_COPY.confirmStartConfirm}
        cancelLabel={QUEST_COPY.confirmStartCancel}
        variant="primary"
        busy={loading}
        onCancel={() => !loading && setPendingPlan(null)}
        onConfirm={() => void confirmSelectPath()}
      />

    </div>
  );
}
