import { useEffect, useMemo, useState } from "react";
import type { BackendFinancialMetrics, FinancialData, FinancialMetrics } from "@/types/finance";
import {
  STRONG_INTENT_OPTIONS,
  buildMoneyStory,
  checkupToQuestFocus,
  preselectWorstFocusIds,
  type CheckupItem,
  type FocusIntent,
  type QuestFocus,
} from "@/lib/money-story";
import { Shield, ShieldAlert, ShieldCheck, X } from "lucide-react";

interface QuestFocusPickerProps {
  open: boolean;
  data: FinancialData;
  metrics: FinancialMetrics;
  backendMetrics: BackendFinancialMetrics;
  onClose: () => void;
  onConfirm: (userFocuses: QuestFocus[]) => void;
}

const statusMeta = {
  risk: { label: "Risk", className: "bg-danger/10 text-danger border-danger/40", Icon: ShieldAlert },
  watch: { label: "Watch", className: "bg-warning/20 text-foreground border-warning/50", Icon: Shield },
  strong: { label: "Strong", className: "bg-success/15 text-success border-success/40", Icon: ShieldCheck },
} as const;

export function QuestFocusPicker({
  open,
  data,
  metrics,
  backendMetrics,
  onClose,
  onConfirm,
}: QuestFocusPickerProps) {
  const checkup = useMemo(
    () => buildMoneyStory(data, metrics, backendMetrics).checkup,
    [data, metrics, backendMetrics]
  );

  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [strongIntents, setStrongIntents] = useState<Record<string, FocusIntent>>({});
  const [strongNotes, setStrongNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const preset = preselectWorstFocusIds(checkup, 2);
    setSelectedIds(preset);
    setStrongIntents({});
    setStrongNotes({});
  }, [open, checkup]);

  if (!open) return null;

  const toggle = (item: CheckupItem) => {
    setSelectedIds((prev) => {
      if (prev.includes(item.id)) return prev.filter((id) => id !== item.id);
      if (prev.length >= 2) return [prev[1], item.id];
      return [...prev, item.id];
    });
  };

  const selectedStrong = checkup.filter(
    (item) => selectedIds.includes(item.id) && item.status === "strong"
  );

  const canSubmit = selectedIds.length === 2;

  const handleConfirm = () => {
    if (!canSubmit) return;
    const focuses = selectedIds
      .map((id) => checkup.find((c) => c.id === id))
      .filter((item): item is CheckupItem => !!item)
      .map((item) =>
        checkupToQuestFocus(
          item,
          strongIntents[item.id] ?? "optimize",
          strongNotes[item.id]
        )
      );
    onConfirm(focuses);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-foreground/40 backdrop-blur-[2px]">
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border-2 border-foreground bg-card"
        style={{ boxShadow: "6px 6px 0px 0px hsl(var(--foreground))" }}
        role="dialog"
        aria-labelledby="quest-focus-title"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 px-5 py-4 border-b-2 border-foreground/10 bg-card">
          <div>
            <h2 id="quest-focus-title" className="font-sans text-lg font-black text-foreground">
              What should this quest target?
            </h2>
            <p className="text-sm text-muted-foreground font-medium mt-1">
              Pick 2. We&apos;ll add one more based on your full picture.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border-2 border-foreground hover:bg-muted transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <ul className="divide-y-2 divide-foreground/10">
          {checkup.map((item) => {
            const selected = selectedIds.includes(item.id);
            const meta = statusMeta[item.status];
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => toggle(item)}
                  className={`w-full text-left px-5 py-4 flex items-start gap-3 transition-colors ${
                    selected ? "bg-primary/10" : "hover:bg-muted/40"
                  }`}
                >
                  <span
                    className={`mt-0.5 w-5 h-5 rounded border-2 border-foreground flex items-center justify-center shrink-0 ${
                      selected ? "bg-foreground text-background" : "bg-card"
                    }`}
                  >
                    {selected ? "✓" : ""}
                  </span>
                  <meta.Icon
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      item.status === "risk"
                        ? "text-danger"
                        : item.status === "watch"
                          ? "text-warning"
                          : "text-success"
                    }`}
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-foreground">{item.title}</span>
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${meta.className}`}
                      >
                        {meta.label}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">{item.summary}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>

        {selectedStrong.length > 0 && (
          <div className="px-5 py-4 border-t-2 border-foreground/10 space-y-4 bg-success/5">
            <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
              Strong area — how should we push it?
            </p>
            {selectedStrong.map((item) => (
              <div key={item.id} className="space-y-2">
                <p className="text-sm font-bold text-foreground">{item.title}</p>
                <div className="flex flex-wrap gap-2">
                  {STRONG_INTENT_OPTIONS.map((opt) => {
                    const active = (strongIntents[item.id] ?? "optimize") === opt.intent;
                    return (
                      <button
                        key={opt.intent}
                        type="button"
                        onClick={() =>
                          setStrongIntents((prev) => ({ ...prev, [item.id]: opt.intent }))
                        }
                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 border-foreground transition-colors ${
                          active ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={strongNotes[item.id] ?? ""}
                  onChange={(e) =>
                    setStrongNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                  }
                  placeholder="Anything specific? (optional)"
                  className="nb-input w-full text-sm py-2"
                />
              </div>
            ))}
          </div>
        )}

        <div className="sticky bottom-0 px-5 py-4 border-t-2 border-foreground/10 bg-card flex flex-col sm:flex-row gap-2">
          <button type="button" onClick={onClose} className="nb-button-outline flex-1">
            Cancel
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleConfirm}
            className="nb-button-primary flex-1 disabled:opacity-40 disabled:pointer-events-none"
          >
            Ask questions ({selectedIds.length}/2)
          </button>
        </div>
      </div>
    </div>
  );
}
