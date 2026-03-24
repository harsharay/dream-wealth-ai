import { Lock, MessageSquare, Zap, TrendingUp } from "lucide-react";

export function PremiumUpsell() {
  return (
    <div className="nb-card-primary">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-card border-2 border-foreground flex items-center justify-center"
             style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-sans text-lg font-bold text-primary-foreground">Upgrade to Premium</h3>
          <p className="text-sm text-primary-foreground/80">Unlock the full power of AI financial coaching</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className="flex items-start gap-2 bg-card/10 rounded-lg p-3 border border-primary-foreground/20">
          <MessageSquare className="w-5 h-5 text-primary-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-primary-foreground">AI Chat Advisor</p>
            <p className="text-xs text-primary-foreground/70">Ask unlimited questions about your finances</p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-card/10 rounded-lg p-3 border border-primary-foreground/20">
          <TrendingUp className="w-5 h-5 text-primary-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-primary-foreground">Personalized Strategies</p>
            <p className="text-xs text-primary-foreground/70">Tax optimization & investment plans</p>
          </div>
        </div>
        <div className="flex items-start gap-2 bg-card/10 rounded-lg p-3 border border-primary-foreground/20">
          <Lock className="w-5 h-5 text-primary-foreground shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-primary-foreground">Monthly Reports</p>
            <p className="text-xs text-primary-foreground/70">Progress tracking & accountability</p>
          </div>
        </div>
      </div>

      <button className="nb-button-secondary w-full text-base">
        Get Premium Access →
      </button>
    </div>
  );
}
