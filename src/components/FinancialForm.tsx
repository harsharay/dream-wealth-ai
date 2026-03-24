import { useState, type ChangeEvent } from "react";
import type { FinancialData, RiskAppetite } from "@/types/finance";

interface FinancialFormProps {
  data: FinancialData;
  onSave: (data: FinancialData) => void;
}

export function FinancialForm({ data, onSave }: FinancialFormProps) {
  const [form, setForm] = useState<FinancialData>(data);

  const updateField = (section: string, field: string, value: string) => {
    const num = parseFloat(value) || 0;
    if (section === "root") {
      setForm(prev => ({ ...prev, [field]: num }));
    } else {
      setForm(prev => ({
        ...prev,
        [section]: { ...(prev as any)[section], [field]: num },
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  const inputClass = "nb-input w-full text-sm";
  const labelClass = "text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

  const renderField = (label: string, section: string, field: string, val: number) => (
    <div key={field}>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        className={inputClass}
        value={val || ""}
        onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(section, field, e.target.value)}
        placeholder="₹ 0"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Income */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">💰 Monthly Income</h3>
        {renderField("Total Monthly Income", "root", "monthlyIncome", form.monthlyIncome)}
      </div>

      {/* Expenses */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">🧾 Monthly Expenses</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.expenses).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "expenses", key, val)
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">📈 Assets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.assets).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "assets", key, val)
          )}
        </div>
      </div>

      {/* Liabilities */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">💳 Liabilities</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(form.liabilities).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "liabilities", key, val)
          )}
        </div>
      </div>

      {/* Risk Appetite */}
      <div className="nb-card">
        <h3 className="font-sans font-bold text-foreground mb-4 text-lg">🎯 Risk Appetite</h3>
        <div className="flex gap-3">
          {(["low", "medium", "high"] as RiskAppetite[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, riskAppetite: level }))}
              className={`flex-1 capitalize text-sm font-bold py-3 px-4 rounded-lg border-2 border-foreground transition-all ${
                form.riskAppetite === level
                  ? "bg-primary text-primary-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
              style={{ boxShadow: form.riskAppetite === level ? "2px 2px 0px 0px hsl(var(--foreground))" : "3px 3px 0px 0px hsl(var(--foreground))" }}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="nb-button-primary w-full text-base py-4">
        Show My Financial Insights →
      </button>
    </form>
  );
}
