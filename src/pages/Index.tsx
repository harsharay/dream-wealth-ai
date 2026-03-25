import { useState, useEffect } from "react";
import type { FinancialData } from "@/types/finance";
import { calculateMetrics, emptyFinancialData } from "@/lib/financial-engine";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { MetricCards } from "@/components/MetricCards";
import { AssetChart } from "@/components/AssetChart";
import { LiabilityChart } from "@/components/LiabilityChart";
import { WarningsPanel } from "@/components/WarningsPanel";
import { FinancialForm } from "@/components/FinancialForm";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { PremiumUpsell } from "@/components/PremiumUpsell";
import {
  LayoutDashboard,
  Sparkles,
  FlaskConical,
  Compass,
  ArrowLeft,
} from "lucide-react";

type DashboardTab = "overview" | "insights" | "simulator";

const DASHBOARD_TABS: { id: DashboardTab; label: string; icon: React.ElementType }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "insights", label: "AI Insights", icon: Sparkles },
  { id: "simulator", label: "Simulator", icon: FlaskConical },
];

const Index = () => {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab>(null);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dashboardTab]);


  const handleSaveData = (data: FinancialData) => {
    setFinancialData(data);
    setDashboardTab("overview");
  };

  const handleReset = () => {
    setFinancialData(null);
  };

  // Show input form if no data submitted yet
  if (!financialData) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b-2 border-foreground bg-card">
          <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
              style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}>
              <Compass className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-sans text-2xl font-bold text-foreground">WealthPilot</h1>
              <p className="text-sm text-muted-foreground font-medium">AI-Powered Financial Health Check</p>
            </div>
          </div>
        </header>

        <main className="max-w-3xl mx-auto px-4 py-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-foreground mb-2">Enter your finances</h2>
            <p className="text-muted-foreground">
              Fill in your details below. We'll analyze everything and give you a brutally honest financial diagnosis.
            </p>
          </div>
          <FinancialForm data={emptyFinancialData} onSave={handleSaveData} />
        </main>
      </div>
    );
  }

  const metrics = calculateMetrics(financialData);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b-2 border-foreground bg-card">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
              style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-sans text-xl font-bold text-foreground">WealthPilot</h1>
              <p className="text-xs text-muted-foreground font-medium">Your Financial Report</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 p-1 rounded-lg border-2 border-foreground bg-muted">
              {DASHBOARD_TABS.map((tab) => {
                const isComingSoon = tab.id === "simulator";
                return (
                  <button
                    key={tab.id}
                    onClick={() => !isComingSoon && setDashboardTab(tab.id)}
                    disabled={isComingSoon}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${dashboardTab === tab.id
                      ? "bg-primary text-primary-foreground border-2 border-foreground"
                      : isComingSoon
                        ? "text-muted-foreground/50 cursor-not-allowed opacity-60"
                        : "text-muted-foreground hover:text-foreground"
                      }`}
                    style={dashboardTab === tab.id ? { boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" } : {}}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                    {isComingSoon && (
                      <span className="ml-1 px-1.5 py-0.5 rounded bg-muted text-[10px] uppercase tracking-tighter border border-foreground/10">
                        Soon
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleReset}
              className="nb-button text-sm px-4 py-2 flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Nav */}
      <nav className="md:hidden sticky top-[65px] z-40 border-b-2 border-foreground bg-card overflow-x-auto">
        <div className="flex gap-1 p-2">
          {DASHBOARD_TABS.map((tab) => {
            const isComingSoon = tab.id === "simulator";
            return (
              <button
                key={tab.id}
                onClick={() => !isComingSoon && setDashboardTab(tab.id)}
                disabled={isComingSoon}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-bold whitespace-nowrap transition-all border-2 ${dashboardTab === tab.id
                  ? "bg-primary text-primary-foreground border-foreground"
                  : isComingSoon
                    ? "text-muted-foreground/50 border-transparent opacity-60"
                    : "text-muted-foreground border-transparent"
                  }`}
              >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
                {isComingSoon && (
                  <span className="ml-1 px-1 py-0 rounded bg-muted text-[8px] uppercase border border-foreground/10">
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {dashboardTab === "overview" && (
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

        {dashboardTab === "insights" && (
          <div className="space-y-6">
            <AIInsightsPanel metrics={metrics} data={financialData} />
            <PremiumUpsell />
          </div>
        )}

        {dashboardTab === "simulator" && <ScenarioSimulator data={financialData} />}
      </main>
    </div>
  );
};

export default Index;
