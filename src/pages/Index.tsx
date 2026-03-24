import { useState } from "react";
import type { FinancialData } from "@/types/finance";
import { calculateMetrics, defaultFinancialData } from "@/lib/financial-engine";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { MetricCards } from "@/components/MetricCards";
import { AssetChart } from "@/components/AssetChart";
import { LiabilityChart } from "@/components/LiabilityChart";
import { WarningsPanel } from "@/components/WarningsPanel";
import { FinancialForm } from "@/components/FinancialForm";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { AIChatBot } from "@/components/AIChatBot";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import {
  LayoutDashboard,
  ClipboardEdit,
  Sparkles,
  MessageSquare,
  FlaskConical,
  Compass,
} from "lucide-react";

type Tab = "dashboard" | "input" | "insights" | "chat" | "simulator";

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "input", label: "Finances", icon: ClipboardEdit },
  { id: "insights", label: "AI Insights", icon: Sparkles },
  { id: "chat", label: "AI Chat", icon: MessageSquare },
  { id: "simulator", label: "Simulator", icon: FlaskConical },
];

const Index = () => {
  const [activeTab, setActiveTab] = useState<Tab>("dashboard");
  const [financialData, setFinancialData] = useState<FinancialData>(defaultFinancialData);
  const metrics = calculateMetrics(financialData);

  const handleSaveData = (data: FinancialData) => {
    setFinancialData(data);
    setActiveTab("dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass-card border-b border-border/50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-xl font-bold text-foreground">WealthPilot</h1>
              <p className="text-xs text-muted-foreground">AI-Powered Financial Health</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-1 p-1 rounded-xl neu-pressed">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "neu-flat bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-[73px] z-40 glass-card border-b border-border/50 overflow-x-auto">
        <div className="flex gap-1 p-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "neu-flat bg-primary text-primary-foreground"
                  : "text-muted-foreground"
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {activeTab === "dashboard" && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <MetricCards metrics={metrics} />
              </div>
              <HealthScoreGauge score={metrics.healthScore} />
            </div>
            <WarningsPanel warnings={metrics.warnings} />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AssetChart assets={financialData.assets} />
              <LiabilityChart liabilities={financialData.liabilities} />
            </div>
          </>
        )}

        {activeTab === "input" && (
          <div className="max-w-2xl mx-auto">
            <FinancialForm data={financialData} onSave={handleSaveData} />
          </div>
        )}

        {activeTab === "insights" && (
          <AIInsightsPanel metrics={metrics} data={financialData} />
        )}

        {activeTab === "chat" && <AIChatBot />}

        {activeTab === "simulator" && <ScenarioSimulator data={financialData} />}
      </main>
    </div>
  );
};

export default Index;
