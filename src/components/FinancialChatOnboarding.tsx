import { useState, useEffect, useRef, useCallback, type ChangeEvent } from "react";
import { Compass, ChevronRight, Check, ArrowLeft, Plus, X } from "lucide-react";
import type { AgeRange, FinancialData, RiskAppetite } from "@/types/finance";
import {
  type CityTier,
  type HousingSituation,
  distributeExpenses,
  DEFAULT_EXPENSE_RATIO,
  INCOME_RANGES,
} from "@/lib/onboarding-defaults";
import { emptyFinancialData } from "@/lib/financial-engine";

interface Props {
  onDone: (data: FinancialData) => void;
}

type Step =
  | "income"
  | "city"
  | "housing"
  | "totalExpenses"
  | "expenseBreakdown"
  | "savings"
  | "investments"
  | "debts"
  | "risk"
  | "ageRange"
  | "done";

interface ChatEntry {
  role: "bot" | "user";
  text: string;
}

// ─── localStorage draft ───────────────────────────────────────────────────────

const STORAGE_KEY = "wealthpilot_onboarding_draft";

interface OnboardingDraft {
  step: Step;
  history: ChatEntry[];
  cityTier: CityTier;
  housingSituation: HousingSituation;
  form: FinancialData;
}

function loadDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OnboardingDraft) : null;
  } catch {
    return null;
  }
}

function saveDraft(state: OnboardingDraft) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_LABELS: Record<string, string> = {
  housing: "Housing / Rent",
  food: "Food & Groceries",
  transportation: "Transportation",
  utilities: "Utilities",
  insurance: "Insurance",
  entertainment: "Entertainment",
  healthcare: "Healthcare",
  education: "Education",
  other: "Other",
};

const INVESTMENT_OPTIONS = [
  { id: "mutualFunds", label: "Mutual Funds / SIP" },
  { id: "stocks", label: "Stocks" },
  { id: "gold", label: "Gold" },
  { id: "realEstate", label: "Real Estate" },
];

const LIABILITY_OPTIONS = [
  { id: "homeLoan", label: "Home Loan EMI" },
  { id: "personalLoan", label: "Personal / Car Loan EMI" },
  { id: "creditCardDebt", label: "Credit Card Debt" },
];

const AGE_RANGE_OPTIONS: { value: AgeRange; label: string; emoji: string }[] = [
  { value: "under_20", label: "< 20", emoji: "🌱" },
  { value: "20_25", label: "20 - 25", emoji: "🚀" },
  { value: "26_30", label: "26 - 30", emoji: "📈" },
  { value: "31_35", label: "31 - 35", emoji: "⚖️" },
  { value: "36_40", label: "36 - 40", emoji: "🧭" },
  { value: "41_45", label: "41 - 45", emoji: "🏔️" },
  { value: "46_50", label: "46 - 50", emoji: "🎯" },
  { value: "51_55", label: "51 - 55", emoji: "🌅" },
  { value: "56_60", label: "56 - 60", emoji: "🛡️" },
  { value: "above_60", label: "> 60", emoji: "🌟" },
];

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatINR(val: number): string {
  if (!val) return "";
  return new Intl.NumberFormat("en-IN").format(val);
}

function parseINR(raw: string): number {
  return parseFloat(raw.replace(/,/g, "")) || 0;
}

