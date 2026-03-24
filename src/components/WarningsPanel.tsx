import { AlertTriangle } from "lucide-react";

interface WarningsPanelProps {
  warnings: string[];
}

export function WarningsPanel({ warnings }: WarningsPanelProps) {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-lg p-6 border-2 border-foreground bg-danger/10"
         style={{ boxShadow: "4px 4px 0px 0px hsl(0, 84%, 60%)" }}>
      <h3 className="text-sm font-bold uppercase tracking-wider text-danger mb-3 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Key Warnings
      </h3>
      <ul className="space-y-2">
        {warnings.map((w, i) => (
          <li key={i} className="text-sm text-foreground flex gap-2 font-medium">
            <span className="text-danger mt-0.5 shrink-0">✕</span>
            {w}
          </li>
        ))}
      </ul>
    </div>
  );
}
