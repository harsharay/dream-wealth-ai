/**
 * Deterministic mission scheduling — no LLM.
 * Durations and review points come from stored mission fields + named fractions.
 */

export type ActionCadence = "setup" | "weekly" | "verify";

export interface MissionActionItem {
  text: string;
  impact?: number;
  status?: "pending" | "completed" | "abandoned" | "partial" | "skipped";
  cadence?: ActionCadence;
}

export type CheckInPulse = "tighter" | "same" | "easier";

export interface WeekCheckInItem {
  text: string;
  result: "done" | "partial" | "skipped";
}

export interface MissionCheckIn {
  week_index: number;
  items: WeekCheckInItem[];
  pulse: CheckInPulse;
  note?: string;
  created_at: string;
}

export interface MissionPlanConfig {
  /** Fraction of duration used for setup cadence when items lack cadence tags */
  setupWeekFraction: number;
  /** Fraction of duration (from end) used for verify cadence */
  verifyWeekFraction: number;
  checkInPeriodMs: number;
  /** Review prompts at these fractions of duration_weeks */
  reviewFractions: number[];
}

export const DEFAULT_MISSION_PLAN_CONFIG: MissionPlanConfig = {
  setupWeekFraction: 0.2,
  verifyWeekFraction: 0.15,
  checkInPeriodMs: 7 * 24 * 60 * 60 * 1000,
  reviewFractions: [0.25, 0.5, 1.0],
};

export const CHECK_IN_PULSE_OPTIONS: { value: CheckInPulse; label: string }[] = [
  { value: "tighter", label: "Tighter" },
  { value: "same", label: "About the same" },
  { value: "easier", label: "Easier" },
];

export function clampDurationWeeks(durationWeeks: number | undefined | null, fallback = 12): number {
  const n = Number(durationWeeks);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(104, Math.round(n));
}

/** Current week index 1..durationWeeks from start_date. */
export function getCurrentWeekIndex(
  startDate: string | undefined,
  durationWeeks: number,
  now = Date.now(),
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): number {
  const duration = clampDurationWeeks(durationWeeks);
  if (!startDate) return 1;
  const start = new Date(startDate).getTime();
  if (!Number.isFinite(start)) return 1;
  const elapsed = Math.max(0, now - start);
  const week = Math.floor(elapsed / config.checkInPeriodMs) + 1;
  return Math.min(duration, Math.max(1, week));
}

function inferCadence(items: MissionActionItem[]): ActionCadence[] {
  return items.map((item, i) => {
    if (item.cadence === "setup" || item.cadence === "weekly" || item.cadence === "verify") {
      return item.cadence;
    }
    if (items.length === 1) return "weekly";
    if (i === 0) return "setup";
    if (i === items.length - 1) return "verify";
    return "weekly";
  });
}

export function deriveWeekPlan(
  actionItems: MissionActionItem[] | undefined,
  durationWeeks: number,
  weekIndex: number,
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): MissionActionItem[] {
  const items = actionItems || [];
  if (!items.length) return [];
  const duration = clampDurationWeeks(durationWeeks);
  const week = Math.min(duration, Math.max(1, weekIndex));
  const cadences = inferCadence(items);

  const setupEnd = Math.max(1, Math.ceil(duration * config.setupWeekFraction));
  const verifyStart = Math.min(duration, duration - Math.max(0, Math.ceil(duration * config.verifyWeekFraction)) + 1);

  const setupItems = items.filter((_, i) => cadences[i] === "setup");
  const weeklyItems = items.filter((_, i) => cadences[i] === "weekly");
  const verifyItems = items.filter((_, i) => cadences[i] === "verify");

  if (week <= setupEnd && setupItems.length) {
    return setupItems;
  }
  if (week >= verifyStart && verifyItems.length) {
    return verifyItems;
  }
  if (weeklyItems.length) return weeklyItems;
  // Fallback: rotate through all items
  return [items[(week - 1) % items.length]];
}

export function buildRoadmap(
  actionItems: MissionActionItem[] | undefined,
  durationWeeks: number,
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): { week: number; items: MissionActionItem[] }[] {
  const duration = clampDurationWeeks(durationWeeks);
  return Array.from({ length: duration }, (_, i) => ({
    week: i + 1,
    items: deriveWeekPlan(actionItems, duration, i + 1, config),
  }));
}

export function getCompletedCheckInWeeks(checkIns: MissionCheckIn[] | undefined): number[] {
  return [...new Set((checkIns || []).map((c) => c.week_index))].sort((a, b) => a - b);
}

export function progressFromCheckIns(
  checkIns: MissionCheckIn[] | undefined,
  durationWeeks: number
): number {
  const duration = clampDurationWeeks(durationWeeks);
  const completed = getCompletedCheckInWeeks(checkIns).length;
  return Math.min(100, Math.round((completed / duration) * 100));
}

/** Next week that needs a check-in (1-based), or null if mission complete. */
export function getNextCheckInWeek(
  checkIns: MissionCheckIn[] | undefined,
  durationWeeks: number
): number | null {
  const duration = clampDurationWeeks(durationWeeks);
  const done = new Set(getCompletedCheckInWeeks(checkIns));
  for (let w = 1; w <= duration; w++) {
    if (!done.has(w)) return w;
  }
  return null;
}

export function isCheckInDue(
  startDate: string | undefined,
  checkIns: MissionCheckIn[] | undefined,
  durationWeeks: number,
  now = Date.now(),
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): { due: boolean; weekIndex: number | null } {
  const next = getNextCheckInWeek(checkIns, durationWeeks);
  if (next == null) return { due: false, weekIndex: null };
  const current = getCurrentWeekIndex(startDate, durationWeeks, now, config);
  // Due once calendar has reached that week
  return { due: current >= next, weekIndex: next };
}

export function reviewWeekNumbers(
  durationWeeks: number,
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): number[] {
  const duration = clampDurationWeeks(durationWeeks);
  return [...new Set(
    config.reviewFractions.map((f) => Math.min(duration, Math.max(1, Math.ceil(f * duration))))
  )].sort((a, b) => a - b);
}

export function isReviewWeek(
  weekIndex: number,
  durationWeeks: number,
  config: MissionPlanConfig = DEFAULT_MISSION_PLAN_CONFIG
): boolean {
  return reviewWeekNumbers(durationWeeks, config).includes(weekIndex);
}
