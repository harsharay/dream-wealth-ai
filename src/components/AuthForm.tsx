import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, Mail } from "lucide-react";
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

    const handleGoogleLogin = async () => {
        setLoading(true);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: `${window.location.origin}/`,
                }
            });
            if (error) throw error;
        } catch (error: any) {
            toast.error(error.message || "Google login failed");
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

                <div className="space-y-4">
                    <button
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="nb-button w-full py-4 flex items-center justify-center gap-3 bg-white text-black hover:bg-gray-50 border-2 border-black dark:bg-zinc-900 dark:text-white dark:border-white"
                        style={{ boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="#4285F4"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"
                            />
                            <path
                                fill="#EA4335"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        <span className="font-bold">Continue with Google</span>
                    </button>

                    <div className="relative flex items-center py-2">
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                        <span className="flex-shrink mx-4 text-xs font-bold text-muted-foreground uppercase tracking-widest text-[10px]">Or continue with email</span>
                        <div className="flex-grow border-t border-muted-foreground/20"></div>
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 p-3 rounded-lg flex gap-3 items-start">
                        <Mail className="w-5 h-5 text-amber-600 dark:text-amber-500 shrink-0 mt-0.5" />
                        <p className="text-[11px] font-medium text-amber-800 dark:text-amber-200 leading-tight">
                            <span className="font-bold block mb-0.5">Email Authentication Delay</span>
                            Our email provider has a strict limit (2-4 emails/hr). Verification links may take a long time to arrive. **Google Login is recommended for instant access.**
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
        </div>
    );
}

