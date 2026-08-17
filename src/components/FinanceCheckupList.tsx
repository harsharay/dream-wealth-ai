import { useState } from "react";
import { sortCheckupBySeverity, type CheckupItem, type CheckupStatus } from "@/lib/money-story";
import { ChevronDown, ShieldAlert, ShieldCheck, Shield } from "lucide-react";

interface FinanceCheckupListProps {
  items: CheckupItem[];
}

const statusMeta: Record<
  CheckupStatus,
  { label: string; className: string; Icon: typeof ShieldCheck }
> = {
  strong: {
    label: "Strong",
    className: "bg-success/15 text-success border-success/40",
    Icon: ShieldCheck,
  },
  watch: {
    label: "Watch",
    className: "bg-warning/20 text-foreground border-warning/50",
    Icon: Shield,
  },
  risk: {
    label: "Risk",
    className: "bg-danger/10 text-danger border-danger/40",
    Icon: ShieldAlert,
  },
};

export function FinanceCheckupList({ items }: FinanceCheckupListProps) {
  const [openId, setOpenId] = useState<string | null>(
    sortCheckupBySeverity(items)[0]?.id ?? items[0]?.id ?? null
  );

  return (
    <section className="nb-card p-0 overflow-hidden">
      <div className="px-6 pt-6 pb-3">
        <h3 className="text-sm font-black uppercase tracking-wider text-muted-foreground">
          Finance checkup
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Tap a row for a short read on what to watch.
        </p>
      </div>
      <ul className="divide-y-2 divide-foreground/10">
        {items.map((item) => {
          const meta = statusMeta[item.status];
          const isOpen = openId === item.id;
          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setOpenId(isOpen ? null : item.id)}
                className="w-full text-left px-6 py-4 flex items-start gap-3 hover:bg-muted/40 transition-colors"
                aria-expanded={isOpen}
              >
                <meta.Icon className={`w-5 h-5 mt-0.5 shrink-0 ${item.status === "risk" ? "text-danger" : item.status === "watch" ? "text-warning" : "text-success"}`} />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-foreground">{item.title}</span>
                    <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${meta.className}`}>
                      {meta.label}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">{item.summary}</p>
                  {isOpen && (
                    <p className="text-sm text-foreground leading-relaxed pt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                      {item.detail}
                    </p>
                  )}
                </div>
                <ChevronDown
                  className={`w-4 h-4 shrink-0 text-muted-foreground transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
