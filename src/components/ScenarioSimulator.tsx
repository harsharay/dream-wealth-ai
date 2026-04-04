import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import type { FinancialData } from "@/types/finance";
import { calculateMetrics } from "@/lib/financial-engine";
import { 
  Loader2, ArrowRight, CheckCircle2, Sparkles, Gamepad2, Coins, 
  Swords, Trophy, ThumbsUp, ThumbsDown, Activity, Ghost, CheckSquare, Square, 
  TrendingUp, ArrowLeft, Target, PlayCircle
} from "lucide-react";
import { toast } from "sonner";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend, ReferenceLine 
} from "recharts";

const isDev = import.meta.env.VITE_ENV === 'dev';
const BACKEND_URL = isDev ? "http://localhost:3001" : (import.meta.env.VITE_API_URL || "http://localhost:3001");

interface ActionItem {
  text: string;
  impact: number;
  status?: "pending" | "completed" | "abandoned";
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
}

interface ScenarioSimulatorProps {
  data: FinancialData;
  focusedMissionId?: string | null;
  onMissionCleared?: () => void;
}

type SimulatorPhase = "intro" | "questions" | "paths" | "mission";

interface Recommendation {
  title: string;
  description: string;
  vision: string;
  impact_bullets: string[];
  difficulty: "Hard" | "Medium" | "Easy";
  duration_weeks: number;
  target_amount: number;
  action_items: ActionItem[];
}