function shortLabel(n: number): string {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(0)}k`;
  return `₹${n}`;
}

// ─── Number-to-words (Indian system) ─────────────────────────────────────────

const _ones = [
  "", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine",
  "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen",
  "seventeen", "eighteen", "nineteen",
];
const _tens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function _twoDigit(n: number): string {
  if (n < 20) return _ones[n];
  return _tens[Math.floor(n / 10)] + (n % 10 ? " " + _ones[n % 10] : "");
}

function _threeDigit(n: number): string {
  if (n < 100) return _twoDigit(n);
  return _ones[Math.floor(n / 100)] + " hundred" + (n % 100 ? " " + _twoDigit(n % 100) : "");
}

function toWordsINR(n: number): string {
  if (!n || n <= 0) return "";
  let rem = n;
  const parts: string[] = [];
  const crore = Math.floor(rem / 10_000_000);
  rem %= 10_000_000;
  const lakh = Math.floor(rem / 100_000);
  rem %= 100_000;
  const thousand = Math.floor(rem / 1_000);
  rem %= 1_000;
  if (crore) parts.push(_twoDigit(crore) + " crore");
  if (lakh) parts.push(_twoDigit(lakh) + " lakh");
  if (thousand) parts.push(_twoDigit(thousand) + " thousand");
  if (rem) parts.push(_threeDigit(rem));
  const words = parts.join(" ");
  return words.charAt(0).toUpperCase() + words.slice(1) + " rupees";
}

// ─── Small reusable pieces ────────────────────────────────────────────────────

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
      <div
        className="shrink-0 w-8 h-8 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
        style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
      >
        <Compass className="w-4 h-4 text-primary-foreground" />
      </div>
      <div
        className="nb-card py-3 px-4 max-w-[85%] text-base font-medium leading-relaxed"
        style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
      >
        {text}
      </div>
    </div>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <div className="flex justify-end animate-in slide-in-from-right-4 fade-in duration-200">
      <div
        className="rounded-lg py-3 px-4 max-w-[80%] text-sm font-bold bg-primary text-primary-foreground border-2 border-foreground"
        style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
      >
        {text}
      </div>
    </div>
  );
}

function Chip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-4 py-2 rounded-lg border-2 border-foreground text-sm font-bold transition-all duration-150 ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground hover:bg-muted"
      }`}
      style={{
        boxShadow: selected
          ? "1px 1px 0px 0px hsl(var(--foreground))"
          : "3px 3px 0px 0px hsl(var(--foreground))",
      }}
    >
      {label}
    </button>
  );
}

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  small,
}: {
  label?: string;
  value: number;
  onChange: (n: number) => void;
  placeholder?: string;
  small?: boolean;
}) {
  const [raw, setRaw] = useState(value ? formatINR(value) : "");

  useEffect(() => {
    setRaw(value ? formatINR(value) : "");
  }, [value]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/,/g, "");
    if (stripped === "" || /^\d+$/.test(stripped)) {
      setRaw(e.target.value);
      onChange(parseINR(stripped));
    }
  };

  const words = !small ? toWordsINR(value) : "";

  return (
    <div className={small ? "" : "space-y-1"}>
      {label && (
        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </label>
      )}
      <input
        type="text"
        inputMode="numeric"
        className={`nb-input w-full ${small ? "py-2 text-sm" : "text-base"}`}
        value={raw}
        onChange={handleChange}
        placeholder={placeholder ?? "₹ 0"}
      />
      {words && (
        <p className="text-xs text-muted-foreground font-medium italic mt-1 animate-in fade-in duration-200">
          {words}
        </p>
      )}
    </div>
  );
}

// ─── Step: Income ─────────────────────────────────────────────────────────────

