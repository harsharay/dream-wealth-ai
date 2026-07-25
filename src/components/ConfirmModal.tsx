import type { ReactNode } from "react";
import { X } from "lucide-react";

export interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Visual weight for the confirm action */
  variant?: "primary" | "danger" | "secondary";
  onConfirm: () => void;
  onCancel: () => void;
  /** Disable actions while an async confirm is in flight */
  busy?: boolean;
}

const confirmButtonClass: Record<NonNullable<ConfirmModalProps["variant"]>, string> = {
  primary: "nb-button-primary",
  danger:
    "nb-button flex-1 bg-danger text-danger-foreground hover:bg-danger/90 border-2 border-foreground",
  secondary: "nb-button-secondary",
};

/**
 * App-styled confirm dialog (replaces window.confirm).
 * Matches WealthPilot neo-brutalist modals: bordered card, backdrop blur, nb-buttons.
 */
export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary",
  onConfirm,
  onCancel,
  busy = false,
}: ConfirmModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-modal-title"
        aria-describedby="confirm-modal-desc"
        className="bg-card border-4 border-foreground rounded-2xl w-full max-w-md p-6 md:p-8 relative overflow-hidden text-center animate-in zoom-in-95 duration-200"
        style={{ boxShadow: "6px 6px 0px 0px hsl(var(--foreground))" }}
      >
        <button
          type="button"
          onClick={onCancel}
          disabled={busy}
          className="absolute top-4 right-4 p-2 hover:bg-muted border-2 border-transparent hover:border-foreground rounded-lg transition-all disabled:opacity-40"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <h2
          id="confirm-modal-title"
          className="text-xl md:text-2xl font-black uppercase tracking-tight mb-3 pr-8"
        >
          {title}
        </h2>
        <div
          id="confirm-modal-desc"
          className="text-sm font-bold text-muted-foreground mb-8 leading-relaxed"
        >
          {description}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="nb-button-outline flex-1 py-3 disabled:opacity-40"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`${confirmButtonClass[variant]} flex-1 py-3 disabled:opacity-40`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
