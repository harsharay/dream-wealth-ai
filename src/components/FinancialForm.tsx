import { useState, type ChangeEvent } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import type { FinancialData, RiskAppetite } from "@/types/finance";
import { distributeExpenses } from "@/lib/onboarding-defaults";

interface FinancialFormProps {
  data: FinancialData;
  onSave: (data: FinancialData) => void;
  /** When true the sections start collapsed (used in the Review step after chat onboarding) */
  startCollapsed?: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatValue(val: number): string {
  if (val === 0) return "";
  return new Intl.NumberFormat("en-IN").format(val);
}

function parseRaw(raw: string): number {
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

function titleCase(key: string): string {
  return key.replace(/([A-Z])/g, " $1").trim();
}

// ─── Single field ─────────────────────────────────────────────────────────────

const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block";
const inputClass = "nb-input w-full text-sm";

function Field({
  label,
  value,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (raw: string) => void;
  suffix?: string;
}) {
  return (
    <div>
      <label className={labelClass}>
        {label}
        {suffix && <span className="ml-1 normal-case font-medium">{suffix}</span>}
      </label>
      <input
        type="text"
        inputMode="numeric"
        className={inputClass}
        value={formatValue(value)}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          const stripped = e.target.value.replace(/,/g, "");
          if (stripped === "" || /^\d*$/.test(stripped)) onChange(stripped);
        }}
        placeholder="₹ 0"
      />
    </div>
  );
}

// ─── Total display shown in collapsed header ──────────────────────────────────

function TotalBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-muted-foreground font-medium">No data</span>;
  return (
    <span className="text-sm font-bold text-foreground">
      ₹{new Intl.NumberFormat("en-IN").format(value)}
    </span>
  );
}

// ─── Collapsible money section ────────────────────────────────────────────────

interface CollapsibleMoneySectionProps {
  title: string;
  emoji: string;
  total: number;
  startOpen: boolean;
  /** Distribute total into sub-fields using default ratios; called only when sub-fields are all zero */
  onDistribute?: (total: number) => void;
  children: React.ReactNode;
}

function CollapsibleMoneySection({
  title,
  emoji,
  total,
  startOpen,
  children,
}: CollapsibleMoneySectionProps) {
  const [open, setOpen] = useState(startOpen);

  return (
    <div className="nb-card">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 group"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="font-sans font-bold text-foreground text-lg flex items-center gap-2">
          {emoji} {title}
        </span>
        <div className="flex items-center gap-3">
          {!open && <TotalBadge value={total} />}
          <span className="text-muted-foreground group-hover:text-foreground transition-colors">
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 animate-in slide-in-from-top-2 fade-in duration-200">
          {children}
          <p className="mt-3 text-[10px] text-muted-foreground font-medium">
            Total: ₹{new Intl.NumberFormat("en-IN").format(total)}
            {total > 0 && <span className="ml-1 text-accent">(auto-summed)</span>}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main form ────────────────────────────────────────────────────────────────

export function FinancialForm({ data, onSave, startCollapsed = false }: FinancialFormProps) {
  const [form, setForm] = useState<FinancialData>(data);

  const updateField = (section: string, field: string, raw: string) => {
    const num = parseRaw(raw);
    if (section === "root") {
      setForm((prev) => ({ ...prev, [field]: num }));
    } else {
      setForm((prev) => ({
        ...prev,
        [section]: { ...(prev as Record<string, unknown>)[section] as object, [field]: num },
      }));
    }
  };

  // When the user types a total in collapsed mode, distribute across sub-fields.
  const handleExpenseTotalChange = (raw: string) => {
    const total = parseRaw(raw);
    const allZero = Object.values(form.expenses).every((v) => v === 0);
    if (allZero) {
      setForm((prev) => ({ ...prev, expenses: distributeExpenses(total, "metro") }));
    } else {
      // Only update "other" as residual
      const sumExcluding = Object.entries(form.expenses)
        .filter(([k]) => k !== "other")
        .reduce((s, [, v]) => s + v, 0);
      setForm((prev) => ({
        ...prev,
        expenses: { ...prev.expenses, other: Math.max(0, total - sumExcluding) },
      }));
    }
  };

  const totalExpenses = Object.values(form.expenses).reduce((s, v) => s + v, 0);
  const totalAssets = Object.values(form.assets).reduce((s, v) => s + v, 0);
  const totalLiabilities = Object.values(form.liabilities).reduce((s, v) => s + v, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const isFormEmpty =
    form.monthlyIncome === 0 &&
    totalExpenses === 0 &&
    totalAssets === 0 &&
    totalLiabilities === 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Income — always open, single field */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">💰 Monthly Income</h3>
        <Field
          label="Total Monthly Income (per month)"
          value={form.monthlyIncome}
          onChange={(raw) => updateField("root", "monthlyIncome", raw)}
        />
      </div>

      {/* Expenses */}
      <CollapsibleMoneySection
        title="Monthly Expenses"
        emoji="🧾"
        total={totalExpenses}
        startOpen={!startCollapsed}
        onDistribute={handleExpenseTotalChange}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.expenses).map(([key, val]) => (
            <Field
              key={key}
              label={titleCase(key)}
              suffix="(per month)"
              value={val}
              onChange={(raw) => updateField("expenses", key, raw)}
            />
          ))}
        </div>
      </CollapsibleMoneySection>

      {/* Assets */}
      <CollapsibleMoneySection
        title="Assets"
        emoji="📈"
        total={totalAssets}
        startOpen={!startCollapsed}
      >
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.assets).map(([key, val]) => (
            <Field
              key={key}
              label={titleCase(key)}
              value={val}
              onChange={(raw) => updateField("assets", key, raw)}
            />
          ))}
        </div>
      </CollapsibleMoneySection>

      {/* Liabilities */}
      <CollapsibleMoneySection
        title="Liabilities"
        emoji="💳"
        total={totalLiabilities}
        startOpen={!startCollapsed}
      >
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(form.liabilities).map(([key, val]) => (
            <Field
              key={key}
              label={titleCase(key)}
              suffix={key !== "creditCardDebt" ? "(outstanding)" : ""}
              value={val}
              onChange={(raw) => updateField("liabilities", key, raw)}
            />
          ))}
        </div>
      </CollapsibleMoneySection>

      {/* Risk Appetite */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">🎯 Risk Appetite</h3>
        <div className="flex gap-3">
          {(["low", "medium", "high"] as RiskAppetite[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, riskAppetite: level }))}
              className={`flex-1 capitalize text-sm font-bold py-3 px-4 rounded-lg border-2 border-foreground transition-all ${
                form.riskAppetite === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
              style={{
                boxShadow:
                  form.riskAppetite === level
                    ? "2px 2px 0px 0px hsl(var(--foreground))"
                    : "3px 3px 0px 0px hsl(var(--foreground))",
              }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={isFormEmpty}
          className={`w-full text-base py-4 ${
            isFormEmpty ? "nb-button opacity-50 cursor-not-allowed" : "nb-button-primary"
          }`}
        >
          {isFormEmpty ? "Enter Some Data to Continue" : "Show My Financial Insights →"}
        </button>
        {isFormEmpty && (
          <p className="text-center text-xs font-bold text-muted-foreground animate-pulse">
            * Please enter at least one financial record to continue
          </p>
        )}
      </div>
    </form>
  );
}
