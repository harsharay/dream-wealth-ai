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
    metrics: FinancialMetrics
): Promise<LLMInsightsResponse> {
    const res = await fetch(`${BACKEND_URL}/api/insights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, metrics }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(err.error ?? `Backend responded with ${res.status}`);
    }

    return res.json() as Promise<LLMInsightsResponse>;
}
