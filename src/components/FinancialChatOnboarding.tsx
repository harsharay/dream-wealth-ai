import { useState, useEffect, useRef, useCallback, type ChangeEvent, type ReactNode } from "react";
import {
  Compass,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Check,
  ArrowLeft,
  Plus,
  X,
  Maximize2,
  Pencil,
} from "lucide-react";
import type { AgeRange, FinancialData, RiskAppetite } from "@/types/finance";
import { useAuth } from "@/contexts/AuthContext";
import {
  type CityTier,
  type HousingSituation,
  distributeExpenses,
  estimateMonthlyLivingExpenses,
} from "@/lib/onboarding-defaults";
import { emptyFinancialData } from "@/lib/financial-engine";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toWordsINR } from "@/lib/inr-words";

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

/** Steps the user can jump back to via Edit on a past answer. */
type AnswerableStep = Exclude<Step, "done">;

interface ChatEntry {
  role: "bot" | "user";
  text: string;
  /** On user messages: which question this answer belongs to (enables Edit). */
  answeredStep?: AnswerableStep;
}

// ─── localStorage draft ───────────────────────────────────────────────────────

const STORAGE_KEY = "wealthpilot_onboarding_draft";

interface OnboardingDraft {
  step: Step;
  history: ChatEntry[];
  cityTier: CityTier;
  housingSituation: HousingSituation;
  form: FinancialData;
  /** Liquid cash from savings step (before custom investments are stored as customAssets). */
  liquidCash?: number;
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

function housingExpenseLabel(situation: HousingSituation): string {
  switch (situation) {
    case "rent":
      return "Housing / Rent";
    case "emi":
      return "Housing / Maintenance";
    case "own":
      return "Housing / Maintenance";
    case "family":
      return "Housing / Contribution";
  }
}

const INVESTMENT_OPTIONS = [
  { id: "mutualFunds", label: "Mutual Funds" },
  { id: "stocks", label: "Stocks" },
  { id: "gold", label: "Gold" },
  { id: "realEstate", label: "Real Estate" },
];

const LIABILITY_OPTIONS = [
  { id: "homeLoan", label: "Home Loan EMI" },
  { id: "personalLoan", label: "Personal / Car Loan EMI" },
  { id: "creditCardDebt", label: "Credit Card Debt" },
];

const AGE_RANGE_OPTIONS: { value: AgeRange; label: string }[] = [
  { value: "under_20", label: "< 20" },
  { value: "20_25", label: "20 - 25" },
  { value: "26_30", label: "26 - 30" },
  { value: "31_35", label: "31 - 35" },
  { value: "36_40", label: "36 - 40" },
  { value: "41_45", label: "41 - 45" },
  { value: "46_50", label: "46 - 50" },
  { value: "51_55", label: "51 - 55" },
  { value: "56_60", label: "56 - 60" },
  { value: "above_60", label: "> 60" },
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

// ─── Small reusable pieces ────────────────────────────────────────────────────

function BotBubble({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 animate-in slide-in-from-left-4 fade-in duration-300">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-primary border border-foreground/20 flex items-center justify-center">
        <Compass className="w-4 h-4 text-primary-foreground" />
      </div>
      <div className="py-3 px-4 max-w-[85%] text-base font-medium leading-relaxed rounded-2xl rounded-tl-md bg-muted/50 border border-foreground/15 text-foreground">
        {text}
      </div>
    </div>
  );
}

function UserBubble({
  text,
  onEdit,
}: {
  text: string;
  onEdit?: () => void;
}) {
  return (
    <div className="flex justify-end items-end gap-1.5 animate-in slide-in-from-right-4 fade-in duration-200">
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          title="Edit this answer"
          aria-label="Edit this answer"
          className="shrink-0 mb-0.5 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors border-0"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <div className="py-2.5 px-4 max-w-[80%] text-sm font-medium leading-relaxed rounded-2xl rounded-tr-md bg-primary/15 text-foreground">
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
      className={`max-w-full px-3 sm:px-4 py-2 rounded-lg border-2 border-foreground text-sm font-bold transition-all duration-150 ${
        selected
          ? "bg-primary text-primary-foreground"
          : "bg-card text-foreground "
      } hover:-translate-y-0.5 transition-transform duration-300 ease-out cursor-pointer`}
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

const INCOME_SLIDER_MIN = 15_000;
const INCOME_SLIDER_MAX = 1_000_000;
const INCOME_SLIDER_STEP = 5_000;
const INCOME_SLIDER_DEFAULT = 75_000;
const INCOME_TYPE_MAX = 5_000_000;

function StepIncome({ onSelect }: { onSelect: (val: number, label: string) => void }) {
  const [val, setVal] = useState(INCOME_SLIDER_DEFAULT);

  const setFromSlider = (n: number) => {
    setVal(clampIncome(n, INCOME_SLIDER_MAX));
  };

  const setFromInput = (n: number) => {
    setVal(clampIncome(n, INCOME_TYPE_MAX));
  };

  const sliderValue = Math.min(val, INCOME_SLIDER_MAX);

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Monthly take-home
        </p>
        <p className="text-2xl font-black text-foreground tabular-nums">₹{formatINR(val)}</p>
        <p className="text-xs text-muted-foreground font-medium italic">{toWordsINR(val)}</p>
      </div>

      <div className="px-1 space-y-2">
        <Slider
          min={INCOME_SLIDER_MIN}
          max={INCOME_SLIDER_MAX}
          step={INCOME_SLIDER_STEP}
          value={[sliderValue]}
          onValueChange={([n]) => setFromSlider(n)}
          aria-label="Monthly take-home income"
        />
        <div className="flex justify-between text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
          <span>₹{formatINR(INCOME_SLIDER_MIN)}</span>
          <span>Drag or type exact below</span>
          <span>₹{formatINR(INCOME_SLIDER_MAX)}+</span>
        </div>
      </div>

      <NumberInput
        value={val}
        onChange={setFromInput}
        placeholder="₹ Or type exact take-home"
      />

      <button
        type="button"
        disabled={val <= 0}
        onClick={() => onSelect(val, shortLabel(val) + "/mo take-home")}
        className="nb-button-primary w-full py-3 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  );
}

function clampIncome(n: number, max: number): number {
  if (!Number.isFinite(n) || n <= 0) return INCOME_SLIDER_MIN;
  return Math.min(max, Math.max(INCOME_SLIDER_MIN, Math.round(n)));
}

// ─── Step: City ───────────────────────────────────────────────────────────────

function StepCity({ onSelect }: { onSelect: (tier: CityTier, label: string) => void }) {
  const opts: { tier: CityTier; label: string; sub: string }[] = [
    { tier: "metro", label: "Metro", sub: "Mumbai, Delhi, Hyderabad, Bengaluru, Chennai…" },
    { tier: "tier1", label: "Tier 1", sub: "Pune, Ahmedabad, Kolkata…" },
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
  const opts: { sit: HousingSituation; label: string; sub: string }[] = [
    { sit: "rent", label: "I rent my home", sub: "Paying monthly rent" },
    { sit: "emi", label: "Buying on a home loan", sub: "Paying EMI toward ownership" },
    { sit: "own", label: "I own it outright", sub: "No rent, no home loan" },
    { sit: "family", label: "Live with family", sub: "Little or no housing cost" },
  ];
  return (
    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {opts.map((o) => (
        <button
          key={o.sit}
          type="button"
          onClick={() => onSelect(o.sit, o.label)}
          className="nb-card py-3 px-4 text-left hover:bg-muted transition-colors"
          style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
        >
          <div className="font-bold text-sm">{o.label}</div>
          <div className="text-muted-foreground text-xs mt-0.5">{o.sub}</div>
        </button>
      ))}
    </div>
  );
}

// ─── Step: Total expenses ─────────────────────────────────────────────────────

function StepTotalExpenses({
  defaultValue,
  housingSituation,
  onNext,
}: {
  defaultValue: number;
  housingSituation: HousingSituation;
  onNext: (val: number) => void;
}) {
  const [val, setVal] = useState(defaultValue);
  useEffect(() => {
    setVal(defaultValue);
  }, [defaultValue]);

  const excludesHomeEmi = housingSituation === "emi";

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Estimated day-to-day living costs
        </p>
        <p className="text-xs text-muted-foreground font-medium leading-relaxed">
          This is food, transport, utilities, insurance, and housing{" "}
          {excludesHomeEmi ? "maintenance" : housingSituation === "rent" ? "(rent)" : "costs"} —
          based on your income, city, and housing. It is{" "}
          <span className="font-bold text-foreground">not</span> your full monthly outflow.
        </p>
        {excludesHomeEmi ? (
          <p className="text-xs text-muted-foreground font-medium leading-relaxed border-l-2 border-primary/40 pl-2">
            Home loan EMI is excluded here — you&apos;ll add outstanding loan balances in the loans
            step next. Investments / SIPs are also separate.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground font-medium leading-relaxed border-l-2 border-primary/40 pl-2">
            Loan EMIs and investments are not included — those come in later steps.
          </p>
        )}
      </div>
      <NumberInput value={val} onChange={setVal} placeholder="₹ Monthly living costs" />
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
  labelPlaceholder = "Label",
}: {
  item: CustomItem;
  onLabelChange: (label: string) => void;
  onAmountChange: (amount: number) => void;
  onRemove: () => void;
  labelPlaceholder?: string;
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
    <div className="space-y-1 animate-in slide-in-from-top-2 fade-in duration-200 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <input
          type="text"
          className="nb-input flex-1 min-w-0 py-2 text-sm"
          placeholder={labelPlaceholder}
          value={item.label}
          onChange={(e) => onLabelChange(e.target.value)}
        />
        <input
          type="text"
          inputMode="numeric"
          className="nb-input w-[5.5rem] sm:w-28 shrink-0 py-2 text-sm"
          placeholder="₹ Amount"
          value={raw}
          onChange={handleAmountChange}
        />
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove"
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors border-0 shadow-none"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      {words && (
        <p className="text-xs text-muted-foreground font-medium italic pl-1">{words}</p>
      )}
    </div>
  );
}

// ─── Step: Expense breakdown ──────────────────────────────────────────────────

function StepExpenseBreakdown({
  expenses: initialExpenses,
  initialCustom = [],
  housingSituation,
  onNext,
  onEditTotal,
}: {
  expenses: Record<string, number>;
  initialCustom?: CustomItem[];
  housingSituation: HousingSituation;
  onNext: (expenses: Record<string, number>, customItems: CustomItem[]) => void;
  onEditTotal: () => void;
}) {
  const [expenses, setExpenses] = useState({ ...initialExpenses });
  const [customItems, setCustomItems] = useState<CustomItem[]>(() =>
    initialCustom.map((item) => ({
      ...item,
      id: item.id || `exp_${Math.random().toString(36).slice(2, 9)}`,
    }))
  );

  const customTotal = customItems.reduce((s, i) => s + i.amount, 0);

  const handleChange = (key: string, val: number) => {
    setExpenses((prev) => ({ ...prev, [key]: val }));
  };

  const currentSum = Object.values(expenses).reduce((s, v) => s + v, 0) + customTotal;

  const handleSubmit = () => {
    // Keep `other` as the Other field only — custom rows persist separately
    onNext({ ...expenses }, customItems.filter((i) => i.amount > 0 || i.label.trim()));
  };

  const labelFor = (key: string) =>
    key === "housing" ? housingExpenseLabel(housingSituation) : (EXPENSE_LABELS[key] ?? key);

  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-0">
      <div className="flex justify-between items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onEditTotal}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground font-bold transition-colors shrink-0"
        >
          <ArrowLeft className="w-3 h-3" /> Back to estimate
        </button>
        <span className="text-xs font-bold text-muted-foreground truncate">
          Total {shortLabel(currentSum)}
          <span className="font-medium"> · edit freely</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 min-w-0">
        {Object.entries(expenses).map(([key, val]) => (
          <div key={key} className="flex flex-col gap-1 min-w-0">
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground truncate">
              {labelFor(key)}
            </label>
            <NumberInput small value={val} onChange={(n) => handleChange(key, n)} />
          </div>
        ))}
      </div>

      {customItems.length > 0 && (
        <div className="space-y-2 animate-in fade-in border-t border-foreground/10 pt-3 min-w-0">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Extra expenses
          </p>
          {customItems.map((item) => (
            <CustomItemRow
              key={item.id}
              item={item}
              labelPlaceholder="Label (e.g. misc, gym…)"
              onLabelChange={(l) =>
                setCustomItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, label: l } : i))
                )
              }
              onAmountChange={(a) =>
                setCustomItems((prev) =>
                  prev.map((i) => (i.id === item.id ? { ...i, amount: a } : i))
                )
              }
              onRemove={() => setCustomItems((prev) => prev.filter((i) => i.id !== item.id))}
            />
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() =>
          setCustomItems((prev) => [
            ...prev,
            { id: `exp_${Date.now()}`, label: "", amount: 0 },
          ])
        }
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add another expense (optional)
      </button>

      <button type="button" onClick={handleSubmit} className="nb-button-primary w-full py-3">
        Looks good →
      </button>
    </div>
  );
}

// ─── Step: Savings ────────────────────────────────────────────────────────────

function StepSavings({ onNext }: { onNext: (val: number) => void }) {
  const [val, setVal] = useState(0);
  return (
    <div className="space-y-3 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <NumberInput value={val} onChange={setVal} placeholder="₹ Liquid cash / savings" />
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
        Skip this question
      </button>
    </div>
  );
}

// ─── Step: Investments ────────────────────────────────────────────────────────

function StepInvestments({
  onNext,
}: {
  onNext: (
    assets: Partial<Record<string, number>>,
    customItems: CustomItem[],
    monthlyInvestments: number
  ) => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, number>>({});
  const [customItems, setCustomItems] = useState<CustomItem[]>([]);
  const [showMonthly, setShowMonthly] = useState(false);
  const [monthlyInvestments, setMonthlyInvestments] = useState(0);

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
    onNext(
      assets,
      customItems.filter((i) => i.amount > 0 || i.label.trim()),
      showMonthly ? monthlyInvestments : 0
    );
  };

  const hasAny = selected.length > 0 || customItems.length > 0;

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-0 overflow-x-hidden">
      <div className="flex flex-wrap gap-2">
        {INVESTMENT_OPTIONS.map((o) => (
          <Chip
            key={o.id}
            label={o.label}
            selected={selected.includes(o.id)}
            onClick={() => toggle(o.id)}
          />
        ))}
        <Chip
          label="None"
          selected={!hasAny}
          onClick={() => {
            toggle("none");
            setCustomItems([]);
          }}
        />
      </div>

      {selected.length > 0 && (
        <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Current asset value (total you hold today)
          </p>
          <p className="text-[10px] text-muted-foreground font-medium -mt-1">
            Not your monthly SIP — that&apos;s optional below
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

      {customItems.length > 0 && (
        <div className="space-y-2 animate-in fade-in">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Other assets
          </p>
          {customItems.map((item) => (
            <CustomItemRow
              key={item.id}
              item={item}
              labelPlaceholder="Label (e.g. PPF, FD…)"
              onLabelChange={(l) => updateCustom(item.id, "label", l)}
              onAmountChange={(a) => updateCustom(item.id, "amount", a)}
              onRemove={() => removeCustom(item.id)}
            />
          ))}
          {customTotal > 0 && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Total other: {shortLabel(customTotal)} — counted with liquid savings
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={addCustomItem}
        className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
      >
        <Plus className="w-3.5 h-3.5" /> Add more assets (PPF, FD, NPS…)
      </button>

      <div className="border-t border-foreground/10 pt-3 space-y-2">
        {!showMonthly ? (
          <button
            type="button"
            onClick={() => setShowMonthly(true)}
            className="flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add monthly SIP / investments (optional)
          </button>
        ) : (
          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Monthly SIP / NPS / other (recurring)
            </p>
            <p className="text-[10px] text-muted-foreground font-medium">
              How much you invest each month — separate from asset balances above
            </p>
            <NumberInput
              value={monthlyInvestments}
              onChange={setMonthlyInvestments}
              placeholder="₹ Per month"
            />
          </div>
        )}
      </div>

      <button type="button" onClick={handleSubmit} className="nb-button-primary w-full py-3">
        {!hasAny && monthlyInvestments === 0 ? "No assets →" : "Confirm →"}
      </button>
    </div>
  );
}

// ─── Step: Debts ──────────────────────────────────────────────────────────────

function StepDebts({
  onNext,
}: {
  onNext: (
    liabilities: Partial<Record<string, number>>,
    customItems: CustomItem[]
  ) => void;
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
    onNext(
      liabilities,
      customItems.filter((i) => i.amount > 0 || i.label.trim())
    );
  };

  return (
    <div className="space-y-4 animate-in slide-in-from-bottom-4 fade-in duration-300 min-w-0 overflow-x-hidden">
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
              labelPlaceholder="Label (e.g. vehicle loan…)"
              onLabelChange={(l) => updateCustom(item.id, "label", l)}
              onAmountChange={(a) => updateCustom(item.id, "amount", a)}
              onRemove={() => removeCustom(item.id)}
            />
          ))}
          {customOthersTotal > 0 && (
            <p className="text-[10px] text-muted-foreground font-medium">
              Total: {shortLabel(customOthersTotal)} — saved as named other loans
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
  const opts: { value: RiskAppetite; label: string; desc: string }[] = [
    { value: "low", label: "Low", desc: "Safety first — FDs, debt funds, stability" },
    { value: "medium", label: "Medium", desc: "Balanced — mix of equity and debt" },
    { value: "high", label: "High", desc: "Growth focused — equity, stocks, crypto" },
  ];
  return (
    <div className="flex flex-col gap-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      {opts.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onSelect(o.value)}
          className="nb-card py-3 px-4 text-left hover:bg-muted transition-colors"
          style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
        >
          <div className="font-bold text-sm capitalize">{o.label} Risk</div>
          <div className="text-xs text-muted-foreground mt-0.5">{o.desc}</div>
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
            className="nb-card py-2.5 px-3 text-center hover:bg-muted transition-colors"
            style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
          >
            <span className="text-sm font-bold">{o.label}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={onSkip}
        className="w-full text-xs font-bold text-muted-foreground hover:text-foreground underline"
      >
        Skip this question
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

/** Answer-style CTA in the chat reply slot; opens a modal for tall forms. */
function ExpandableStep({
  title,
  summary,
  ctaLabel = "Tap to answer",
  skipLabel,
  onSkip,
  children,
}: {
  title: string;
  summary: string;
  ctaLabel?: string;
  skipLabel?: string;
  onSkip?: () => void;
  children: (close: () => void) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  return (
    <div className="space-y-2 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full text-left rounded-2xl rounded-tr-md border-2 border-foreground bg-primary/15 hover:bg-primary/25 transition-colors p-4 flex items-center justify-between gap-3 group"
        style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1.5">
            Click to answer
          </p>
          <p className="text-sm font-black text-foreground">{title}</p>
          <p className="text-xs font-medium text-muted-foreground mt-1 leading-snug">
            {summary}
          </p>
          <p className="text-xs font-bold text-primary mt-2 inline-flex items-center gap-1 group-hover:gap-1.5 transition-all">
            {ctaLabel} <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>
        <span className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground border-2 border-foreground flex items-center justify-center">
          <Maximize2 className="w-4 h-4" />
        </span>
      </button>

      {skipLabel && onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-xs font-bold text-muted-foreground hover:text-foreground underline py-1"
        >
          {skipLabel}
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[calc(100%-1.5rem)] max-w-lg max-h-[85vh] overflow-x-hidden overflow-y-auto border-2 border-foreground rounded-xl bg-card p-4 sm:p-6 shadow-[6px_6px_0px_0px_hsl(var(--foreground))] box-border"
        >
          <DialogHeader className="text-left pr-8">
            <DialogTitle className="font-black text-lg tracking-tight">{title}</DialogTitle>
            <DialogDescription className="text-xs font-medium">
              Fill this in to continue. Click outside to close without sending.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-1 min-w-0 overflow-x-hidden">{children(close)}</div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FinancialChatOnboarding({ onDone }: Props) {
  const { user } = useAuth();
  const name = user.user_metadata.full_name?.split(" ")[0] || "User";

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
  const [liquidCash, setLiquidCash] = useState(
    savedDraft?.liquidCash ?? savedDraft?.form?.assets?.bankBalance ?? 0
  );
  const [showResumeBanner, setShowResumeBanner] = useState(isResume);

  const bottomRef = useRef<HTMLDivElement>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);

  const updateScrollCues = useCallback(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const epsilon = 4;
    setCanScrollUp(scrollTop > epsilon);
    setCanScrollDown(scrollTop + clientHeight < scrollHeight - epsilon);
  }, []);

  const scrollChatTo = (position: "top" | "bottom") => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTo({
      top: position === "top" ? 0 : el.scrollHeight,
      behavior: "smooth",
    });
    setTimeout(updateScrollCues, 200);
  };

  const scrollToBottom = (behavior: ScrollBehavior = "smooth") => {
    const jump = () => {
      const el = chatScrollRef.current;
      if (!el) return;
      el.scrollTo({ top: el.scrollHeight, behavior });
      bottomRef.current?.scrollIntoView({ block: "end", behavior });
      updateScrollCues();
    };
    // Defer so layout (history + input slot) is measured
    requestAnimationFrame(() => {
      jump();
      setTimeout(jump, behavior === "auto" ? 50 : 80);
    });
  };

  useEffect(() => {
    updateScrollCues();
    const el = chatScrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollCues);
    ro.observe(el);
    return () => ro.disconnect();
  }, [history, updateScrollCues]);

  // Persist draft on every meaningful change
  const persistDraft = useCallback(() => {
    if (step === "done") return;
    saveDraft({ step, history, cityTier, housingSituation, form, liquidCash });
  }, [step, history, cityTier, housingSituation, form, liquidCash]);

  useEffect(() => {
    persistDraft();
  }, [persistDraft]);

  const pushHistory = (entries: ChatEntry[]) => {
    setHistory((prev) => [...prev, ...entries]);
    scrollToBottom("smooth");
  };

  const BOT_QUESTIONS: Record<Step, string> = {
    income: `Hey ${name}! Let's map your finances. What's your monthly take-home income?`,
    city: "Which city tier do you live in? This helps estimate typical living costs.",
    housing: "How's your housing situation?",
    totalExpenses:
      "Here's an estimate of your day-to-day living costs (not loan EMIs or investments). Adjust if needed — next we'll split it by category.",
    expenseBreakdown:
      "Here's a category breakdown with approximate amounts. Edit any field freely — including Other.",
    savings:
      "How much liquid cash do you have right now (savings / bank balance)? This is your emergency buffer.",
    investments:
      "What assets do you hold today? Enter their current total value — monthly SIP is optional after that.",
    debts: "Any outstanding loans or debt? Select what applies (total owed, not EMI).",
    risk: "Almost there — what's your risk appetite for investments?",
    ageRange:
      "Optional: your age range. Used only to estimate FI timeline (retirement at 60).",
    done: "",
  };

  // Push the first bot message only on a fresh (non-resumed) mount
  useEffect(() => {
    if (!savedDraft) {
      pushHistory([{ role: "bot", text: BOT_QUESTIONS.income }]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // On resume, land on the latest question (draft history restores at scrollTop 0)
  useEffect(() => {
    if (!savedDraft || history.length === 0) return;
    scrollToBottom("auto");
    // Retry after resume banner / input CTA paint
    const t = setTimeout(() => scrollToBottom("auto"), 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advance = (nextStep: Step, userText: string, botText?: string) => {
    const answeredStep = step as AnswerableStep;
    const entries: ChatEntry[] = [{ role: "user", text: userText, answeredStep }];
    if (botText) entries.push({ role: "bot", text: botText });
    pushHistory(entries);
    setStep(nextStep);
  };

  /** Jump back to a prior answer; drop that answer and everything after it. */
  const handleEditAnswer = (answeredStep: AnswerableStep) => {
    if (step === "done") return;
    const idx = history.findIndex(
      (e) => e.role === "user" && e.answeredStep === answeredStep
    );
    if (idx < 0) return;

    setHistory((prev) => prev.slice(0, idx));
    setStep(answeredStep);

    // Keep liquid cash coherent if re-editing investments (customAssets cleared separately)
    if (answeredStep === "investments" || answeredStep === "savings") {
      setForm((prev) => ({
        ...prev,
        assets: {
          ...prev.assets,
          bankBalance: liquidCash,
          ...(answeredStep === "investments"
            ? { mutualFunds: 0, stocks: 0, gold: 0, realEstate: 0 }
            : {}),
        },
        ...(answeredStep === "investments"
          ? { monthlyInvestments: 0, customAssets: [] }
          : {}),
      }));
    }
    if (answeredStep === "debts") {
      setForm((prev) => ({
        ...prev,
        liabilities: {
          homeLoan: 0,
          personalLoan: 0,
          creditCardDebt: 0,
          others: 0,
        },
        customLiabilities: [],
      }));
    }

    setTimeout(() => scrollToBottom("smooth"), 50);
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
    const defaultTotal = estimateMonthlyLivingExpenses({
      monthlyIncome: form.monthlyIncome,
      cityTier,
      housingSituation: sit,
    });
    const distributedExpenses = distributeExpenses(
      defaultTotal,
      cityTier,
      sit,
      form.monthlyIncome
    );
    setForm((prev) => ({ ...prev, expenses: distributedExpenses, customExpenses: [] }));
    advance("totalExpenses", label, BOT_QUESTIONS.totalExpenses);
  };

  const handleTotalExpenses = (total: number) => {
    const distributedExpenses = distributeExpenses(
      total,
      cityTier,
      housingSituation,
      form.monthlyIncome
    );
    setForm((prev) => ({ ...prev, expenses: distributedExpenses, customExpenses: [] }));
    advance("expenseBreakdown", shortLabel(total) + "/month", BOT_QUESTIONS.expenseBreakdown);
  };

  // Go back from expense breakdown → total expenses (pop last 2 history entries)
  const handleEditTotal = () => {
    setHistory((prev) => prev.slice(0, -2));
    setStep("totalExpenses");
  };

  const handleExpenseBreakdown = (
    expenses: Record<string, number>,
    customItems: CustomItem[]
  ) => {
    setForm((prev) => ({
      ...prev,
      expenses: expenses as unknown as typeof prev.expenses,
      customExpenses: customItems.map(({ label, amount }) => ({
        label: label.trim() || "Extra",
        amount,
      })),
    }));
    const extras = customItems.filter((i) => i.amount > 0);
    const confirmLabel =
      extras.length > 0
        ? `Breakdown confirmed ✓ (+${extras.length} extra)`
        : "Breakdown confirmed ✓";
    advance("savings", confirmLabel, BOT_QUESTIONS.savings);
  };

  const handleSavings = (val: number) => {
    setLiquidCash(val);
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
    customItems: CustomItem[],
    monthlyInvestments: number
  ) => {
    const customAssets = customItems.map(({ label, amount }) => ({
      label: label.trim() || "Other",
      amount,
    }));
    setForm((prev) => ({
      ...prev,
      monthlyInvestments,
      customAssets,
      assets: {
        ...prev.assets,
        bankBalance: liquidCash,
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
    const customTotal = customAssets.reduce((s, i) => s + i.amount, 0);
    if (customTotal > 0) parts.push(`Other ${shortLabel(customTotal)}`);
    if (monthlyInvestments > 0) parts.push(`${shortLabel(monthlyInvestments)}/mo SIP`);
    advance(
      "debts",
      parts.length > 0 ? parts.join(", ") : "No assets",
      BOT_QUESTIONS.debts
    );
  };

  const handleDebts = (
    liabilities: Partial<Record<string, number>>,
    customItems: CustomItem[]
  ) => {
    const customLiabilities = customItems.map(({ label, amount }) => ({
      label: label.trim() || "Other loan",
      amount,
    }));
    setForm((prev) => ({
      ...prev,
      customLiabilities,
      liabilities: {
        homeLoan: liabilities.homeLoan ?? 0,
        personalLoan: liabilities.personalLoan ?? 0,
        creditCardDebt: liabilities.creditCardDebt ?? 0,
        others: liabilities.others ?? 0,
      },
    }));
    const standardLabels = Object.keys(liabilities)
      .map((k) => LIABILITY_OPTIONS.find((o) => o.id === k)?.label)
      .filter(Boolean);
    const parts = [...standardLabels];
    if (customLiabilities.length > 0) {
      parts.push(
        ...customLiabilities.map((i) => i.label || "Other loans")
      );
    }
    const label = parts.length > 0 ? parts.join(", ") : "Debt-free";
    advance("risk", label, BOT_QUESTIONS.risk);
  };

  const handleRisk = (r: RiskAppetite) => {
    const updatedForm = { ...form, riskAppetite: r };
    setForm(updatedForm);
    const riskLabels: Record<RiskAppetite, string> = {
      low: "Low risk",
      medium: "Medium risk",
      high: "High risk",
    };
    advance("ageRange", riskLabels[r], BOT_QUESTIONS.ageRange);
  };

  const finalizeOnboarding = (finalForm: FinancialData, userText: string) => {
    pushHistory([
      { role: "user", text: userText, answeredStep: "ageRange" },
      {
        role: "bot",
        text: "All set! Review your summary on the next screen — you can still fine-tune any number there.",
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

  const resetOnboarding = () => {
    clearDraft();
    setShowResumeBanner(false);
    setStep("income");
    setHistory([{ role: "bot", text: BOT_QUESTIONS.income }]);
    setCityTier("metro");
    setHousingSituation("rent");
    setForm({ ...emptyFinancialData });
    setLiquidCash(0);
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
            defaultValue={estimateMonthlyLivingExpenses({
              monthlyIncome: form.monthlyIncome,
              cityTier,
              housingSituation,
            })}
            housingSituation={housingSituation}
            onNext={handleTotalExpenses}
          />
        );
      case "expenseBreakdown": {
        const expenseTotal = Object.values(form.expenses).reduce((s, v) => s + v, 0);
        return (
          <ExpandableStep
            title="Expense breakdown"
            summary={`${shortLabel(expenseTotal)}/mo across ${Object.keys(EXPENSE_LABELS).length} categories — open and confirm to answer`}
            ctaLabel="Open breakdown to answer"
          >
            {(close) => (
              <StepExpenseBreakdown
                key={`bd-${(form.customExpenses ?? [])
                  .map((c) => `${c.label}:${c.amount}`)
                  .join("|") || "empty"}`}
                expenses={form.expenses as unknown as Record<string, number>}
                initialCustom={(form.customExpenses ?? []).map((item, i) => ({
                  id: `exp_${i}_${item.label}`,
                  label: item.label,
                  amount: item.amount,
                }))}
                housingSituation={housingSituation}
                onNext={(expenses, customItems) => {
                  close();
                  handleExpenseBreakdown(expenses, customItems);
                }}
                onEditTotal={() => {
                  close();
                  handleEditTotal();
                }}
              />
            )}
          </ExpandableStep>
        );
      }
      case "savings":
        return <StepSavings onNext={handleSavings} />;
      case "investments":
        return (
          <ExpandableStep
            title="Assets"
            summary="Current holdings (total value) — monthly SIP optional"
            ctaLabel="Open assets to answer"
            skipLabel="No assets"
            onSkip={() => handleInvestments({}, [], 0)}
          >
            {(close) => (
              <StepInvestments
                onNext={(assets, customItems, monthlyInvestments) => {
                  close();
                  handleInvestments(assets, customItems, monthlyInvestments);
                }}
              />
            )}
          </ExpandableStep>
        );
      case "debts":
        return (
          <ExpandableStep
            title="Loans & debt"
            summary="Home loan, personal loan, credit cards & other — add what applies"
            ctaLabel="Open loans to answer"
            skipLabel="No loans"
            onSkip={() => handleDebts({}, [])}
          >
            {(close) => (
              <StepDebts
                onNext={(liabilities, customItems) => {
                  close();
                  handleDebts(liabilities, customItems);
                }}
              />
            )}
          </ExpandableStep>
        );
      case "risk":
        return <StepRisk onSelect={handleRisk} />;
      case "ageRange":
        return (
          <ExpandableStep
            title="Age range"
            summary="Optional — used for FI timeline estimate"
            ctaLabel="Choose age range"
            skipLabel="Skip this question"
            onSkip={handleSkipAgeRange}
          >
            {(close) => (
              <StepAgeRange
                onSelect={(range) => {
                  close();
                  handleAgeRange(range);
                }}
                onSkip={() => {
                  close();
                  handleSkipAgeRange();
                }}
              />
            )}
          </ExpandableStep>
        );
      case "done":
        return (
          <div className="flex items-center gap-2 text-accent text-sm font-bold animate-in fade-in">
            <Check className="w-4 h-4" /> Building your dashboard…
          </div>
        );
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto h-full flex flex-col gap-4 min-h-0">
      {/* Resume / start-over bar — always available while filling the form */}
      {step !== "done" && (
        <div
          className={`shrink-0 flex items-center justify-between gap-3 px-4 py-3 rounded-lg border-2 animate-in slide-in-from-top-2 fade-in ${
            showResumeBanner
              ? "border-accent/50 bg-accent/10"
              : "border-foreground/15 bg-muted/30"
          }`}
        >
          <p
            className={`text-xs font-bold ${
              showResumeBanner ? "text-accent" : "text-muted-foreground"
            }`}
          >
            {showResumeBanner ? "Resuming where you left off" : "Want a fresh start?"}
          </p>
          <button
            type="button"
            onClick={resetOnboarding}
            className="text-[10px] font-bold text-muted-foreground underline hover:text-foreground shrink-0"
          >
            Start over
          </button>
        </div>
      )}

      <div className="shrink-0">
        <ProgressBar step={step} />
      </div>

      {/* Chat history — only this region scrolls */}
      <div className="relative flex-1 min-h-0">
        {canScrollUp && (
          <div className="absolute top-0 inset-x-0 z-10 h-10 bg-gradient-to-b from-background via-background/80 to-transparent flex justify-center pt-0.5 pointer-events-none">
            <button
              type="button"
              aria-label="Scroll to top of conversation"
              onClick={() => scrollChatTo("top")}
              className="pointer-events-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>
        )}

        <div
          ref={chatScrollRef}
          onScroll={updateScrollCues}
          className="h-full overflow-y-auto overscroll-contain pt-2 pb-2 space-y-5"
        >
          {history.map((entry, i) =>
            entry.role === "bot" ? (
              <BotBubble key={i} text={entry.text} />
            ) : (
              <UserBubble
                key={i}
                text={entry.text}
                onEdit={
                  step !== "done" && entry.answeredStep
                    ? () => handleEditAnswer(entry.answeredStep!)
                    : undefined
                }
              />
            )
          )}
          <div ref={bottomRef} />
        </div>

        {canScrollDown && (
          <div className="absolute bottom-0 inset-x-0 z-10 h-10 bg-gradient-to-t from-background via-background/80 to-transparent flex justify-center items-end pb-0.5 pointer-events-none">
            <button
              type="button"
              aria-label="Scroll to bottom of conversation"
              onClick={() => scrollChatTo("bottom")}
              className="pointer-events-auto p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Current input / answer area — expandable steps already look like a reply */}
      {(() => {
        const isFormAnswer =
          step === "expenseBreakdown" ||
          step === "investments" ||
          step === "debts" ||
          step === "ageRange";
        return (
          <div
            className={isFormAnswer ? "shrink-0" : "shrink-0 nb-card"}
            style={
              isFormAnswer
                ? undefined
                : { boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }
            }
          >
            {renderInput()}
          </div>
        );
      })()}
    </div>
  );
}
