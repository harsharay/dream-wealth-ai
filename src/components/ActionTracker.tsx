import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Circle, Flame, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, format } from "date-fns";

const isDev = import.meta.env.VITE_ENV === 'dev';
const BACKEND_URL = isDev ? "http://localhost:3001" : (import.meta.env.VITE_API_URL || "http://localhost:3001");

interface TrackedAction {
  id: string;
  action_text: string;
  start_date: string;
  last_update: string;
  progress: number;
  status: "not_started" | "in_progress" | "completed" | "abandoned";
}

interface ActionTrackerProps {
  onActionClick: (action: TrackedAction) => void;
}

export function ActionTracker({ onActionClick }: ActionTrackerProps) {
  const { user } = useAuth();
  const [actions, setActions] = useState<TrackedAction[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActions = async () => {
    if (!user) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      
      const res = await fetch(`${BACKEND_URL}/api/simulator/track`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActions(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActions();
  }, [user]);

  const toggleProgress = async (action: TrackedAction) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // Add 10% progress per click
      const newProgress = Math.min(action.progress + 10, 100);
      const newStatus = newProgress === 100 ? "completed" : "in_progress";

      const res = await fetch(`${BACKEND_URL}/api/simulator/track/${action.id}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}` 
        },
        body: JSON.stringify({ progress: newProgress, status: newStatus })
      });

      if (res.ok) {
        setActions(prev => prev.map(a => a.id === action.id ? { ...a, progress: newProgress, status: newStatus, last_update: new Date().toISOString() } : a));
        if (newProgress === 100) {
          toast.success("Goal completed! You're crushing it! 🎉");
        } else {
          toast.success("Progress logged! Keep the streak alive!");
        }
      }
    } catch (err) {
      toast.error("Failed to log progress");
    }
  };

  if (loading || actions.length === 0) return null;

  return (
    <div className="nb-card mt-8 animate-in slide-in-from-bottom duration-500">
      <div className="flex items-center gap-2 mb-6">
        <div className="w-8 h-8 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center nb-shadow">
          <TrendingUp className="w-4 h-4 text-primary-foreground" />
        </div>
        <h3 className="font-sans font-black text-xl text-foreground uppercase tracking-widest">
          Active Missions
        </h3>
      </div>

      <div className="space-y-4">
        {actions
          .filter(a => a.status !== "abandoned")
          .map(action => {
            const daysActive = differenceInDays(new Date(), new Date(action.start_date));
            const isCompleted = action.status === "completed";

          return (
            <div 
              key={action.id} 
              onClick={() => onActionClick(action)}
              className={`p-4 rounded-xl border-2 border-foreground transition-all duration-300 cursor-pointer ${isCompleted ? 'bg-success/20' : 'bg-card hover:-translate-y-1 nb-shadow hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]'}`}
            >
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h4 className={`font-bold ${isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {action.action_text}
                  </h4>
                  <div className="flex items-center gap-4 mt-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <span className="flex items-center gap-1">
                      <Flame className={`w-3.5 h-3.5 ${daysActive > 3 && !isCompleted ? 'text-primary' : ''}`} />
                      {daysActive} Day Streak
                    </span>
                    <span>
                      Started {format(new Date(action.start_date), "MMM d")}
                    </span>
                  </div>
                </div>
                
                <div className="shrink-0">
                  {isCompleted ? (
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  ) : (
                    <div className="w-8 h-8 rounded-full border-2 border-foreground relative overflow-hidden bg-background">
                       <div 
                         className="absolute bottom-0 left-0 right-0 bg-primary transition-all duration-500 ease-out" 
                         style={{ height: `${action.progress}%` }}
                       />
                       <Circle className="w-8 h-8 text-transparent absolute inset-0 mix-blend-difference" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
