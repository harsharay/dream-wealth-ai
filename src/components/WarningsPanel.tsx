import { AlertTriangle } from "lucide-react";

interface WarningsPanelProps {
  warnings: string[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="neu-card border-l-4 border-danger">
      <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-danger mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Key Warnings
      </h3>
      <ul className="space-y-2">
        {warnings.map((w, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2">
            <span className="text-danger mt-0.5 shrink-0">•</span>
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
