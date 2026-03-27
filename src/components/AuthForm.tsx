import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AuthForm() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [view, setView] = useState<'login' | 'signup' | 'forgot-password'>('login');

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (view === 'signup') {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { full_name: fullName },
                    },
                });
                if (error) throw error;
                toast.success("Welcome! Check your email to confirm.");
            } else {
                const { error } = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
                if (error) throw error;
                toast.success("Logged in successfully!");
            }
        } catch (error: any) {
            toast.error(error.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            toast.success("Password reset link sent to your email!");
            setView('login');
        } catch (error: any) {
            toast.error(error.message || "Failed to send reset link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md mx-auto mt-12">
            <div className="nb-card p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                        {view === 'signup' ? "Join WealthPilot" : view === 'forgot-password' ? "Reset Password" : "Welcome!"}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        {view === 'signup'
                            ? "Create an account to save your financial health progress."
                            : view === 'forgot-password'
                                ? "Enter your email to receive a reset link."
                                : "Sign in to access your financial diagnoses."}
                    </p>
                </div>

                <form onSubmit={view === 'forgot-password' ? handleForgotPassword : handleAuth} className="space-y-4">
                    {view === 'signup' && (
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                className="nb-input w-full"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Jane Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            className="nb-input w-full"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="jane@example.com"
                        />
                    </div>

                    {view !== 'forgot-password' && (
                        <div>
                            <div className="flex justify-between items-end mb-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
                                    Password
                                </label>
                                {view === 'login' && (
                                    <button
                                        type="button"
                                        onClick={() => setView('forgot-password')}
                                        className="text-[10px] font-bold text-primary hover:underline"
                                    >
                                        Forgot?
                                    </button>
                                )}
                            </div>
                            <input
                                type="password"
                                required
                                className="nb-input w-full"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                minLength={6}
                            />
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="nb-button-primary w-full py-4 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            view === 'signup' ? "Sign Up →" : view === 'forgot-password' ? "Send Reset Link →" : "Login →"
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={() => setView(view === 'signup' ? 'login' : 'signup')}
                        className="text-sm font-bold text-primary hover:underline"
                    >
                        {view === 'signup' ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                    </button>
                    {view === 'forgot-password' && (
                        <button
                            type="button"
                            onClick={() => setView('login')}
                            className="text-xs font-bold text-muted-foreground hover:text-foreground"
                        >
                            ← Back to Login
                        </button>
                    )}
                </div>
            </div>

            {/* Dev Tip */}
            <div className="mt-6 p-4 rounded-lg bg-secondary/20 border-2 border-foreground/10 text-center">
                <p className="text-xs font-bold text-muted-foreground">
                    🔐 Securely stored & encrypted via Supabase Auth
                </p>
            </div>
        </div>
    );
}