export function ScenarioSimulator({ data, focusedMissionId, onMissionCleared }: ScenarioSimulatorProps) {
  const { user } = useAuth();
  const [phase, setPhase] = useState<SimulatorPhase>("intro");
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [currentInput, setCurrentInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [activeMission, setActiveMission] = useState<TrackedAction | null>(null);
  const [eligibilityPopupOpen, setEligibilityPopupOpen] = useState(false);
  const [eligibilityData, setEligibilityData] = useState<{ eligible: boolean; nextAvailableAt?: string; remainingDays?: number } | null>(null);

  const metrics = calculateMetrics(data);
  const lastGenAtRef = useRef<number>(0);

  // Persistence: Save State
  const saveState = useCallback(async (state: Partial<{ phase: SimulatorPhase; questions: string[]; answers: string[]; currentQIndex: number; recommendations: Recommendation[]; lastGeneratedAt: number }>) => {
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
            setQuestions(savedState.questions || []);
            setAnswers(savedState.answers || []);
            setCurrentQIndex(savedState.currentQIndex || 0);
            setRecommendations(savedState.recommendations || []);
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
        lastGeneratedAt: lastGenAtRef.current
      });
    }, 5000); // 5s debounce for regular input
    return () => clearTimeout(timeout);
  }, [phase, questions, answers, currentQIndex, recommendations, saveState, isInitializing]);

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

  const fetchQuestions = async (forceRefresh = false) => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          data, 
          metrics,
          style: "conversational", // Tell backend to use Claude-style simple questions
          force_refresh: forceRefresh
        })
      });
      if (!res.ok) throw new Error("Failed to load level data");
      const result = await res.json();
      const q = result.questions || [];
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
        lastGeneratedAt: lastGenAtRef.current
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
      const qna = questions.map((q, i) => ({ question: q, answer: finalAnswers[i] }));
      const res = await fetch(`${BACKEND_URL}/api/simulator/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ qna })
      });
      if (!res.ok) throw new Error("Failed to generate paths");
      const result = await res.json();
      const recs = result.recommendations || [];
      setRecommendations(recs);
      
      // PERSIST IMMEDIATELY
      console.log("Saving recommendations state...");
      saveState({ 
        phase: "paths", 
        questions, 
        answers: finalAnswers, 
        currentQIndex, 
        recommendations: recs,
        lastGeneratedAt: lastGenAtRef.current
      });

    } catch (err) {
      toast.error(err instanceof Error ? err.message : "An error occurred");
      setPhase("questions");
    } finally {
      setLoading(false);
    }
  };

  const selectPath = async (rec: Recommendation) => {
    // If this is already our active mission, just jump back to it
    if (activeMission?.action_text === rec.title) {
      setPhase("mission");
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/track`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          action_text: rec.title,
          action_items: rec.action_items,
          target_amount: rec.target_amount
        })
      });
      if (!res.ok) throw new Error("Could not start mission");
      toast.success("Mission activated! Loading strategy...");
      fetchActiveMission();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleItem = async (index: number) => {
    if (!activeMission || !activeMission.action_items) return;
    
    const newItems = [...activeMission.action_items];
    const isCompleted = newItems[index].status === 'completed';
    newItems[index] = { ...newItems[index], status: isCompleted ? 'pending' : 'completed' };
    
    const completedCount = newItems.filter(i => i.status === 'completed').length;
    const newProgress = Math.round((completedCount / newItems.length) * 100);
    const newStatus = newProgress === 100 ? "completed" : "in_progress";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${BACKEND_URL}/api/simulator/track/${activeMission.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
        body: JSON.stringify({ 
          action_items: newItems,
          progress: newProgress,
          status: newStatus
        })
      });
      
      if (res.ok) {
        setActiveMission({ ...activeMission, action_items: newItems, progress: newProgress, status: newStatus });
        if (newProgress === 100) toast.success("Quest Completed! Legend status achieved! 🏆");
      }
    } catch (err) {
      toast.error("Failed to update mission progress");
    }
  };

  // Generate Graph Data
  const generateChartData = () => {
    if (!activeMission || !activeMission.target_amount) return [];
    
    const currentMonthlySavings = data.monthlyIncome - metrics.totalExpenses;
    const target = activeMission.target_amount;
    const dataPoints = [];

    for (let i = 0; i <= 12; i++) {
      dataPoints.push({
        month: `M${i}`,
        baseline: Math.round(currentMonthlySavings * i),
        current: Math.round((currentMonthlySavings + (target * (activeMission.progress / 100))) * i),
        p25: Math.round((currentMonthlySavings + (target * 0.25)) * i),
        p50: Math.round((currentMonthlySavings + (target * 0.50)) * i),
        target: Math.round((currentMonthlySavings + target) * i),
      });
    }
    return dataPoints;
  };

  const chartData = generateChartData();

  return (
    <div className="relative border-4 border-foreground bg-card rounded-2xl overflow-hidden min-h-[500px] flex flex-col nb-shadow-lg" style={{
      boxShadow: "10px 10px 0px 0px hsl(var(--foreground))"
    }}>
      {/* 2D Gamified Header */}
      <div className="bg-foreground text-background p-4 border-b-4 border-foreground flex justify-between items-center relative overflow-hidden">
        <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CjxyZWN0IHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCIgZmlsbD0ibm9uZSI+PC9yZWN0Pgo8Y2lyY2xlIGN4PSIyIiBjeT0iMiIgcj0iMSIgZmlsbD0iI2ZmZmZmZiI+PC9jaXJjbGU+Cjwvc3ZnPg==')] border-repeat"></div>
        <div className="flex items-center gap-3 z-10">
          <Gamepad2 className="w-8 h-8 animate-pulse text-accent" />
          <h2 className="font-black text-2xl tracking-widest uppercase">Wealth Quest</h2>
        </div>
      </div>

      {/* Mission Hub Phase */}
      {(loading || isInitializing) && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 z-10 bg-background/80 absolute inset-0 backdrop-blur-sm animate-in fade-in duration-300">
           <div className="w-16 h-16 border-8 border-t-accent border-foreground rounded-full animate-spin speed-2x"></div>
           <p className="mt-6 font-black uppercase text-xl animate-pulse tracking-widest">Calculating Trajectories...</p>
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
                   The Wealth Pilot requires time to recalculate paths. New suggestions will be unlocked in <span className="text-foreground">{eligibilityData.remainingDays} days</span> on {new Date(eligibilityData.nextAvailableAt!).toLocaleDateString()}.
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
                      setLoading(true);
                      try {
                        if (activeMission) {
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
                        }
                        lastGenAtRef.current = Date.now();
                        await fetchQuestions(true);
                        // State automatically saved by auto-save
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
        <div className="flex-1 p-6 md:p-8 animate-in slide-in-from-right duration-500 overflow-y-auto">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Left: Action Items */}
            <div className="flex-1 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                   <h3 className="text-2xl font-black uppercase text-foreground leading-tight">{activeMission.action_text}</h3>
                   <p className="text-muted-foreground font-bold text-sm">Target: +₹{activeMission.target_amount?.toLocaleString()}/mo savings</p>
                </div>
                {onMissionCleared && (
                   <button 
                    onClick={() => {
                      setPhase("paths");
                      if (onMissionCleared) onMissionCleared();
                    }}
                    className="nb-button-outline p-2 hover:bg-accent hover:text-background transition-colors"
                    title="Back to Selection"
                   >
                     <ArrowLeft className="w-5 h-5" />
                   </button>
                )}
              </div>

              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Swords className="w-4 h-4" /> Action Checklist
                </h4>
                {activeMission.action_items?.map((item, i) => (
                  <button 
                    key={i}
                    onClick={() => toggleItem(i)}
                    className={`w-full p-4 rounded-xl border-2 border-foreground flex items-center gap-4 transition-all duration-200 text-left ${item.status === 'completed' ? 'bg-success/20 opacity-70' : 'bg-background hover:bg-muted'}`}
                  >
                    {item.status === 'completed' ? <CheckSquare className="w-6 h-6 text-success" /> : <Square className="w-6 h-6" />}
                    <span className={`font-bold ${item.status === 'completed' ? 'line-through' : ''}`}>{item.text}</span>
                  </button>
                ))}
              </div>

              <div className="bg-secondary/10 border-dashed py-4 px-6 mt-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-black uppercase">Progression</span>
                  <span className="text-sm font-black">{activeMission.progress}%</span>
                </div>
                <div className="w-full h-4 bg-muted border-2 border-foreground rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary transition-all duration-1000 ease-out" 
                    style={{ width: `${activeMission.progress}%` }}
                  />
                </div>
              </div>

              {/* Weekly Refresh Option */}
              <div className="flex gap-4 mt-8 pt-8 border-t-4 border-dashed border-foreground/10">
                <div className="flex-1">
                   <p className="text-xs font-bold text-muted-foreground uppercase tracking-tight mb-2">Goal shifted? Situation changed?</p>
                   <button
                    onClick={async () => {
                      try {
                        setLoading(true);
                        // Check cached data first to save API calls
                        if (eligibilityData) {
                          setLoading(false);
                          setEligibilityPopupOpen(true);
                          return;
                        }
                        
                        const { data: { session } } = await supabase.auth.getSession();
                        const res = await fetch(`${BACKEND_URL}/api/simulator/eligibility`, {
                          headers: { "Authorization": `Bearer ${session?.access_token}` }
                        });
                        
                        if (res.ok) {
                          const data = await res.json();
                          setEligibilityData(data);
                          setEligibilityPopupOpen(true);
                        } else {
                          toast.error("Could not verify status");
                        }
                      } catch(err) {
                        console.error(err);
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="w-full py-4 border-2 border-dashed border-foreground bg-accent/10 hover:bg-accent/20 font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 nb-button"
                   >
                     <Activity className="w-4 h-4" /> Generate New Suggestions
                   </button>
                </div>
              </div>
            </div>

            {/* Right: Projections */}
            <div className="flex-1 space-y-4">
              <h4 className="text-xs font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 px-2">
                <TrendingUp className="w-4 h-4" /> 12-Month Impact Analysis
              </h4>
              <div className="h-[300px] w-full bg-background border-4 border-foreground rounded-xl p-4 nb-shadow-sm">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                    <XAxis dataKey="month" stroke="currentColor" fontSize={10} fontWeight="bold" />
                    <YAxis stroke="currentColor" fontSize={10} fontWeight="bold" tickFormatter={(v) => `₹${(v/1000)}k`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '2px solid hsl(var(--foreground))', borderRadius: '8px', fontWeight: 'bold' }}
                      formatter={(v) => `₹${v.toLocaleString()}`}
                    />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                    <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="target" name="100% Win" stroke="#22c55e" strokeWidth={3} dot={false} />
                    <Line type="monotone" dataKey="current" name="Live Path" stroke="#3b82f6" strokeWidth={4} isAnimationActive={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-success/10 border-2 border-foreground rounded-lg text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Total Gain (1yr)</p>
                  <p className="text-lg font-black italic">+₹{(activeMission.target_amount || 0) * 12}</p>
                </div>
                <div className="p-3 bg-primary/10 border-2 border-foreground rounded-lg text-center">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Days Active</p>
                  <p className="text-lg font-black">{Math.max(0, Math.floor((new Date().getTime() - new Date(activeMission.start_date || new Date()).getTime()) / (1000 * 3600 * 24)))}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Intro Phase */}
      {phase === "intro" && !loading && !isInitializing && (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center relative z-10 bg-gradient-to-b from-card to-accent/10">
          <Ghost className="w-20 h-20 text-accent mb-6 animate-bounce" />
          <h3 className="text-3xl font-black mb-1">New Campaign</h3>
          <p className="text-muted-foreground font-bold mb-8 max-w-sm">Answer the Pilot's questions to unlock high-impact financial missions.</p>
          <button onClick={() => fetchQuestions(false)} className="nb-button text-xl px-12 py-4 flex items-center gap-3 hover:scale-105 transition-transform">
             <PlayCircle className="w-6 h-6" /> Start Quest
          </button>
        </div>
      )}

      {/* Questions Phase */}
      {phase === "questions" && !loading && !isInitializing && questions.length > 0 && (
        <div className="flex-1 flex flex-col p-8 z-10">
          <div className="flex justify-between items-center mb-8 border-b-4 border-foreground/10 pb-4">
             <div className="flex flex-col">
               <span className="font-black text-muted-foreground uppercase tracking-widest text-xs">Encounter {currentQIndex + 1} / {questions.length}</span>
               <span className="text-[10px] font-bold text-accent animate-pulse mt-1">Tip: Be descriptive for better quest suggestions!</span>
             </div>
             <div className="flex items-center gap-4">
               {/* <div className="flex gap-1 border-2 border-foreground rounded-lg p-1 bg-background">
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex], rating: 1 })
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
                      body: JSON.stringify({ question: questions[currentQIndex], rating: -1 })
                    });
                    toast.success("Feedback received. Improving the Pilot... 🛠️");
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

          <div className="flex gap-1 border-2 border-foreground rounded-lg p-1 bg-background absolute" style={{width: 'fit-content', bottom: '20px'}}>
                 <button 
                  onClick={async () => {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch(`${BACKEND_URL}/api/simulator/rate`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session?.access_token}` },
                      body: JSON.stringify({ question: questions[currentQIndex], rating: 1 })
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
                      body: JSON.stringify({ question: questions[currentQIndex], rating: -1 })
                    });
                    toast.success("Feedback received. Improving the Pilot... 🛠️");
                  }}
                  className="p-1 hover:bg-danger/20 rounded transition-colors" title="Rate Down"
                 >
                   <ThumbsDown className="w-4 h-4 text-danger" />
                 </button>
               </div>
          
          <div className="flex-1 max-w-2xl mx-auto w-full">
            
            <h3 className="text-2xl font-black text-foreground mb-8 leading-relaxed animate-in slide-in-from-right-8 duration-300">
              "{questions[currentQIndex]}"
            </h3>
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type="text" 
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && submitAnswer()}
                  placeholder="Talk to the Pilot..."
                  className="w-full text-lg p-6 pr-2 rounded-xl border-4 border-foreground bg-background font-medium focus:outline-none focus:ring-4 focus:ring-accent/50 focus:border-accent transition-all nb-shadow-sm"
                  autoFocus
                />
                <button 
                  onClick={submitAnswer}
                  disabled={!currentInput.trim()}
                  className="absolute right-[-70px] top-3 bottom-3 aspect-square bg-foreground text-background flex items-center justify-center rounded-lg hover:bg-accent disabled:opacity-50 transition-colors"
                >
                  <ArrowRight className="w-6 h-6" />
                </button>
              </div>
              
              <div className="flex flex-wrap gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-200">
                {["Saving for a home", "Retirement planning", "Emergency fund", "International trip", "Buying a car"].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => setCurrentInput(suggestion)}
                    className="px-3 py-1.5 rounded-lg border-2 border-foreground text-[10px] font-black uppercase tracking-tight bg-background hover:bg-secondary/20 transition-all active:scale-95"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Paths Phase */}
      {phase === "paths" && !loading && !isInitializing && (
        <div className="flex-1 flex flex-col p-4 md:p-8 z-10 bg-gradient-to-br from-card to-secondary/10 overflow-y-auto">
            <h3 className="text-2xl font-black text-center mb-6 uppercase tracking-widest">Select Your Specialization</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {recommendations.map((rec, i) => {
                const difficultyColors = {
                  "Hard": "bg-danger/20 border-danger text-danger",
                  "Medium": "bg-accent/20 border-accent text-accent",
                  "Easy": "bg-success/20 border-success text-success"
                };
                const diffStyle = difficultyColors[rec.difficulty] || difficultyColors["Medium"];
                const isActive = activeMission?.action_text === rec.title;
                const isDisabled = activeMission && !isActive;

                return (
                  <div 
                    key={i} 
                    className={`group relative flex flex-col bg-background border-4 border-foreground p-8 rounded-xl transition-all duration-300 overflow-hidden ${isDisabled ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] cursor-pointer'}`} 
                    onClick={() => !isDisabled && selectPath(rec)}
                  >
                    {/* Vision Banner */}
                    <div className={`absolute top-0 left-0 right-0 text-background text-[10px] font-black uppercase py-2 text-center tracking-widest translate-y-0 transition-colors ${isActive ? 'bg-success' : 'bg-foreground group-hover:bg-primary'}`}>
                       {isActive ? "Currently Active Specialization" : (rec.vision || "Current: Vulnerable -> Future: Shielded")}
                    </div>

                    <div className="relative z-10 flex-1 mt-8">
                      <div className={`inline-block px-3 py-1 border-2 rounded-full text-[10px] font-black uppercase mb-4 ${diffStyle}`}>
                        {rec.difficulty} ({rec.duration_weeks} Weeks)
                      </div>
                      <h4 className="text-2xl font-black mb-4 leading-tight">{rec.title}</h4>
                      <p className="text-sm font-bold text-muted-foreground leading-relaxed mb-6 border-l-4 border-foreground/10 pl-4">
                        {rec.description}
                      </p>

                      {/* Vision Details - Bullet Points */}
                      <div className="space-y-3 mb-8">
                        <p className="text-[10px] font-black uppercase tracking-widest text-foreground/50">Mission Benefits:</p>
                        {(rec.impact_bullets || ["Financial safety", "Stress reduction", "Asset growth"]).map((bullet, idx) => (
                           <div key={idx} className="flex items-start gap-2 group/bullet">
                             <div className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                             <p className="text-xs font-bold leading-tight uppercase tracking-tight">{bullet}</p>
                           </div>
                        ))}
                      </div>
                    </div>

                    <button 
                      onClick={() => selectPath(rec)}
                      disabled={isDisabled}
                      className={`relative z-10 mt-auto w-full py-5 border-4 border-foreground font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 ${isActive ? 'bg-success text-success-foreground' : 'bg-foreground text-background group-hover:bg-primary group-hover:text-foreground'}`}
                    >
                       {isActive ? "Currently Active - Resume" : isDisabled ? "Locked" : "Accept specialization"} <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
        </div>
      )}

    </div>
  );
}
