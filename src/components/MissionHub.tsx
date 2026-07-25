import { useMemo, useState } from "react";
import type { BackendFinancialMetrics, FinancialData, FinancialMetrics } from "@/types/finance";
import { buildMoneyStory, type CheckupStatus } from "@/lib/money-story";
import { QUEST_COPY } from "@/lib/quest-copy";
import {
  CHECK_IN_PULSE_OPTIONS,
  buildRoadmap,
  clampDurationWeeks,
  deriveWeekPlan,
  getCurrentWeekIndex,
  getCompletedCheckInWeeks,
  isCheckInDue,
  isReviewWeek,
  progressFromCheckIns,
  type CheckInPulse,
  type MissionActionItem,
  type MissionCheckIn,
} from "@/lib/mission-plan";
import {
  Activity,
  ArrowLeft,
  ChevronDown,
  Swords,
  TrendingUp,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export interface MissionFocusChip {
  id: string;
  title: string;
  status?: CheckupStatus;
  role?: string;
}

export interface MissionRecord {
  id: string;
  action_text: string;
  action_items?: MissionActionItem[];
  target_amount?: number;
  progress: number;
  status: string;
  start_date?: string;
  mission_data?: {
    duration_weeks?: number;
    focuses?: MissionFocusChip[];
    focus_ids?: string[];
    start_snapshot?: {
      checkup?: { id: string; title: string; status: CheckupStatus; summary: string }[];
    } | null;
    check_ins?: MissionCheckIn[];
    last_check_in_at?: string | null;
  } | null;
}

interface MissionHubProps {
  mission: MissionRecord;
  fallbackFocuses?: MissionFocusChip[];
  data: FinancialData;
  metrics: FinancialMetrics;
  backendMetrics: BackendFinancialMetrics;
  onBack?: () => void;
  onSaveCheckIn: (checkIn: MissionCheckIn, progress: number, status: string) => Promise<void>;
  onRequestRegen: () => void;
  onRefreshData?: () => void;
}

export function MissionHub({
  mission,
  fallbackFocuses = [],
  data,
  metrics,
  backendMetrics,
  onBack,
  onSaveCheckIn,
  onRequestRegen,
  onRefreshData,
}: MissionHubProps) {
  const meta = mission.mission_data || {};
  const durationWeeks = clampDurationWeeks(meta.duration_weeks);
  const checkIns = meta.check_ins || [];
  const focuses = (meta.focuses?.length ? meta.focuses : fallbackFocuses) as MissionFocusChip[];
  const currentWeek = getCurrentWeekIndex(mission.start_date, durationWeeks);
  const due = isCheckInDue(mission.start_date, checkIns, durationWeeks);
  const weekProgress = progressFromCheckIns(checkIns, durationWeeks);
  const thisWeekItems = deriveWeekPlan(mission.action_items, durationWeeks, due.weekIndex || currentWeek);
  const roadmap = useMemo(
    () => buildRoadmap(mission.action_items, durationWeeks),
    [mission.action_items, durationWeeks]
  );
  const completedWeeks = new Set(getCompletedCheckInWeeks(checkIns));
  const showReview = isReviewWeek(currentWeek, durationWeeks) || weekProgress >= 100;
  const thisWeekLogged = completedWeeks.has(due.weekIndex || currentWeek);
  const chartUnlocked = checkIns.length > 0;

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [roadmapOpen, setRoadmapOpen] = useState(false);
  const [pulse, setPulse] = useState<CheckInPulse>("same");
  const [itemResults, setItemResults] = useState<Record<number, "done" | "partial" | "skipped">>({});
  const [saving, setSaving] = useState(false);

  const currentStory = buildMoneyStory(data, metrics, backendMetrics);
  const deltas = useMemo(() => {
    const snap = meta.start_snapshot?.checkup || [];
    if (!snap.length) return [];
    return snap
      .map((start) => {
        const now = currentStory.checkup.find((c) => c.id === start.id);
        if (!now || start.status === now.status) return null;
        return { id: start.id, title: start.title, from: start.status, to: now.status, summary: now.summary };
      })
      .filter(Boolean) as { id: string; title: string; from: CheckupStatus; to: CheckupStatus; summary: string }[];
  }, [meta.start_snapshot, currentStory.checkup]);

  const chartData = useMemo(() => {
    if (checkIns.length < 1 || !mission.target_amount) return [];
    const baselineMonthly = data.monthlyIncome - metrics.totalExpenses;
    const target = mission.target_amount;
    const adherence = weekProgress / 100;
    const months = Math.max(3, Math.ceil(durationWeeks / 4));
    return Array.from({ length: months + 1 }, (_, i) => ({
      month: `M${i}`,
      baseline: Math.round(baselineMonthly * i),
      current: Math.round((baselineMonthly + target * adherence) * i),
      target: Math.round((baselineMonthly + target) * i),
    }));
  }, [checkIns.length, mission.target_amount, weekProgress, durationWeeks, data.monthlyIncome, metrics.totalExpenses]);

  const openCheckIn = () => {
    const init: Record<number, "done" | "partial" | "skipped"> = {};
    thisWeekItems.forEach((_, i) => {
      init[i] = "done";
    });
    setItemResults(init);
    setPulse("same");
    setCheckInOpen(true);
  };

  const submitCheckIn = async () => {
    if (due.weekIndex == null) return;
    setSaving(true);
    try {
      const checkIn: MissionCheckIn = {
        week_index: due.weekIndex,
        items: thisWeekItems.map((item, i) => ({
          text: item.text,
          result: itemResults[i] || "done",
        })),
        pulse,
        created_at: new Date().toISOString(),
      };
      const nextCheckIns = [
        ...checkIns.filter((c) => c.week_index !== due.weekIndex),
        checkIn,
      ];
      const progress = progressFromCheckIns(nextCheckIns, durationWeeks);
      const status = progress >= 100 ? "completed" : "in_progress";
      await onSaveCheckIn(checkIn, progress, status);
      setCheckInOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 py-4 md:py-6 animate-in fade-in duration-300 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* 1. Header + compact progress */}
        <header className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Wealth Quest
              </p>
              <h3 className="text-xl md:text-2xl font-black text-foreground leading-snug tracking-tight">
                {mission.action_text}
              </h3>
              <p className="text-sm text-muted-foreground font-medium">
                {QUEST_COPY.missionWeekOf(currentWeek, durationWeeks)}
                {mission.target_amount
                  ? ` · ${QUEST_COPY.targetLabel(mission.target_amount)}`
                  : ""}
              </p>
            </div>
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="p-2 rounded-xl border border-border hover:bg-muted transition-colors shrink-0"
                title="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </div>

          {focuses.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {focuses.map((f) => (
                <span
                  key={f.id}
                  className="text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border border-border bg-muted/40"
                >
                  {f.title}
                </span>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="uppercase tracking-wide text-muted-foreground">{QUEST_COPY.planProgress}</span>
              <span>{weekProgress}%</span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-700 ease-out rounded-full"
                style={{ width: `${weekProgress}%` }}
              />
            </div>
            <p className="text-[11px] font-medium text-muted-foreground">
              {QUEST_COPY.checkInsCount(completedWeeks.size, durationWeeks)}
            </p>
          </div>
        </header>

        {showReview && (
          <div className="rounded-2xl border border-border bg-muted/30 p-4 space-y-2">
            <p className="text-sm font-medium leading-relaxed">{QUEST_COPY.reviewPrompt}</p>
            {onRefreshData && (
              <button
                type="button"
                onClick={onRefreshData}
                className="text-xs font-bold underline underline-offset-2"
              >
                {QUEST_COPY.reviewCta}
              </button>
            )}
            {deltas.length > 0 ? (
              <div className="pt-2 space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {QUEST_COPY.deltaTitle}
                </p>
                {deltas.map((d) => (
                  <p key={d.id} className="text-sm">
                    {d.title}: <span className="uppercase">{d.from}</span> →{" "}
                    <span className="uppercase font-bold">{d.to}</span> — {d.summary}
                  </p>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{QUEST_COPY.noDeltaYet}</p>
            )}
          </div>
        )}

        {/* 2. This week hero */}
        <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <Swords className="w-4 h-4" /> {QUEST_COPY.missionThisWeek}
            </h4>
            {thisWeekLogged && (
              <span className="text-[10px] font-bold uppercase tracking-wide text-success">
                {QUEST_COPY.thisWeekLogged(due.weekIndex || currentWeek)}
              </span>
            )}
          </div>

          {thisWeekItems.length > 0 ? (
            <ol className="space-y-3">
              {thisWeekItems.map((item, i) => (
                <li key={`${item.text}-${i}`} className="flex gap-3 text-left">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-muted text-[11px] font-bold flex items-center justify-center text-muted-foreground mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium leading-snug pt-0.5">{item.text}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">No actions for this week.</p>
          )}

          <div className="pt-2 border-t border-border/60 space-y-2">
            {due.due && due.weekIndex != null && !thisWeekLogged ? (
              <>
                <p className="text-xs font-medium text-muted-foreground">
                  {QUEST_COPY.checkInDue(due.weekIndex)}
                </p>
                <button
                  type="button"
                  onClick={openCheckIn}
                  className="w-full py-3.5 rounded-xl bg-foreground text-background text-xs font-black uppercase tracking-wide"
                >
                  {QUEST_COPY.checkInCta}
                </button>
              </>
            ) : thisWeekLogged ? (
              <p className="text-xs text-muted-foreground font-medium">
                {QUEST_COPY.thisWeekLogged(due.weekIndex || currentWeek)}
              </p>
            ) : due.weekIndex == null ? (
              <p className="text-xs text-muted-foreground font-medium">{QUEST_COPY.checkInComplete}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-medium">{QUEST_COPY.checkInNotDue}</p>
            )}

            {!chartUnlocked && (
              <p className="text-[11px] text-muted-foreground/80">{QUEST_COPY.chartLocked}</p>
            )}
          </div>
        </section>

        {/* 3. Roadmap */}
        <section className="rounded-2xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setRoadmapOpen((v) => !v)}
            className="w-full px-4 py-3.5 flex items-center justify-between text-sm font-bold hover:bg-muted/40"
          >
            {QUEST_COPY.missionRoadmap}
            <ChevronDown className={`w-4 h-4 transition-transform ${roadmapOpen ? "rotate-180" : ""}`} />
          </button>
          {roadmapOpen && (
            <ul className="border-t border-border divide-y divide-border max-h-64 overflow-y-auto">
              {roadmap.map((row) => (
                <li key={row.week} className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-xs uppercase tracking-wider">
                      Week {row.week}
                    </span>
                    {completedWeeks.has(row.week) && (
                      <span className="text-[10px] font-bold text-success uppercase">Done</span>
                    )}
                    {row.week === currentWeek && (
                      <span className="text-[10px] font-bold text-primary uppercase">Now</span>
                    )}
                  </div>
                  <ul className="text-muted-foreground space-y-0.5">
                    {row.items.map((it, idx) => (
                      <li key={idx}>• {it.text}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* 4. Impact — only when unlocked */}
        {chartUnlocked && chartData.length > 0 && (
          <section className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" /> {QUEST_COPY.chartTitle}
            </h4>
            <div className="h-[280px] w-full bg-card border border-border rounded-2xl p-3">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.2} />
                  <XAxis dataKey="month" stroke="currentColor" fontSize={10} fontWeight="bold" />
                  <YAxis stroke="currentColor" fontSize={10} fontWeight="bold" tickFormatter={(v) => `₹${v / 1000}k`} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                      fontWeight: "bold",
                    }}
                    formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`}
                  />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }} />
                  <Line type="monotone" dataKey="baseline" name="Baseline" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="target" name="Full target" stroke="#22c55e" strokeWidth={3} dot={false} />
                  <Line type="monotone" dataKey="current" name="At your pace" stroke="#3b82f6" strokeWidth={4} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* 5. Change plan — muted */}
        <footer className="pt-2 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{QUEST_COPY.abandonHint}</p>
          <button
            type="button"
            onClick={onRequestRegen}
            className="inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Activity className="w-3.5 h-3.5" /> {QUEST_COPY.generateNew}
          </button>
        </footer>
      </div>

      {checkInOpen && due.weekIndex != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <div
            className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl border border-border bg-card p-6 space-y-4"
            style={{ boxShadow: "6px 6px 0px 0px hsl(var(--foreground))" }}
          >
            <h3 className="text-lg font-black">{QUEST_COPY.checkInTitle(due.weekIndex)}</h3>
            <div className="space-y-3">
              {thisWeekItems.map((item, i) => (
                <div key={i} className="space-y-2 rounded-xl border border-border p-3">
                  <p className="text-sm font-medium">{item.text}</p>
                  <div className="flex flex-wrap gap-2">
                    {(["done", "partial", "skipped"] as const).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setItemResults((prev) => ({ ...prev, [i]: r }))}
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border border-border capitalize ${
                          (itemResults[i] || "done") === r
                            ? "bg-foreground text-background"
                            : "bg-card hover:bg-muted"
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                {QUEST_COPY.checkInPulse}
              </p>
              <div className="flex flex-wrap gap-2">
                {CHECK_IN_PULSE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPulse(opt.value)}
                    className={`text-xs font-bold px-3 py-1.5 rounded-lg border border-border ${
                      pulse === opt.value ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button type="button" className="nb-button-outline flex-1" onClick={() => setCheckInOpen(false)}>
                {QUEST_COPY.checkInCancel}
              </button>
              <button
                type="button"
                className="nb-button-primary flex-1 disabled:opacity-40"
                disabled={saving}
                onClick={submitCheckIn}
              >
                {QUEST_COPY.checkInSave}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
