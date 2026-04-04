import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import { toast } from 'sonner';

interface AuthContextType {
    user: User | null;
    session: Session | null;
    loading: boolean;
    isPaidUser: boolean;
    signOut: () => Promise<void>;
    upgradeToPro: () => Promise<void>;
    redeemBetaCode: (code: string) => boolean;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isPaidUser: false,
    signOut: async () => { },
    upgradeToPro: async () => { },
    redeemBetaCode: () => false,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isActualPaidUser, setIsActualPaidUser] = useState(false);
    
    // Beta unlock state
    const [betaExpiry, setBetaExpiry] = useState<number | null>(() => {
        const saved = localStorage.getItem('beta_unlock_expires_at');
        return saved ? parseInt(saved, 10) : null;
    });

    useEffect(() => {
        // Check active sessions
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            const profile = session?.user?.user_metadata;
            if (profile?.is_paid) setIsActualPaidUser(true);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user?.user_metadata?.is_paid) setIsActualPaidUser(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsActualPaidUser(false);
        setBetaExpiry(null);
        localStorage.removeItem('beta_unlock_expires_at');
    };

    const upgradeToPro = async () => {
        // Mock payment flow
        const confirmed = window.confirm("You are about to upgrade to WealthPilot Pro for ₹999/year. Proceed with payment?");
        if (confirmed) {
            toast.promise(
                new Promise((resolve) => setTimeout(resolve, 2000)),
                {
                    loading: 'Processing payment...',
                    success: () => {
                        setIsActualPaidUser(true);
                        // In a real app, update the 'profiles' table in Supabase
                        return 'Welcome to the inner circle, Pilot! Pro features unlocked.';
                    },
                    error: 'Payment failed. Please try again.',
                }
            );
        }
    };

    const redeemBetaCode = (code: string): boolean => {
        // Expected format: WP-DDMMHH-XX
        // Example: WP-040415-69
        try {
            const prefix = "WP-";
            if (!code.startsWith(prefix) || code.length < 10) return false;
            
            const parts = code.split('-');
            if (parts.length !== 3) return false;
            
            const dateStr = parts[1]; // DDMMHH
            const expectedSumStr = parts[2]; // XX
            if (dateStr.length !== 6) return false;

            const dd = parseInt(dateStr.substring(0, 2), 10);
            const mm = parseInt(dateStr.substring(2, 4), 10);
            const hh = parseInt(dateStr.substring(4, 6), 10);
            const xx = parseInt(expectedSumStr, 10);

            // Mathematical verification
            if (xx !== (dd + mm + hh) * 3) {
                return false;
            }

            // Time verification (must be roughly the same hour)
            const now = new Date();
            const currentDay = now.getDate();
            const currentMonth = now.getMonth() + 1; // 0-indexed
            const currentHour = now.getHours();

            // Allow +/- 1 hour fuzziness
            // Simplistic check without full date rollover math intentionally to keep it easy
            const isToday = (dd === currentDay && mm === currentMonth);
            const isRecentHour = Math.abs(currentHour - hh) <= 1;

            if (!isToday || !isRecentHour) {
                return false;
            }

            // Valid! Grant 1 hour from right now.
            const expiryTime = Date.now() + (60 * 60 * 1000);
            setBetaExpiry(expiryTime);
            localStorage.setItem('beta_unlock_expires_at', expiryTime.toString());
            return true;
        } catch(err) {
            return false;
        }
    };

    // Derived state
    const isEffectivelyPaidUser = isActualPaidUser || (betaExpiry !== null && betaExpiry > Date.now());

    return (
        <AuthContext.Provider value={{ user, session, loading, isPaidUser: isEffectivelyPaidUser, signOut, upgradeToPro, redeemBetaCode }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

