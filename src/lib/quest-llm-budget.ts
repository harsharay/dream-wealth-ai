/**
 * Quest LLM budget — keep in sync with backend src/config/questLlmBudget.js
 * Allowed model calls in Quest: questions + recommend only.
 * Week plans, check-ins, deltas: deterministic (see mission-plan.ts).
 */
export const QUEST_LLM_ALLOWED = ["questions", "recommend"] as const;
