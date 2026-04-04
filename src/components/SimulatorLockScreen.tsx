import { useState } from "react";
import { Lock, Code2, Rocket } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

import { ProUpgradeModal } from "./ProUpgradeModal";

export function SimulatorLockScreen() {
    const { redeemBetaCode } = useAuth();
    const [coupon, setCoupon] = useState("");
    const [showCouponInput, setShowCouponInput] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

    const handleRedeem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!coupon.trim()) return;

        const success = redeemBetaCode(coupon.trim());
        if (success) {
            toast.success("Beta Access Granted! Simulator unlocked for 1 hour.");
        } else {
            toast.error("Invalid or expired Beta Code.");
        }
    };

    return (
        <div className="flex-1 flex items-center justify-center min-h-[60vh] p-4">
            <div className="bg-card border-4 border-foreground rounded-2xl w-full max-w-lg p-8 relative overflow-hidden nb-shadow-lg text-center animate-in zoom-in-95 duration-500">
                {/* Decorative Elements */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -mr-16 -mt-16" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/20 rounded-full blur-3xl -ml-16 -mb-16" />

                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-20 h-20 rounded-full bg-foreground flex items-center justify-center mb-6 nb-shadow">
                        <Lock className="w-10 h-10 text-background" />
                    </div>

                    <h2 className="text-4xl font-black uppercase tracking-tight mb-4">Pro Access Required</h2>
                    <p className="text-muted-foreground font-bold mb-8 text-lg border-l-4 border-primary pl-4">
                        The WealthPilot Simulator is a highly advanced forecasting engine reserved for Pro members. Upgrade to unlock custom scenario planning and AI-curated missions.
                    </p>

                    <button 
                        onClick={() => setIsUpgradeModalOpen(true)}
                        className="w-full py-5 px-6 border-4 border-foreground bg-primary font-black uppercase tracking-widest text-sm transition-all flex justify-center gap-3 mb-6 nb-shadow cursor-pointer nb-button"
                    >
                        <Rocket className="w-5 h-5" />
                        Upgrade to Pro Now
                    </button>

                    <div className="w-full relative py-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t-2 border-dashed border-foreground/20" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <button 
                                onClick={() => setShowCouponInput(!showCouponInput)}
                                className="bg-card px-4 text-muted-foreground font-black hover:text-foreground transition-colors flex items-center gap-2"
                            >
                                <Code2 className="w-4 h-4" /> Have a beta code?
                            </button>
                        </div>
                    </div>

                    {showCouponInput && (
                        <form onSubmit={handleRedeem} className="w-full flex gap-2 animate-in slide-in-from-top-4 duration-300">
                            <input 
                                type="text"
                                placeholder="WP-000000-00"
                                value={coupon}
                                onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                                className="flex-1 px-4 py-3 border-2 border-foreground bg-background font-black uppercase tracking-widest focus:outline-none placeholder:text-muted-foreground/50"
                            />
                            <button 
                                type="submit"
                                className="px-6 border-2 border-foreground bg-accent text-accent-foreground font-black uppercase nb-button"
                            >
                                Redeem
                            </button>
                        </form>
                    )}
                </div>
            </div>
            <ProUpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
        </div>
    );
}
