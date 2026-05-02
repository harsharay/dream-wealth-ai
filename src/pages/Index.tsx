import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { AuthForm } from "@/components/AuthForm";
import { toast } from "sonner";
import type { FinancialData } from "@/types/finance";
import { saveFinancialRecords, loadFinancialRecords } from "@/lib/llm-service";
import { calculateMetrics, emptyFinancialData } from "@/lib/financial-engine";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { MetricCards } from "@/components/MetricCards";
import { AssetChart } from "@/components/AssetChart";
import { LiabilityChart } from "@/components/LiabilityChart";
import { WarningsPanel } from "@/components/WarningsPanel";
import { FinancialForm } from "@/components/FinancialForm";
import { FinancialChatOnboarding } from "@/components/FinancialChatOnboarding";
import { AIInsightsPanel } from "@/components/AIInsightsPanel";
import { ScenarioSimulator } from "@/components/ScenarioSimulator";
import { SimulatorLockScreen } from "@/components/SimulatorLockScreen";
import { ProUpgradeModal } from "@/components/ProUpgradeModal";
import { ActionTracker } from "@/components/ActionTracker";
import { PremiumUpsell } from "@/components/PremiumUpsell";
import {
  LayoutDashboard,
  Sparkles,
  FlaskConical,
  Compass,
  ArrowLeft,
  LogOut,
  Loader2,
  PlusCircle,
  PencilLine,
  ChevronUp,
  ChevronDown,
  Moon,
  Sun,
  MessageSquare,
  TableProperties,
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
  const [onboardingMode, setOnboardingMode] = useState<"welcome" | "chat" | "form" | null>(null);
  const [chatDraftData, setChatDraftData] = useState<FinancialData | null>(null);
  const [activeMissionId, setActiveMissionId] = useState<string | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'dark' || stored === 'light') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const fetchedRef = useRef(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Fetch data from Supabase on load
  const fetchData = useCallback(async () => {
    // If we're already fetching, or we're in edit mode, or we've already fetched, don't sync.
    if (!user || fetchedRef.current || isEditing) return;

    setFetchingData(true);
    try {
      const data = await loadFinancialRecords();
      if (data) {
        setFinancialData(data);
        setDashboardTab("overview");
        fetchedRef.current = true;
      } else {
        // No saved data — show the welcome chooser
        setOnboardingMode("welcome");
      }
    } catch (err) {
      console.warn("Fetch error or no records:", err);
      setOnboardingMode("welcome");
    } finally {
      setFetchingData(false);
    }
  }, [user, isEditing]);

  useEffect(() => {
    fetchData();
  }, [user, fetchData]);

  // Apply theme class
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Auto-scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [dashboardTab]);

  const handleSaveData = async (data: FinancialData) => {
    if (!user) return;

    try {
      await saveFinancialRecords(data);
      setFinancialData(data);
      setIsEditing(false);
      setOnboardingMode(null);
      setChatDraftData(null);
      setDashboardTab("overview");
      toast.success("Coordinates updated securely, Pilot!");
    } catch (error: unknown) {
      toast.error("Telemetry failure: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  };

  // Called when the chat completes — move to Review step (FinancialForm in collapsed mode)
  const handleChatDone = (data: FinancialData) => {
    setChatDraftData(data);
    setOnboardingMode("form");
  };

  const handleEdit = () => {
    setIsEditing(true);
    setOnboardingMode(null);
    setChatDraftData(null);
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
    setOnboardingMode("welcome");
    setChatDraftData(null);
    fetchedRef.current = false;
    setIsMobileMenuOpen(false);
  };

  // The full-page "Authenticating" screen should only show on initial auth.
  // Data synchronization should be non-blocking to prevent UI unmounting and data loss.
  if (authLoading && !user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <p className="font-bold text-muted-foreground animate-pulse text-sm">
          Authenticating Pilot...
        </p>
      </div>
    );
  }

  if (!user) {
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
        <AuthForm />
      </div>
    );
  }

  if (!financialData || isEditing) {
    // Shared top bar for the onboarding/editing screens
    const OnboardingTopBar = () => (
      <div className="w-full max-w-4xl flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center relative"
            style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
            <Compass className="w-5 h-5 text-primary-foreground" />
            {fetchingData && (
              <div className="absolute -top-1 -right-1 bg-background border border-foreground rounded-full p-0.5">
                <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
              </div>
            )}
          </div>
          <h1 className="font-sans text-2xl font-bold text-foreground">WealthPilot</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="nb-button-outline p-2 mr-2"
            title="Toggle Theme"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          {(isEditing || onboardingMode === "chat" || onboardingMode === "form") && (
            <button
              onClick={() => {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  setOnboardingMode("welcome");
                  setChatDraftData(null);
                }
              }}
              className="nb-button-outline px-4 py-2 text-sm font-bold flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> {isEditing ? "Cancel" : "Back"}
            </button>
          )}
          <button onClick={() => signOut()} className="nb-button-outline text-danger border-danger/50 p-2" title="Sign Out">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    );

    return (
      <div className="min-h-screen bg-background p-4 flex flex-col items-center relative overflow-hidden">
        {fetchingData && (
          <div className="absolute top-0 left-0 right-0 h-1 z-50 overflow-hidden bg-muted">
            <div className="h-full bg-primary animate-progress-indeterminate shadow-[0_0_10px_rgba(var(--primary),0.5)]" />
          </div>
        )}

        <OnboardingTopBar />

        {/* ── Welcome chooser ─────────────────────────────────────────── */}
        {!isEditing && onboardingMode === "welcome" && (
          <div className="w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-400">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-black text-foreground mb-2">
                Welcome, {user.user_metadata.full_name?.split(" ")[0] || "Pilot"}! 👋
              </h2>
              <p className="text-muted-foreground font-medium">
                How would you like to set up your financial profile?
              </p>
            </div>

            <div className="space-y-4">
              {/* Quick Start — primary choice */}
              <button
                type="button"
                onClick={() => setOnboardingMode("chat")}
                className="w-full nb-card hover:bg-muted/60 transition-colors text-left flex items-start gap-4 group"
                style={{ boxShadow: "4px 4px 0px 0px hsl(var(--foreground))" }}
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-primary border-2 border-foreground flex items-center justify-center"
                  style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
                  <MessageSquare className="w-6 h-6 text-primary-foreground" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-foreground text-lg">Quick Start</span>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-accent/20 text-accent border border-accent/30">
                      Recommended
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Answer a few quick questions in a guided chat. Takes about 2 minutes with smart defaults pre-filled for you.
                  </p>
                </div>
              </button>

              {/* Manual / Advanced */}
              <button
                type="button"
                onClick={() => setOnboardingMode("form")}
                className="w-full nb-card hover:bg-muted/60 transition-colors text-left flex items-start gap-4 group"
                style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}
              >
                <div className="shrink-0 w-12 h-12 rounded-xl bg-muted border-2 border-foreground flex items-center justify-center"
                  style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
                  <TableProperties className="w-6 h-6 text-foreground" />
                </div>
                <div className="flex-1">
                  <span className="font-black text-foreground text-lg block mb-1">Enter Manually</span>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Fill in all fields directly. Great if you have your numbers handy and want full control.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Chat onboarding ──────────────────────────────────────────── */}
        {!isEditing && onboardingMode === "chat" && (
          <div className="w-full max-w-xl animate-in fade-in duration-300">
            <FinancialChatOnboarding onDone={handleChatDone} />
          </div>
        )}

        {/* ── Manual form / Review after chat ─────────────────────────── */}
        {(isEditing || onboardingMode === "form") && (
          <div className="w-full max-w-4xl">
            <div className="mb-8 p-6 bg-accent/10 border-2 border-dashed border-foreground/20 rounded-xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-black text-foreground mb-1">
                  {isEditing ? "Modify the numbers" : chatDraftData ? "Review your data" : `Welcome, ${user.user_metadata.full_name || 'Pilot'}!`}
                </h2>
                <p className="text-muted-foreground font-medium">
                  {isEditing
                    ? "Update your numbers for a fresh diagnostic report."
                    : chatDraftData
                    ? "Your answers have been pre-filled. Expand any section to fine-tune, then hit go."
                    : "Enter your financial data to receive your first AI prognosis."
                  }
                </p>
              </div>
              {isEditing
                ? <PencilLine className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/20 rotate-12" />
                : <Sparkles className="absolute -right-4 -bottom-4 w-24 h-24 text-accent/20 rotate-12" />
              }
            </div>
            <FinancialForm
              data={chatDraftData ?? financialData ?? emptyFinancialData}
              onSave={handleSaveData}
              startCollapsed={!!chatDraftData && !isEditing}
            />
          </div>
        )}

        {/* Loading state while fetching — no onboarding mode determined yet */}
        {!isEditing && onboardingMode === null && !fetchingData && (
          <div className="w-full max-w-lg animate-in fade-in">
            <div className="nb-card text-center py-12 space-y-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-sm font-bold text-muted-foreground">Loading your data…</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  const metrics = calculateMetrics(financialData);

  return (
    <div className={`min-h-screen pb-20 relative ${theme === 'light' ? '' : 'bg-background'}`}>
      {fetchingData && (
        <div className="fixed top-0 left-0 right-0 h-1 z-[100] overflow-hidden bg-muted/20">
          <div className="h-full bg-primary animate-progress-indeterminate shadow-[0_0_8px_rgba(var(--primary),0.5)]" />
        </div>
      )}
      {/* Star Background Overlay */}
      <div className="absolute inset-0 z-0 opacity-20 pointer-events-none bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+CiAgPHJlY3Qgd2lkdGg9IjIwIiBoZWlnaHQ9IjIwIiBmaWxsPSJub25lIj48L3JlY3Q+CiAgPGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjEiIGZpbGw9IiNmZmZmZmYiPjwvY2lyY2xlPgo8L3N2Zz4=')] bg-repeat" />
      
      <div className="relative z-10">
        {/* Header */}
        <header className="glass-header p-4 md:px-8">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-center justify-between w-full lg:w-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary border-2 border-foreground flex items-center justify-center relative"
                style={{ boxShadow: "2px 2px 0px 0px hsl(var(--foreground))" }}>
                <Compass className="w-5 h-5 text-primary-foreground" />
                {fetchingData && (
                  <div className="absolute -top-1 -right-1 bg-background border border-foreground rounded-full p-0.5">
                    <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="font-sans text-2xl font-bold text-foreground leading-tight">WealthPilot</h1>
                {!isPaidUser && (
                  <button 
                    onClick={() => setIsUpgradeModalOpen(true)} 
                    className="text-[10px] font-black uppercase text-primary hover:underline flex items-center gap-1"
                  >
                    Upgrade to Pro <ChevronUp className="w-2 h-2" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 lg:hidden">
              <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                className="nb-button-outline p-2"
                title="Toggle Theme"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
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

          <nav className="grid grid-cols-3 lg:flex w-full lg:w-auto bg-muted p-1 rounded-xl border-2 border-foreground no-scrollbar gap-1">
            {DASHBOARD_TABS.map((tab) => {
              const isActive = dashboardTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDashboardTab(tab.id)}
                  className={`flex items-center justify-center lg:justify-start gap-1.5 px-1.5 lg:px-5 py-2 rounded-lg font-bold transition-all whitespace-nowrap shrink-0 ${isActive
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <tab.icon className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                  <span className="text-[10px] sm:text-xs lg:text-sm">{tab.label}</span>
                  {tab.premium && (
                    <span className={`text-[8px] lg:text-[9px] px-1 lg:px-1.5 py-0.5 rounded border ${isPaidUser ? "bg-success/20 text-success border-success/30" : "bg-accent/20 border-foreground/30"} ${isActive ? "text-[white]" : "text-[black]"}`}>
                      PRO
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="nb-button-outline p-2 mr-2"
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
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
            <div className="space-y-8">
              {!isPaidUser ? (
                <SimulatorLockScreen />
              ) : (
                <ScenarioSimulator 
                  data={financialData} 
                  focusedMissionId={activeMissionId} 
                  onMissionCleared={() => setActiveMissionId(null)}
                />
              )}
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
    <ProUpgradeModal isOpen={isUpgradeModalOpen} onClose={() => setIsUpgradeModalOpen(false)} />
  </div>
);
};

export default Index;
