import { useState } from "react";
import { Lock, MessageSquare, Zap, TrendingUp } from "lucide-react";
import { ProUpgradeModal } from "./ProUpgradeModal";

export function PremiumUpsell() {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="nb-card-primary">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-lg bg-card border-2 border-foreground flex items-center justify-center shrink-0"
            style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}
          >
            <Zap className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-sans text-lg font-bold text-primary-foreground">
              Upgrade to Premium
            </h3>
            <p className="text-sm text-primary-foreground/80">
              Unlock the full power of AI financial coaching
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
          <Feature icon={<MessageSquare />} title="AI Advisor" desc="Ask unlimited questions" />
          <Feature icon={<TrendingUp />} title="Strategies" desc="Tax & investment plans" />
          <Feature icon={<Lock />} title="Reports" desc="Track your progress" />
        </div>

        <button
          className="nb-button-secondary w-full text-base mb-2"
          onClick={() => setShowModal(true)}
        >
          Unlock Pro Access →
        </button>
      </div>

      <ProUpgradeModal isOpen={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-start gap-2 bg-card/10 rounded-lg p-3 border border-primary-foreground/20">
      <div className="w-5 h-5 text-primary-foreground shrink-0 mt-0.5">
        {icon}
      </div>
      <div>
        <p className="text-sm font-bold text-primary-foreground">{title}</p>
        <p className="text-xs text-primary-foreground/70">{desc}</p>
      </div>
    </div>
  );
}