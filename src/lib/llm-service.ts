import { supabase } from "@/lib/supabase";
import hash from "object-hash";
import type { FinancialData, FinancialMetrics } from "@/types/finance";

const isDev = import.meta.env.VITE_ENV === 'dev';
const BACKEND_URL = isDev ? "http://localhost:3001" : (import.meta.env.VITE_API_URL || "http://localhost:3001");

export interface InsightSection {
    title: string;
    emoji: string;
    bullet: string;
    bgColor: string;
    items: string[];
}

export interface LLMInsightsResponse {
    sections: InsightSection[];
    warnings: string[];
    timestamp: number;
}

const getAuthToken = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || "";
};

export async function fetchAIInsights(
    data: FinancialData,
    metrics: FinancialMetrics
): Promise<LLMInsightsResponse> {
    const dataHash = hash(data);
    const token = await getAuthToken();

    const res = await fetch(`${BACKEND_URL}/api/insights`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ data, metrics, dataHash }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.message || err.error || `Backend responded with ${res.status}`);
    }

    return await res.json() as LLMInsightsResponse;
}

export async function saveFinancialRecords(data: FinancialData): Promise<void> {
    const token = await getAuthToken();
    const res = await fetch(`${BACKEND_URL}/api/financial-records`, {
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error("Failed to save financial records securely.");
}

export async function loadFinancialRecords(): Promise<FinancialData | null> {
    const token = await getAuthToken();
    const res = await fetch(`${BACKEND_URL}/api/financial-records`, {
        headers: { "Authorization": `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("Failed to load records securely.");
    return await res.json();
}
