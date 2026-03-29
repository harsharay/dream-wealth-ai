import { supabase } from "@/lib/supabase";
import hash from "object-hash";
import type { FinancialData, FinancialMetrics } from "@/types/finance";

const isDev = import.meta.env.VITE_ENV;
const BACKEND_URL = isDev ? "http://localhost:3001" : import.meta.env.VITE_API_URL;

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

export async function fetchAIInsights(
    data: FinancialData,
    metrics: FinancialMetrics,
    userId?: string
): Promise<LLMInsightsResponse> {
    const dataHash = hash(data);

    // 1. Fetch from Backend Proxy (Backend handles cache and quota)
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

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

    const result = await res.json() as LLMInsightsResponse;

    return result;
}

