import { useState } from "react";
import { Lock, Code2, Rocket, X, Zap, MessageSquare, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ProUpgradeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function ProUpgradeModal({ isOpen, onClose }: ProUpgradeModalProps) {
    const { redeemBetaCode, upgradeToPro } = useAuth();
    const [coupon, setCoupon] = useState("");
    const [showCouponInput, setShowCouponInput] = useState(false);

    if (!isOpen) return null;

    const handleRedeem = (e: React.FormEvent) => {
        e.preventDefault();
        if (!coupon.trim()) return;

        const success = redeemBetaCode(coupon.trim());
        if (success) {
            toast.success("Beta Access Granted! Pro features unlocked for 1 hour.");
            onClose();
        } else {
            toast.error("Invalid or expired Beta Code.");
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200 p-4">
            <div className="bg-card border-4 border-foreground rounded-2xl w-full max-w-lg p-8 relative overflow-hidden nb-shadow-lg text-center animate-in zoom-in-95 duration-300">
                {/* Close Button */}
                <button 
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 hover:bg-muted border-2 border-transparent hover:border-foreground rounded-lg transition-all cursor-pointer z-50"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-16 h-16 rounded-xl bg-primary border-4 border-foreground flex items-center justify-center mb-6 nb-shadow-sm rotate-3">
                        <Rocket className="w-8 h-8 text-primary-foreground" />
                    </div>

                    <h2 className="text-3xl font-black uppercase tracking-tight mb-2">Upgrade to Pro</h2>
                    <p className="text-muted-foreground font-bold mb-8 text-sm max-w-sm">
                        Unlock the WealthPilot full suite: AI Advisor, Simulator, and personalized financial paths.
                    </p>

                    <div className="grid grid-cols-1 gap-3 w-full mb-8">
                        <FeatureItem icon={<MessageSquare className="w-4 h-4" />} text="Unlimited AI Advisory" />
                        <FeatureItem icon={<TrendingUp className="w-4 h-4" />} text="Simulator & Strategy Engine" />
                        <FeatureItem icon={<Zap className="w-4 h-4" />} text="Advanced Tax Optimization" />
                    </div>

                    <button 
                        disabled
                        className="w-full py-4 px-6 bg-muted text-muted-foreground border-4 border-foreground/30 font-black uppercase tracking-widest text-sm transition-all flex justify-center gap-3 mb-6 cursor-not-allowed opacity-60"
                    >
                        <Zap className="w-5 h-5" />
                        Purchase Coming Soon
                    </button>

                    <div className="w-full relative py-4">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t-2 border-dashed border-foreground/20" />
                        </div>
                        <div className="relative flex justify-center text-[10px] uppercase">
                            <button 
                                onClick={() => setShowCouponInput(!showCouponInput)}
                                className="bg-card px-4 text-muted-foreground font-black hover:text-foreground transition-colors flex items-center gap-2"
                            >
                                <Code2 className="w-4 h-4" /> Beta Access Code?
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
                                className="flex-1 px-4 py-3 border-2 border-foreground bg-background font-black uppercase tracking-widest focus:outline-none placeholder:text-muted-foreground/30 text-xs"
                            />
                            <button 
                                type="submit"
                                className="px-6 bg-accent text-accent-foreground font-black uppercase nb-button text-xs"
                            >
                                Redeem
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

function FeatureItem({ icon, text }: { icon: React.ReactNode, text: string }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-secondary/10 border-2 border-foreground/10 rounded-xl">
            <div className="text-primary">{icon}</div>
            <span className="text-xs font-bold uppercase tracking-tight">{text}</span>
        </div>
    );
}
