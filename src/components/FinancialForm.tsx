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

  const inputClass = "neu-input w-full text-sm text-foreground bg-background";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  const renderField = (label: string, section: string, field: string, val: number) => (
    <div key={field}>
      <label className={labelClass}>{label}</label>
      <input
        type="number"
        className={inputClass}
        value={val || ""}
        onChange={(e: ChangeEvent<HTMLInputElement>) => updateField(section, field, e.target.value)}
        placeholder="0"
      />
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Income */}
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Monthly Income</h3>
        {renderField("Total Monthly Income", "root", "monthlyIncome", form.monthlyIncome)}
      </div>

      {/* Expenses */}
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Monthly Expenses</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.expenses).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "expenses", key, val)
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Assets</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Object.entries(form.assets).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "assets", key, val)
          )}
        </div>
      </div>

      {/* Liabilities */}
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Liabilities</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(form.liabilities).map(([key, val]) =>
            renderField(key.replace(/([A-Z])/g, " $1").trim(), "liabilities", key, val)
          )}
        </div>
      </div>

      {/* Risk Appetite */}
      <div className="neu-card">
        <h3 className="font-display font-semibold text-foreground mb-4">Risk Appetite</h3>
        <div className="flex gap-3">
          {(["low", "medium", "high"] as RiskAppetite[]).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => setForm(prev => ({ ...prev, riskAppetite: level }))}
              className={`neu-button flex-1 capitalize text-sm ${
                form.riskAppetite === level
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              {level}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="neu-button-primary w-full text-sm">
        Save & Analyze
      </button>
    </form>
  );
}
