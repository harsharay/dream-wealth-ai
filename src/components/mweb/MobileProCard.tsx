import { Crown, Lock, ShieldCheck, Ban } from "lucide-react";

interface MobileProCardProps {
  onUpgrade: () => void;
}

export function MobileProCard({ onUpgrade }: MobileProCardProps) {
  return (
    <section className="rounded-2xl border border-violet-200/80 dark:border-primary/20 bg-[#F5F3FF] dark:bg-primary/10 px-4 pt-4 pb-5">
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Crown className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground">WealthPilot Pro</h3>
            <span className="text-[10px] font-black tracking-wider uppercase px-1.5 py-0.5 rounded-md bg-primary text-primary-foreground">
              Pro
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            AI advisor & custom tax planning.
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={onUpgrade}
        className="w-full min-h-16 rounded-xl bg-[#F5C518] text-neutral-900 font-bold text-base flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
      >
        <Lock className="w-4 h-4" />
        Unlock Pro Access — ₹499/mo
      </button>

      <div className="mt-3 flex items-center justify-center gap-5 text-[11px] font-medium text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Ban className="w-3.5 h-3.5" />
          Cancel anytime
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />
          Secure payments
        </span>
      </div>
    </section>
  );
}
