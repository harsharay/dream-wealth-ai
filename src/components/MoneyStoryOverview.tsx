import { useState } from "react";
import type { BackendFinancialMetrics, FinancialData, FinancialMetrics } from "@/types/finance";
import { buildMoneyStory } from "@/lib/money-story";
import { formatCurrency, SCORE_PILLAR_LABELS } from "@/lib/financial-engine";
import { MoneyStoryHero } from "@/components/MoneyStoryHero";
import { FinanceCheckupList } from "@/components/FinanceCheckupList";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { EmergencyBufferGauge } from "@/components/EmergencyBufferGauge";
import { FIProgressWidget } from "@/components/FIProgressWidget";
import { EmiStressGauge } from "@/components/EmiStressGauge";
import { MoneyFlowSankey } from "@/components/MoneyFlowSankey";
import { AssetChart } from "@/components/AssetChart";
import { LiabilityChart } from "@/components/LiabilityChart";
import { MobileMoneyStoryOverview } from "@/components/mweb/MobileMoneyStoryOverview";
import { useMinWidth } from "@/hooks/use-min-width";
import {
  ChevronDown,
  Gamepad2,
  Sparkles,
  PencilLine,
} from "lucide-react";

interface MoneyStoryOverviewProps {
  data: FinancialData;
  metrics: FinancialMetrics;
  backendMetrics: BackendFinancialMetrics;
  isPaidUser: boolean;
  onOpenInsights: () => void;
  onOpenSimulator: () => void;
  onUpgrade: () => void;
  onRefineScore?: () => void;
}

export function MoneyStoryOverview({
  data,
  metrics,
  backendMetrics,
  isPaidUser,
  onOpenInsights,
  onOpenSimulator,
  onUpgrade,
  onRefineScore,
}: MoneyStoryOverviewProps) {
  const isDesktop = useMinWidth(1024);
  const story = buildMoneyStory(data, metrics, backendMetrics);
  const [numbersOpen, setNumbersOpen] = useState(false);
  const emiPct = (Number.isFinite(backendMetrics.emiStressRatio) ? backendMetrics.emiStressRatio : 0) * 100;

  const showRefine =
    Boolean(onRefineScore) &&
    ((data.monthlyInvestments ?? 0) <= 0 || metrics.scoreBreakdownMeta.investingEstimated);

  const proof = [
    {
      label: "Net worth",
      value: formatCurrency(metrics.netWorth),
      icon: "wallet" as const,
      tone: "purple" as const,
    },
    {
      label: "Savings rate",
      value: `${metrics.savingsRate.toFixed(1)}%`,
      icon: "percent" as const,
      tone: "green" as const,
    },
    {
      label: "EMI stress",
      value: `${emiPct.toFixed(1)}%`,
      icon: "activity" as const,
      tone: "orange" as const,
    },
  ];

  if (!isDesktop) {
    return (
      <MobileMoneyStoryOverview
        data={data}
        metrics={metrics}
        backendMetrics={backendMetrics}
        isPaidUser={isPaidUser}
        onOpenInsights={onOpenInsights}
        onOpenSimulator={onOpenSimulator}
        onUpgrade={onUpgrade}
        onRefineScore={onRefineScore}
      />
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MoneyStoryHero
        healthScore={story.healthScore}
        healthLabel={story.healthLabel}
        headline={story.headline}
        metrics={proof}
      />

      {showRefine && (
        <div
          className="rounded-lg border-2 border-foreground bg-card px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
          style={{ boxShadow: "3px 3px 0px 0px hsl(var(--foreground))" }}
        >
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              Refine your score
            </p>
            <p className="text-sm font-medium text-foreground mt-0.5">
              Add your monthly SIP / NPS — {SCORE_PILLAR_LABELS.investing.toLowerCase()} is estimated
              until you do.
            </p>
          </div>
          <button
            type="button"
            onClick={onRefineScore}
            className="nb-button-outline shrink-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-bold"
          >
            <PencilLine className="w-4 h-4" />
            Add details
          </button>
        </div>
      )}

      <FinanceCheckupList items={story.checkup} />

      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onOpenInsights}
          className="nb-button-primary flex-1 flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Full AI diagnosis
        </button>
        {isPaidUser ? (
          <button
            type="button"
            onClick={onOpenSimulator}
            className="nb-button-outline flex-1 flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-4 h-4 text-success" />
            Continue Wealth Quest
          </button>
        ) : (
          <button
            type="button"
            onClick={onUpgrade}
            className="nb-button-secondary flex-1 flex items-center justify-center gap-2"
          >
            <Gamepad2 className="w-4 h-4" />
            Unlock Wealth Quest
          </button>
        )}
      </div>

      <section className="nb-card relative overflow-hidden p-0">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(90deg, hsl(var(--primary) / 0.55) 0%, transparent 48%), linear-gradient(270deg, hsl(var(--accent) / 0.5) 0%, transparent 48%), radial-gradient(circle at 18% 50%, hsl(var(--primary)) 0%, transparent 42%), radial-gradient(circle at 82% 50%, hsl(var(--accent)) 0%, transparent 42%)",
          }}
        />
        <button
          type="button"
          onClick={() => setNumbersOpen((v) => !v)}
          className="relative w-full px-6 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
          aria-expanded={numbersOpen}
        >
          <div className="text-left">
            <h3 className="text-sm font-black uppercase tracking-wider text-foreground">
              See the numbers
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              Charts and gauges — optional deep dive
            </p>
          </div>
          <ChevronDown
            className={`w-5 h-5 text-muted-foreground transition-transform ${numbersOpen ? "rotate-180" : ""}`}
          />
        </button>

        {numbersOpen && (
          <div className="relative px-4 md:px-6 pb-6 pt-2 border-t-2 border-foreground/10 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <div className="lg:col-span-6">
                <HealthScoreGauge
                  score={metrics.healthScore}
                  breakdown={metrics.scoreBreakdown}
                  breakdownMeta={metrics.scoreBreakdownMeta}
                />
              </div>
              <div className="lg:col-span-6">
                <EmergencyBufferGauge emergencyBufferMonths={backendMetrics.emergencyBufferMonths} />
              </div>

              {backendMetrics.fiMetricAvailable &&
                backendMetrics.fiRatio !== null &&
                backendMetrics.investedAssets !== null &&
                backendMetrics.targetRetirementCorpus !== null && (
                  <div className="lg:col-span-6">
                    <FIProgressWidget
                      fiRatio={backendMetrics.fiRatio}
                      investedAssets={backendMetrics.investedAssets}
                      targetRetirementCorpus={backendMetrics.targetRetirementCorpus}
                      estimatedRetirementAge={backendMetrics.estimatedRetirementAge}
                    />
                  </div>
                )}
              <div className="lg:col-span-6">
                <EmiStressGauge emiStressRatio={backendMetrics.emiStressRatio} />
              </div>

              <div className="lg:col-span-12">
                <MoneyFlowSankey data={data} />
              </div>

              <div className="lg:col-span-6 h-full">
                <AssetChart assets={data.assets} customAssets={data.customAssets} />
              </div>
              <div className="lg:col-span-6 h-full">
                <LiabilityChart
                  liabilities={data.liabilities}
                  customLiabilities={data.customLiabilities}
                />
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
