import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { toast } from "sonner";
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
  LogOut,
  Loader2,
  Lock,
  PlusCircle,
  PencilLine,
  ChevronUp,
  ChevronDown,
  Menu,
  X,
} from "lucide-react";

type DashboardTab = "overview" | "insights" | "simulator";

const DASHBOARD_TABS: { id: DashboardTab; label: string; icon: React.ElementType; premium?: boolean }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "insights", label: "AI Insights", icon: Sparkles },
  { id: "simulator", label: "Simulator", icon: FlaskConical, premium: true },
];

const Index = () => {
  const { user, loading: authLoading, isPaidUser, signOut, upgradeToPro } = useAuth();
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [dashboardTab, setDashboardTab] = useState<DashboardTab | null>(null);
  const [fetchingData, setFetchingData] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const fetchedRef = useRef(false);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dashboardTab]);

  // Fetch data from Supabase on load - Optimized to prevent redundant calls
  useEffect(() => {
    const fetchData = async () => {
      if (!user || fetchedRef.current) return;

      setFetchingData(true);
      try {
        const { data, error } = await supabase
          .from("financial_records")
          .select("*")
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false })
          .limit(1)
          .single();

        if (data && !error) {
          setFinancialData({
            monthlyIncome: data.monthly_income,
            expenses: data.expenses as any,
            assets: data.assets as any,
            liabilities: data.liabilities as any,
            riskAppetite: data.risk_appetite as any,
          });
          setDashboardTab("overview");
          fetchedRef.current = true;
        }
      } catch (err) {
        console.warn("Fetch error or no records:", err);
      } finally {
        setFetchingData(false);
      }
    };

    if (user) fetchData();
  }, [user]);

  const handleSaveData = async (data: FinancialData) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("financial_records").upsert({
        user_id: user.id,
        monthly_income: data.monthlyIncome,
        expenses: data.expenses,
        assets: data.assets,
        liabilities: data.liabilities,
        risk_appetite: data.riskAppetite,
        updated_at: new Date().toISOString(),
      });

      if (error) throw error;

      setFinancialData(data);
      setIsEditing(false);
      setDashboardTab("overview");
      toast.success("Coordinates updated, Pilot!");
    } catch (error: any) {
      toast.error("Telemetry failure: " + error.message);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleNewReport = () => {
    if (!isPaidUser) {
      toast.error("Free accounts are limited to 1 report.", {
        description: "Upgrade to Pro for unlimited financial tracking.",
        action: {
          label: "Upgrade",
          onClick: () => { }
        }
      });
      return;
    }
    setFinancialData(null);
    setIsEditing(false);
    fetchedRef.current = false; // Allow fresh fetch if they change their mind
    setIsMobileMenuOpen(false);
  };

  if (authLoading || (fetchingData && !fetchedRef.current)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground animate-pulse">
          {authLoading ? "Authenticating..." : "Synchronizing cloud data..."}
        </p>
      </div>
    );
  }

  // Show login if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center">
        <div className="mt-12 flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
            style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}>
            <Compass className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="font-sans text-3xl font-bold text-foreground">WealthPilot</h1>
        </div>
        <AuthForm />
      </div>
    );
  }

  // Show input form if no data or explicitly editing
  if (!financialData || isEditing) {
    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center">
        <div className="w-full max-w-4xl flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
              style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
              <Compass className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-sans text-2xl font-bold text-foreground">WealthPilot</h1>
          </div>
          <div className="flex gap-2">
            {isEditing && (
              <button
                onClick={() => setIsEditing(false)}
                className="nb-button-outline px-4 py-2 text-sm font-bold flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Cancel
              </button>
            )}
            <button onClick={() => signOut()} className="nb-button-outline text-danger border-danger/50 p-2" title="Sign Out">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="w-full max-w-4xl">
          <div className="mb-8 p-6 bg-accent/10 border-2 border-dashed border-foreground/20 rounded-xl relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-2xl font-black text-foreground mb-1">
                {isEditing ? "Modify Coordinates" : `Welcome, ${user.user_metadata.full_name || 'Pilot'}!`}
              </h2>
              <p className="text-muted-foreground font-medium">
                {isEditing
                  ? "Update your numbers for a fresh diagnostic report."
                  : "Enter your financial data to receive your first AI prognosis."
                }
              </p>
            </div>
            {isEditing ? <PencilLine className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/20 rotate-12" /> : <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/20 rotate-12" />}
          </div>
          <FinancialForm data={financialData || emptyFinancialData} onSave={handleSaveData} />
        </div>
      </div>
    );
  }

  const metrics = calculateMetrics(financialData);

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="glass-header p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center"
                style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
                <Compass className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="font-sans text-2xl font-bold text-foreground leading-tight">WealthPilot</h1>
                {!isPaidUser && (
                  <button onClick={() => {
                    // upgradeToPro();
                  }} className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1">
                    Upgrade to Pro <ChevronUp className="w-2 h-2" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="nb-button-outline p-2 transition-transform duration-200"
                style={{ transform: isMobileMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}
              >
                <ChevronDown className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Mobile Actions Menu */}
          {isMobileMenuOpen && (
            <div className="lg:hidden flex flex-col gap-2 p-2 bg-muted/30 rounded-xl border-2 border-foreground animate-in slide-in-from-top-2">
              <button
                onClick={handleNewReport}
                className="flex items-center gap-3 px-4 py-3 font-bold text-sm nb-button-outline bg-secondary/10 w-full"
              >
                <PlusCircle className="w-5 h-5" /> New Report
              </button>
              <button
                onClick={() => {
                  handleEdit();
                  setIsMobileMenuOpen(false);
                }}
                className="flex items-center gap-3 px-4 py-3 font-bold text-sm nb-button-outline w-full"
              >
                <PencilLine className="w-5 h-5" /> Edit Data
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-3 px-4 py-3 font-bold text-sm nb-button-outline text-danger border-danger/30 w-full"
              >
                <LogOut className="w-5 h-5" /> Log Out
              </button>
            </div>
          )}

          <nav className="flex w-full lg:w-auto bg-muted p-1 rounded-xl border-2 border-foreground overflow-x-auto no-scrollbar justify-between lg:justify-start">
            {DASHBOARD_TABS.map((tab) => {
              const isActive = dashboardTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDashboardTab(tab.id)}
                  className={`flex items-center gap-2 px-2 lg:px-5 py-2 rounded-lg font-bold transition-all whitespace-nowrap ${isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="text-sm">{tab.label}</span>
                  {tab.premium && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border ${isPaidUser ? "bg-success/20 text-success border-success/30" : "bg-accent/20 border-foreground/30"} ${isActive ? "text-[white]" : "text-[black]"}`}>
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={handleNewReport}
              className="flex justify-center items-center flex-wrap nb-button-outline flex items-center gap-2 px-4 py-2 font-bold text-sm bg-secondary/10"
            >
              <PlusCircle className="w-4 h-4" /> New Report
            </button>
            <button
              onClick={handleEdit}
              className="nb-button-outline flex items-center gap-2 px-4 py-2 font-bold text-sm"
            >
              <PencilLine className="w-4 h-4" /> Edit Data
            </button>
            <button onClick={() => signOut()} className="nb-button-outline flex items-center gap-2 px-4 py-2 font-bold text-sm text-danger border-danger/30 hover:bg-danger/5 group">
              <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
              Log Out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {dashboardTab === "overview" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
              <div className="lg:col-span-4 flex w-full">
                <div className="w-full">
                  <HealthScoreGauge score={metrics.healthScore} />
                </div>
              </div>
              <div className="lg:col-span-8 flex">
                <MetricCards metrics={metrics} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AssetChart assets={financialData.assets} />
              <LiabilityChart liabilities={financialData.liabilities} />
            </div>

            <WarningsPanel warnings={metrics.warnings} setRedirect={() => setDashboardTab("insights")} />
          </div>
        )}

        {dashboardTab === "insights" && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <AIInsightsPanel metrics={metrics} data={financialData} />
          </div>
        )}

        {dashboardTab === "simulator" && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-500 relative">
            {!isPaidUser && (
              <div className="absolute inset-0 z-10 backdrop-blur-[2px] bg-background/40 flex items-center justify-center p-6 border-4 border-dashed border-foreground/10 rounded-3xl">
                <div className="nb-card max-w-md text-center p-8 bg-card shadow-[8px 8px 0px 0px_rgba(0,0,0,1)]">
                  <div className="w-16 h-16 bg-accent/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Lock className="w-8 h-8 text-accent" />
                  </div>
                  <h3 className="text-2xl font-black text-foreground mb-3">Simulator is locked</h3>
                  <p className="text-muted-foreground font-medium mb-8">
                    Upgrade to **WealthPilot Pro** to run unlimited "What If" scenarios and test your financial strategies.
                  </p>
                  <button onClick={e => {
                    // e.preventDefault();
                    // upgradeToPro();
                  }} className="nb-button w-full">
                    {/* Unlock Now — ₹999/yr */}
                    Coming Soon
                  </button>
                </div>
              </div>
            )}
            <div className={!isPaidUser ? "opacity-30 pointer-events-none grayscale-[0.5]" : ""}>
              <ScenarioSimulator data={financialData} />
            </div>
          </div>
        )}

        {!isPaidUser && (
          <div className="mt-12">
            <PremiumUpsell />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
