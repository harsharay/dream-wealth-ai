import { supabase } from "@/lib/supabase";
import hash from "object-hash";
import type { FinancialData, FinancialMetrics } from "@/types/finance";

const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

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

    // 1. Check Supabase Cache if userId is provided
    if (userId) {
        try {
            const { data: cached, error } = await supabase
                .from("ai_insights_cache")
                .select("insight_data")
                .eq("user_id", userId)
                .eq("data_hash", dataHash)
                .single();

            if (cached && !error) {
                console.log("Supabase cache hit for insights");
                return cached.insight_data as LLMInsightsResponse;
            }
        } catch (e) {
            console.warn("Supabase cache check failed", e);
        }
    }

    // 2. Fetch from Backend Proxy
    const res = await fetch(`${BACKEND_URL}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, metrics }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `Backend responded with ${res.status}`);
    }

    const result = await res.json() as LLMInsightsResponse;

    // 3. Save to Supabase Cache if userId is provided
    if (userId && result.sections) {
        supabase.from("ai_insights_cache").upsert({
            user_id: userId,
            data_hash: dataHash,
            insight_data: result,
            created_at: new Date().toISOString()
        }).then(({ error }) => {
            if (error) console.error("Failed to save insights to Supabase cache", error);
        });
    }

    return result;
}

