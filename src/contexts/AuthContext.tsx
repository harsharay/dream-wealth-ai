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
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    session: null,
    loading: true,
    isPaidUser: false,
    signOut: async () => { },
    upgradeToPro: async () => { },
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [session, setSession] = useState<Session | null>(null);
    const [loading, setLoading] = useState(true);
    const [isPaidUser, setIsPaidUser] = useState(false);

    useEffect(() => {
        // Check active sessions
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            // In a real app, you'd fetch the payment status from a 'profiles' table or Stripe
            const profile = session?.user?.user_metadata;
            if (profile?.is_paid) setIsPaidUser(true);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            setUser(session?.user ?? null);
            setLoading(false);
            if (session?.user?.user_metadata?.is_paid) setIsPaidUser(true);
        });

        return () => subscription.unsubscribe();
    }, []);

    const signOut = async () => {
        await supabase.auth.signOut();
        setIsPaidUser(false);
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
                        setIsPaidUser(true);
                        // In a real app, update the 'profiles' table in Supabase
                        return 'Welcome to the inner circle, Pilot! Pro features unlocked.';
                    },
                    error: 'Payment failed. Please try again.',
                }
            );
        }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, isPaidUser, signOut, upgradeToPro }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);