function StepIncome({ onSelect }: { onSelect: (val: number, label: string) => void }) {
  const [custom, setCustom] = useState(0);
  const [useCustom, setUseCustom] = useState(false);

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {INCOME_RANGES.map((r) => (
          <Chip key={r.label} label={r.label} onClick={() => onSelect(r.midpoint, r.label)} />
        ))}
        <Chip label="Enter exact" selected={useCustom} onClick={() => setUseCustom(true)} />
      </div>
      {useCustom && (
        <div className="flex gap-2 items-end animate-in slide-in-from-top-2 fade-in">
          <div className="flex-1">
            <NumberInput value={custom} onChange={setCustom} placeholder="₹ Enter take-home" />
          </div>
          <button
            type="button"
            disabled={custom === 0}
            onClick={() => onSelect(custom, shortLabel(custom))}
            className="nb-button-primary px-5 py-3 disabled:opacity-40"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Step: City ───────────────────────────────────────────────────────────────

function StepCity({ onSelect }: { onSelect: (tier: CityTier, label: string) => void }) {
  const opts: { tier: CityTier; label: string; sub: string }[] = [
    { tier: "metro", label: "Metro", sub: "Mumbai, Delhi, Bengaluru, Chennai…" },
    { tier: "tier1", label: "Tier 1", sub: "Pune, Hyderabad, Ahmedabad…" },
    { tier: "tier2", label: "Tier 2 / 3", sub: "Smaller cities & towns" },
  ];
  return (
    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {opts.map((o) => (
        <button
          key={o.tier}
          type="button"
          onClick={() => onSelect(o.tier, o.label)}
          className="nb-card py-3 px-4 text-left hover:bg-muted transition-colors"
          style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
        >
          <span className="font-bold text-sm">{o.label}</span>
          <span className="text-muted-foreground text-xs ml-2">{o.sub}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Step: Housing ────────────────────────────────────────────────────────────

function StepHousing({ onSelect }: { onSelect: (sit: HousingSituation, label: string) => void }) {
  const opts: { sit: HousingSituation; label: string; emoji: string }[] = [
    { sit: "rent", label: "I pay rent", emoji: "🏠" },
    { sit: "emi", label: "Own home with EMI", emoji: "🏦" },
    { sit: "own", label: "Own home, no EMI", emoji: "✅" },
    { sit: "family", label: "Live with family", emoji: "👨‍👩‍👧" },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {opts.map((o) => (
        <button
          key={o.sit}
          type="button"
          onClick={() => onSelect(o.sit, `${o.emoji} ${o.label}`)}
          className="nb-card py-4 px-3 text-center hover:bg-muted transition-colors"
          style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
        >
          <div className="text-xl mb-1">{o.emoji}</div>
          <div className="font-bold text-xs leading-tight">{o.label}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Step: Total expenses ─────────────────────────────────────────────────────

function StepTotalExpenses({
  defaultValue,
  onNext,
}: {
  defaultValue: number;
  onNext: (val: number) => void;
}) {
  const [val, setVal] = useState(defaultValue);
  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <p className="text-xs text-muted-foreground font-medium">
        We've pre-filled a typical estimate based on your income and city. Adjust freely.
      </p>
      <NumberInput value={val} onChange={setVal} placeholder="₹ Monthly expenses" />
      <button
        type="button"
        disabled={val === 0}
        onClick={() => onNext(val)}
        className="nb-button-primary w-full py-3 disabled:opacity-40"
      >
        Confirm → Break it down
      </button>
    </div>
  );
}

// ─── Step: Expense breakdown ──────────────────────────────────────────────────

function StepExpenseBreakdown({
  expenses: initialExpenses,
  total,
  onNext,
  onEditTotal,
}: {
  expenses: Record<string, number>;
  total: number;
  onNext: (expenses: Record<string, number>) => void;
  onEditTotal: () => void;
}) {
  const [expenses, setExpenses] = useState({ ...initialExpenses });

  const handleChange = (key: string, val: number) => {
    setExpenses((prev) => {
      const next = { ...prev, [key]: val };
      const sumExcludingOther = Object.entries(next)
        .filter(([k]) => k !== "other")
        .reduce((s, [, v]) => s + v, 0);
      next.other = Math.max(0, total - sumExcludingOther);
      return next;
    });
  };

  const currentSum = Object.values(expenses).reduce((s, v) => s + v, 0);
  const diff = currentSum - total;
  const balanced = Math.abs(diff) < 2;

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {/* Allocation summary + back link */}
      <div className="flex justify-between items-center">
        <button
          type="button"
          onClick={onEditTotal}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors"
        >
          <ArrowLeft className="w-3 h-3" /> Edit total ({shortLabel(total)})
        </button>
        <span className={`text-xs font-bold ${balanced ? "text-accent" : "text-destructive"}`}>
          {shortLabel(currentSum)} / {shortLabel(total)}
          {!balanced && (diff > 0 ? ` (+${shortLabel(diff)})` : ` (${shortLabel(-diff)} left)`)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2">
        {Object.entries(expenses).map(([key, val]) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-xs font-bold w-32 shrink-0 text-muted-foreground">
              {EXPENSE_LABELS[key] ?? key}
            </label>
            {key === "other" ? (
              <div className="flex-1 nb-input py-2 text-sm text-muted-foreground bg-muted/40">
                {shortLabel(val)} <span className="text-[10px]">(auto)</span>
              </div>
            ) : (
              <div className="flex-1">
                <NumberInput small value={val} onChange={(n) => handleChange(key, n)} />
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onNext(expenses)}
        className="nb-button-primary w-full py-3"
      >
        {balanced ? "Looks good →" : "Continue anyway →"}
      </button>
    </div>
  );
}

// ─── Step: Savings ────────────────────────────────────────────────────────────

function StepSavings({ onNext }: { onNext: (val: number) => void }) {
  const [val, setVal] = useState(0);
  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <NumberInput value={val} onChange={setVal} placeholder="₹ Bank balance / savings" />
      <button
        type="button"
        disabled={val === 0}
        onClick={() => onNext(val)}
        className="nb-button-primary w-full py-3 disabled:opacity-40"
      >
        Next →
      </button>
      <button
        type="button"
        onClick={() => onNext(0)}
        className="w-full text-xs text-muted-foreground underline"
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Custom add-more row (shared) ─────────────────────────────────────────────

interface CustomItem {
  id: string;
  label: string;
  amount: number;
}

function CustomItemRow({
  item,
  onLabelChange,
  onAmountChange,
  onRemove,
}: {
  item: CustomItem;
  onLabelChange: (label: string) => void;
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
}) {
  const [raw, setRaw] = useState(item.amount ? formatINR(item.amount) : "");

  const handleAmountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const stripped = e.target.value.replace(/,/g, "");
    if (stripped === "" || /^\d+$/.test(stripped)) {
      setRaw(e.target.value);
      onAmountChange(parseINR(stripped));
    }
  };

  const words = toWordsINR(item.amount);

  return (
    <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-200">
      <div className="flex items-center gap-2">
        <input
          type="text"
          className="nb-input flex-1 py-2 text-sm"
          placeholder="Label (e.g. PPF, FD…)"
          value={item.label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className="nb-input w-32 py-2 text-sm"
          placeholder="₹ Amount"
          value={raw}
          onChange={handleAmountChange}
        />
        <button
          type="button"
          onClick={onRemove}
          className="shrink-0 p-2 rounded-lg border-2 border-foreground/30 hover:border-foreground hover:bg-destructive/10 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      {words && (
        <p className="text-xs text-muted-foreground font-medium italic pl-1">{words}</p>
      )}
    </div>
  );
}

// ─── Step: Investments ────────────────────────────────────────────────────────

function StepInvestments({
  onNext,
}: {
  onNext: (assets: Partial<Record<string, number>>, customTotal: number) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);

  const toggle = (id: string) => {
    if (id === "none") {
      setSelected([]);
      setValues({});
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addCustomItem = () => {
    setCustomItems((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "", amount: 0 },
    ]);
  };

  const updateCustom = (id: string, field: "label" | "amount", val: string | number) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const removeCustom = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const customTotal = customItems.reduce((s, i) => s + i.amount, 0);

  const handleSubmit = () => {
    const assets: Record<string, number> = {};
    for (const id of selected) {
      assets[id] = values[id] ?? 0;
    }
    onNext(assets, customTotal);
  };

  const hasAny = selected.length > 0 || customItems.length > 0;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {INVESTMENT_OPTIONS.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            selected={selected.includes(o.id)}
            onClick={() => toggle(o.id)}
          />
        ))}
        <Chip label="None" selected={!hasAny} onClick={() => { toggle("none"); setCustomItems([]); }} />
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Current value
          </p>
          {INVESTMENT_OPTIONS.filter((o) => selected.includes(o.id)).map((o) => (
            <NumberInput
              key={o.id}
              label={o.label}
              value={values[o.id] ?? 0}
              onChange={(n) => setValues((prev) => ({ ...prev, [o.id]: n }))}
            />
          ))}
        </div>
      )}

      {/* Custom other investments */}
      {customItems.length > 0 && (
        <div className="space-y-2 animate-in fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Other investments
          </p>
          {customItems.map((item) => (
            <CustomItemRow
              key={item.id}
              item={item}
              onLabelChange={(l) => updateCustom(item.id, "label", l)}
              onAmountChange={(a) => updateCustom(item.id, "amount", a)}
              onRemove={() => removeCustom(item.id)}
            />
          ))}
          {customTotal > 0 && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Total other: {shortLabel(customTotal)} — will show as additional savings in review
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={addCustomItem}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add more (PPF, FD, NPS, Bonds…)
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        className="nb-button-primary w-full py-3"
      >
        {!hasAny ? "No investments →" : "Confirm →"}
      </button>
    </div>
  );
}

// ─── Step: Debts ──────────────────────────────────────────────────────────────

function StepDebts({
  onNext,
}: {
  onNext: (liabilities: Partial<Record<string, number>>) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);

  const toggle = (id: string) => {
    if (id === "none") {
      setSelected([]);
      setValues({});
      return;
    }
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const addCustomItem = () => {
    setCustomItems((prev) => [
      ...prev,
      { id: `custom_${Date.now()}`, label: "", amount: 0 },
    ]);
  };

  const updateCustom = (id: string, field: "label" | "amount", val: string | number) => {
    setCustomItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: val } : item))
    );
  };

  const removeCustom = (id: string) => {
    setCustomItems((prev) => prev.filter((item) => item.id !== id));
  };

  const customOthersTotal = customItems.reduce((s, i) => s + i.amount, 0);
  const hasAny = selected.length > 0 || customItems.length > 0;

  const handleSubmit = () => {
    const liabilities: Record<string, number> = {};
    for (const id of selected) {
      liabilities[id] = values[id] ?? 0;
    }
    // Merge custom items into 'others'
    liabilities.others = (liabilities.others ?? 0) + customOthersTotal;
    onNext(liabilities);
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex flex-wrap gap-2">
        {LIABILITY_OPTIONS.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            selected={selected.includes(o.id)}
            onClick={() => toggle(o.id)}
          />
        ))}
        <Chip
          label="No loans"
          selected={!hasAny}
          onClick={() => { toggle("none"); setCustomItems([]); }}
        />
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Outstanding balance (total owed, not monthly EMI)
          </p>
          {LIABILITY_OPTIONS.filter((o) => selected.includes(o.id)).map((o) => (
            <NumberInput
              key={o.id}
              label={o.label}
              value={values[o.id] ?? 0}
              onChange={(n) => setValues((prev) => ({ ...prev, [o.id]: n }))}
            />
          ))}
        </div>
      )}

      {/* Custom other loans */}
      {customItems.length > 0 && (
        <div className="space-y-2 animate-in fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Other loans
          </p>
          {customItems.map((item) => (
            <CustomItemRow
              key={item.id}
              item={item}
              onLabelChange={(l) => updateCustom(item.id, "label", l)}
              onAmountChange={(a) => updateCustom(item.id, "amount", a)}
              onRemove={() => removeCustom(item.id)}
            />
          ))}
          {customOthersTotal > 0 && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Total: {shortLabel(customOthersTotal)} — added to "other loans"
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={addCustomItem}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add more (vehicle loan, education loan…)
      </button>

      <button
        type="button"
        onClick={handleSubmit}
        className="nb-button-primary w-full py-3"
      >
        {!hasAny ? "Debt-free! →" : "Confirm →"}
      </button>
    </div>
  );
}

// ─── Step: Risk ───────────────────────────────────────────────────────────────

function StepRisk({ onSelect }: { onSelect: (r: RiskAppetite) => void }) {
  const opts: { value: RiskAppetite; label: string; desc: string; emoji: string }[] = [
    { value: "low", label: "Low", desc: "Safety first — FDs, debt funds, stability", emoji: "🛡️" },
    { value: "medium", label: "Medium", desc: "Balanced — mix of equity and debt", emoji: "⚖️" },
    { value: "high", label: "High", desc: "Growth focused — equity, stocks, crypto", emoji: "🚀" },
  ];
  return (
    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className="nb-card py-4 px-4 text-left hover:bg-muted transition-colors flex items-center gap-4"
          style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
        >
          <span className="text-2xl">{o.emoji}</span>
          <div>
            <div className="font-bold text-sm capitalize">{o.label} Risk</div>
            <div className="text-xs text-muted-foreground">{o.desc}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

function StepAgeRange({
  onSelect,
  onSkip,
}: {
  onSelect: (range: AgeRange) => void;
  onSkip: () => void;
}) {
  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="grid grid-cols-2 gap-2">
        {AGE_RANGE_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => onSelect(o.value)}
            className="nb-card py-3 px-3 text-left hover:bg-muted transition-colors flex items-center gap-2"
            style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
          >
            <span>{o.emoji}</span>
            <span className="text-xs font-bold">{o.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="w-full text-xs font-bold text-muted-foreground hover:text-foreground underline"
      >
        Skip for now
      </button>
    </div>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────

const STEPS_ORDER: Step[] = [
  "income", "city", "housing", "totalExpenses", "expenseBreakdown",
  "savings", "investments", "debts", "risk", "ageRange",
];

function ProgressBar({ step }: { step: Step }) {
  const idx = STEPS_ORDER.indexOf(step);
  const total = STEPS_ORDER.length;
  const pct = idx < 0 ? 100 : Math.round(((idx + 1) / total) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
        <span>Quick Setup</span>
        <span>{idx < 0 ? total : idx + 1} / {total}</span>
      </div>
      <div className="h-2 rounded-full bg-muted border border-foreground/20 overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancialChatOnboarding({ onDone }: Props) {
  // Restore from draft if available
  const savedDraft = loadDraft();
  const isResume = savedDraft !== null && savedDraft.step !== "income";

  const [step, setStep] = useState<Step>(savedDraft?.step ?? "income");
  const [history, setHistory] = useState<ChatEntry[]>(savedDraft?.history ?? []);
  const [cityTier, setCityTier] = useState<CityTier>(savedDraft?.cityTier ?? "metro");
  const [housingSituation, setHousingSituation] = useState<HousingSituation>(
    savedDraft?.housingSituation ?? "rent"
  );
  const [form, setForm] = useState<FinancialData>(savedDraft?.form ?? { ...emptyFinancialData });
  const [showResumeBanner, setShowResumeBanner] = useState(isResume);

  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
  };

  // Persist draft on every meaningful change
  const persistDraft = useCallback(() => {
    if (step === "done") return;
    saveDraft({ step, history, cityTier, housingSituation, form });
  }, [step, history, cityTier, housingSituation, form]);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  const pushHistory = (entries: ChatEntry[]) => {
    setHistory((prev) => [...prev, ...entries]);
    scrollToBottom();
  };

  const BOT_QUESTIONS: Record<Step, string> = {
    income: "Hey Pilot! 👋 Let's map your financial coordinates. What's your monthly take-home income?",
    city: "Great! Which city tier do you live in? This helps me estimate typical expense ratios.",
    housing: "How's your housing situation?",
    totalExpenses: "Based on your income and city, here's an estimated monthly expense total. How close is this?",
    expenseBreakdown:
      "Here's how I've broken down those expenses. Adjust any category freely — 'Other' will auto-balance.",
    savings: "Nice! How much do you have in your bank account / liquid savings right now?",
    investments: "Do you have any investments? Select all that apply.",
    debts: "Any outstanding loans or debt? Select all that apply.",
    risk: "Almost there! What's your risk appetite for investments?",
    ageRange:
      "Optional: Which age range are you in? I use the median age of the range to estimate FI timeline (retirement age 60).",
    done: "",
  };

  // Push the first bot message only on a fresh (non-resumed) mount
  useEffect(() => {
    if (!savedDraft) {
      pushHistory([{ role: "bot", text: BOT_QUESTIONS.income }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = (nextStep: Step, userText: string, botText?: string) => {
    const entries: ChatEntry[] = [{ role: "user", text: userText }];
    if (botText) entries.push({ role: "bot", text: botText });
    pushHistory(entries);
    setStep(nextStep);
  };

  // ── Step handlers ──────────────────────────────────────────────────────────

  const handleIncome = (val: number, label: string) => {
    setForm((prev) => ({ ...prev, monthlyIncome: val }));
    advance("city", label, BOT_QUESTIONS.city);
  };

  const handleCity = (tier: CityTier, label: string) => {
    setCityTier(tier);
    advance("housing", label, BOT_QUESTIONS.housing);
  };

  const handleHousing = (sit: HousingSituation, label: string) => {
    setHousingSituation(sit);
    const defaultTotal =
      Math.round((form.monthlyIncome * DEFAULT_EXPENSE_RATIO[cityTier]) / 1000) * 1000;
    const distributedExpenses = distributeExpenses(defaultTotal, cityTier, sit);
    setForm((prev) => ({ ...prev, expenses: distributedExpenses }));
    advance("totalExpenses", label, BOT_QUESTIONS.totalExpenses);
  };

  const handleTotalExpenses = (total: number) => {
    const distributedExpenses = distributeExpenses(total, cityTier, housingSituation);
    setForm((prev) => ({ ...prev, expenses: distributedExpenses }));
    advance("expenseBreakdown", shortLabel(total) + "/month", BOT_QUESTIONS.expenseBreakdown);
  };

  // Go back from expense breakdown → total expenses (pop last 2 history entries)
  const handleEditTotal = () => {
    setHistory((prev) => prev.slice(0, -2));
    setStep("totalExpenses");
  };

  const handleExpenseBreakdown = (expenses: Record<string, number>) => {
    setForm((prev) => ({
      ...prev,
      expenses: expenses as unknown as typeof prev.expenses,
    }));
    advance("savings", "Breakdown confirmed ✓", BOT_QUESTIONS.savings);
  };

  const handleSavings = (val: number) => {
    setForm((prev) => ({
      ...prev,
      assets: { ...prev.assets, bankBalance: val },
    }));
    advance(
      "investments",
      val > 0 ? shortLabel(val) : "Will add later",
      BOT_QUESTIONS.investments
    );
  };

  const handleInvestments = (
    assets: Partial<Record<string, number>>,
    customTotal: number
  ) => {
    setForm((prev) => ({
      ...prev,
      assets: {
        ...prev.assets,
        // Add custom investments to bankBalance (catch-all for non-standard items)
        bankBalance: prev.assets.bankBalance + customTotal,
        mutualFunds: assets.mutualFunds ?? 0,
        stocks: assets.stocks ?? 0,
        gold: assets.gold ?? 0,
        realEstate: assets.realEstate ?? 0,
      },
    }));
    const standardLabels = Object.keys(assets)
      .map((k) => INVESTMENT_OPTIONS.find((o) => o.id === k)?.label)
      .filter(Boolean);
    const parts = [...standardLabels];
    if (customTotal > 0) parts.push(`Other ${shortLabel(customTotal)}`);
    advance(
      "debts",
      parts.length > 0 ? parts.join(", ") : "No investments",
      BOT_QUESTIONS.debts
    );
  };

  const handleDebts = (liabilities: Partial<Record<string, number>>) => {
    setForm((prev) => ({
      ...prev,
      liabilities: {
        homeLoan: liabilities.homeLoan ?? 0,
        personalLoan: liabilities.personalLoan ?? 0,
        creditCardDebt: liabilities.creditCardDebt ?? 0,
        others: liabilities.others ?? 0,
      },
    }));
    const label =
      Object.keys(liabilities).length > 0
        ? Object.keys(liabilities)
            .map((k) => LIABILITY_OPTIONS.find((o) => o.id === k)?.label ?? "Other loans")
            .filter(Boolean)
            .join(", ")
        : "Debt-free 🎉";
    advance("risk", label, BOT_QUESTIONS.risk);
  };

  const handleRisk = (r: RiskAppetite) => {
    const updatedForm = { ...form, riskAppetite: r };
    setForm(updatedForm);
    const riskLabels: Record<RiskAppetite, string> = {
      low: "🛡️ Low risk",
      medium: "⚖️ Medium risk",
      high: "🚀 High risk",
    };
    advance("ageRange", riskLabels[r], BOT_QUESTIONS.ageRange);
  };

  const finalizeOnboarding = (finalForm: FinancialData, userText: string) => {
    pushHistory([
      { role: "user", text: userText },
      {
        role: "bot",
        text: "All systems go! Here's a summary of your data. Review it, then launch your financial insights 🚀",
      },
    ]);
    setStep("done");
    clearDraft();
    setTimeout(() => onDone(finalForm), 300);
  };

  const handleAgeRange = (range: AgeRange) => {
    const finalForm = { ...form, ageRange: range };
    setForm(finalForm);
    const label = AGE_RANGE_OPTIONS.find((opt) => opt.value === range)?.label ?? range;
    finalizeOnboarding(finalForm, label);
  };

  const handleSkipAgeRange = () => {
    const finalForm = { ...form, ageRange: undefined };
    setForm(finalForm);
    finalizeOnboarding(finalForm, "Skipped");
  };

  // ── Render current input ───────────────────────────────────────────────────

  const renderInput = () => {
    switch (step) {
      case "income":
        return <StepIncome onSelect={handleIncome} />;
      case "city":
        return <StepCity onSelect={handleCity} />;
      case "housing":
        return <StepHousing onSelect={handleHousing} />;
      case "totalExpenses":
        return (
          <StepTotalExpenses
            defaultValue={
              Math.round(
                (form.monthlyIncome * DEFAULT_EXPENSE_RATIO[cityTier]) / 1000
              ) * 1000
            }
            onNext={handleTotalExpenses}
          />
        );
      case "expenseBreakdown":
        return (
          <StepExpenseBreakdown
            expenses={form.expenses as unknown as Record<string, number>}
            total={Object.values(form.expenses).reduce((s, v) => s + v, 0)}
            onNext={handleExpenseBreakdown}
            onEditTotal={handleEditTotal}
          />
        );
      case "savings":
        return <StepSavings onNext={handleSavings} />;
      case "investments":
        return <StepInvestments onNext={handleInvestments} />;
      case "debts":
        return <StepDebts onNext={handleDebts} />;
      case "risk":
        return <StepRisk onSelect={handleRisk} />;
      case "ageRange":
        return <StepAgeRange onSelect={handleAgeRange} onSkip={handleSkipAgeRange} />;
      case "done":
        return (
          <div className="flex items-center gap-2 text-accent text-sm font-bold animate-in fade-in">
            <Check className="w-4 h-4" /> Building your dashboard…
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto space-y-4">
      {/* Resume banner */}
      {showResumeBanner && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 border-accent/50 bg-accent/10 animate-in slide-in-from-top-2 fade-in">
          <p className="text-xs font-bold text-accent">
            ✨ Resuming where you left off
          </p>
          <button
            type="button"
            onClick={() => {
              clearDraft();
              setShowResumeBanner(false);
              setStep("income");
              setHistory([{ role: "bot", text: BOT_QUESTIONS.income }]);
              setCityTier("metro");
              setHousingSituation("rent");
              setForm({ ...emptyFinancialData });
            }}
            className="text-[10px] font-bold text-muted-foreground underline hover:text-foreground"
          >
            Start over
          </button>
        </div>
      )}

      <ProgressBar step={step} />

      {/* Chat history */}
      <div className="space-y-3 min-h-[80px]">
        {history.map((entry, i) =>
          entry.role === "bot" ? (
            <BotBubble key={i} text={entry.text} />
          ) : (
            <UserBubble key={i} text={entry.text} />
          )
        )}
        <div ref={bottomRef} />
      </div>

      {/* Current input area */}
      <div className="nb-card" style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}>
        {renderInput()}
      </div>
    </div>
  );
}
