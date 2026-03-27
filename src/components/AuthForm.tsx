import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AuthForm() {
    const [loading, setLoading] = useState(false);
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isSignUp, setIsSignUp] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isSignUp) {
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

    return (
        <div className="max-w-md mx-auto mt-12">
            <div className="nb-card p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                        {isSignUp ? "Join WealthPilot" : "Welcome!"}
                    </h2>
                    <p className="text-muted-foreground text-sm font-medium">
                        {isSignUp
                            ? "Create an account to save your financial health progress."
                            : "Sign in to access your financial diagnoses."}
                    </p>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    {isSignUp && (
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

                    <div>
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                            Password
                        </label>
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

                    <button
                        type="submit"
                        disabled={loading}
                        className="nb-button-primary w-full py-4 flex items-center justify-center gap-2 mt-4"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            isSignUp ? "Sign Up →" : "Login →"
                        )}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsSignUp(!isSignUp)}
                        className="text-sm font-bold text-primary hover:underline"
                    >
                        {isSignUp ? "Already have an account? Login" : "Don't have an account? Sign Up"}
                    </button>
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
