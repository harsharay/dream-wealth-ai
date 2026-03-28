import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Loader2, ArrowLeft, Lock, Compass, Moon, Sun } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function ResetPassword() {
    const [loading, setLoading] = useState(false);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const navigate = useNavigate();

    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'dark' || stored === 'light') return stored;
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    });

    // Apply theme class
    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', theme);
    }, [theme]);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: password,
            });

            if (error) throw error;

            toast.success("Password updated successfully! Redirecting to login...");
            setTimeout(() => navigate("/"), 2000);
        } catch (error: any) {
            toast.error(error.message || "Failed to update password");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 flex flex-col items-center">
            <div className="mt-12 flex items-center gap-3 mb-8">
                <div className="w-12 h-12 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
                    style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}>
                    <Compass className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="font-sans text-3xl font-bold text-foreground">WealthPilot</h1>
                <button
                    onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                    className="nb-button-outline p-2 ml-4"
                    title="Toggle Theme"
                >
                    {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
            </div>

            <div className="w-full max-w-md mx-auto">
                <div className="nb-card p-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4 border-2 border-primary/20">
                            <Lock className="w-8 h-8 text-primary" />
                        </div>
                        <h2 className="text-3xl font-bold text-foreground mb-2">New Password</h2>
                        <p className="text-muted-foreground text-sm font-medium">
                            Enter and confirm your new password below.
                        </p>
                    </div>

                    <form onSubmit={handleReset} className="space-y-4">
                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                New Password
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

                        <div>
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1 block">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                required
                                className="nb-input w-full"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
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
                                "Update Password →"
                            )}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button
                            onClick={() => navigate("/")}
                            className="flex items-center justify-center gap-2 text-sm font-bold text-primary hover:underline mx-auto"
                        >
                            <ArrowLeft className="w-4 h-4" /> Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
