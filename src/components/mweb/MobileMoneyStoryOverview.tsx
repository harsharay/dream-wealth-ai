import { useMemo, useState } from "react";
import type { BackendFinancialMetrics, FinancialData, FinancialMetrics } from "@/types/finance";
import type { CheckupItem, CheckupStatus } from "@/lib/money-story";
import { buildMoneyStory } from "@/lib/money-story";
import { formatCurrency, getScoreColor } from "@/lib/financial-engine";
import { HealthScoreGauge } from "@/components/HealthScoreGauge";
import { EmergencyBufferGauge } from "@/components/EmergencyBufferGauge";
import { FIProgressWidget } from "@/components/FIProgressWidget";
import { EmiStressGauge } from "@/components/EmiStressGauge";
import { AssetChart } from "@/components/AssetChart";
import { LiabilityChart } from "@/components/LiabilityChart";
import { CyclicChartDeck, type CyclicChartCard } from "@/components/mweb/CyclicChartDeck";
import { MobileMoneyFlowCard } from "@/components/mweb/MobileMoneyFlowCard";
import { MobileProCard } from "@/components/mweb/MobileProCard";
import {
  Activity,
  ArrowRight,
  BarChart3,
  ChevronRight,
  NotebookText,
  Percent,
  PieChart,
  Repeat,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
} from "lucide-react";

interface MobileMoneyStoryOverviewProps {
  data: FinancialData;
  metrics: FinancialMetrics;
  backendMetrics: BackendFinancialMetrics;
  isPaidUser: boolean;
  onOpenInsights: () => void;
  onOpenSimulator: () => void;
  onUpgrade: () => void;
  onRefineScore?: () => void;
}

const CARD = "rounded-2xl border border-neutral-200/80 dark:border-white/10 bg-card";
const DIVIDER = "border-t border-neutral-100 dark:border-white/10";

function formatHeadlineLines(headline: string): string[] {
  const chunks = headline
    .split(/\s+[—–]\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  const lines: string[] = [];
  for (const chunk of chunks) {
    const sentences = chunk.split(/(?<=\.)\s+(?=[A-Z])/);
    for (const sentence of sentences) {
      const withSplit = sentence.match(/^(.{8,}?)\s+(with a\s+.+)$/i);
      if (withSplit) {
        lines.push(withSplit[1].trim());
        lines.push(capitalizeLine(withSplit[2].trim()));
        continue;
      }
      const butSplit = sentence.match(/^(.+?),\s+(but\s+.+)$/i);
      if (butSplit && butSplit[1].length > 12) {
        lines.push(butSplit[1].trim());
        lines.push(capitalizeLine(butSplit[2].trim()));
        continue;
      }
      const yetSplit = sentence.match(/^(.+?),\s+(yet\s+.+)$/i);
      if (yetSplit && yetSplit[1].length > 12) {
        lines.push(yetSplit[1].trim());
        lines.push(capitalizeLine(yetSplit[2].trim()));
        continue;
      }
      lines.push(capitalizeLine(sentence.trim()));
    }
  }
  return lines.length ? lines : [headline];
}

function capitalizeLine(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

const STATUS_UI: Record<CheckupStatus, { label: string; dot: string; text: string }> = {
  strong: { label: "Good", dot: "bg-emerald-600", text: "text-emerald-600" },
  watch: { label: "Watch", dot: "bg-orange-600", text: "text-orange-600" },
  risk: { label: "Risk", dot: "bg-red-600", text: "text-red-600" },
};

function CheckupIcon({ id, status }: { id: string; status: CheckupStatus }) {
  const tone =
    status === "strong"
      ? "bg-emerald-100 text-emerald-700"
      : status === "watch"
        ? "bg-orange-100 text-orange-600"
        : "bg-red-100 text-red-600";
  const Icon =
    id === "emergency"
      ? Shield
      : id === "debt"
        ? Shield
        : id === "spending"
          ? TrendingUp
          : id === "investing"
            ? PieChart
            : Target;

  return (
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
      <Icon className="w-4 h-4" strokeWidth={2.4} />
    </div>
  );
}

export function MobileMoneyStoryOverview({
  data,
  metrics,
  backendMetrics,
  isPaidUser,
  onOpenInsights,
  onOpenSimulator,
  onUpgrade,
  onRefineScore,
}: MobileMoneyStoryOverviewProps) {
  const story = buildMoneyStory(data, metrics, backendMetrics);
  const emiPct = (Number.isFinite(backendMetrics.emiStressRatio) ? backendMetrics.emiStressRatio : 0) * 100;
  const monthlySip = data.monthlyInvestments ?? 0;
  const [openCheckupId, setOpenCheckupId] = useState<string | null>(story.focusId || null);

  const circumference = 2 * Math.PI * 42;
  const offset = circumference - (Math.min(100, Math.max(0, story.healthScore)) / 100) * circumference;
  const scoreColor =
    story.healthScore >= 75
      ? "#059669"
      : story.healthScore >= 50
        ? "#EAB308"
        : "#DC2626";

  const headlineLines = formatHeadlineLines(story.headline);

  const proof = [
    {
      label: "Net worth",
      value: formatCurrency(metrics.netWorth),
      Icon: Wallet,
      tone: "bg-[#EDE9FE] text-[#6D28D9]",
    },
    {
      label: "Savings rate",
      value: `${metrics.savingsRate.toFixed(1)}%`,
      Icon: Percent,
      tone: "bg-[#D1FAE5] text-[#047857]",
    },
    {
      label: "EMI stress",
      value: `${emiPct.toFixed(1)}%`,
      Icon: Activity,
      tone: "bg-[#FFEDD5] text-[#C2410C]",
    },
    {
      label: "Add more data for better insights",
      value: monthlySip > 0 ? `${formatCurrency(monthlySip)}/mo` : "Add",
      Icon: Repeat,
      tone: "bg-[#DBEAFE] text-[#1D4ED8]",
      onClick: onRefineScore,
    },
  ];

  const focusItem = story.checkup.find((item) => item.id === story.focusId) ?? story.checkup[0];

  const hasAssets =
    Object.values(data.assets).some((value) => value > 0) ||
    (data.customAssets ?? []).some((item) => (item.amount || 0) > 0);
  const hasLiabilities =
    Object.values(data.liabilities).some((value) => value > 0) ||
    (data.customLiabilities ?? []).some((item) => (item.amount || 0) > 0);
  const hasEmi = hasLiabilities || (Number.isFinite(backendMetrics.emiStressRatio) && backendMetrics.emiStressRatio > 0);
  const hasIncomeFlow = data.monthlyIncome > 0;

  const chartCards: CyclicChartCard[] = useMemo(() => {
    const cards: CyclicChartCard[] = [
      {
        id: "health",
        title: "Financial health",
        caption: "Score pillars that make up your money score.",
        content: (
          <HealthScoreGauge
            score={metrics.healthScore}
            breakdown={metrics.scoreBreakdown}
            breakdownMeta={metrics.scoreBreakdownMeta}
          />
        ),
      },
      {
        id: "buffer",
        title: "Emergency buffer",
        caption: "How many months of expenses your liquid cash covers.",
        content: <EmergencyBufferGauge emergencyBufferMonths={backendMetrics.emergencyBufferMonths} />,
      },
    ];

    if (hasEmi) {
      cards.push({
        id: "emi",
        title: "EMI stress",
        caption: "Share of income going to loan obligations.",
        content: <EmiStressGauge emiStressRatio={backendMetrics.emiStressRatio} />,
      });
    }

    if (
      backendMetrics.fiMetricAvailable &&
      backendMetrics.fiRatio !== null &&
      backendMetrics.investedAssets !== null &&
      backendMetrics.targetRetirementCorpus !== null
    ) {
      cards.push({
        id: "fi",
        title: "FI progress",
        caption: "How far you are from your retirement corpus.",
        content: (
          <FIProgressWidget
            fiRatio={backendMetrics.fiRatio}
            investedAssets={backendMetrics.investedAssets}
            targetRetirementCorpus={backendMetrics.targetRetirementCorpus}
            estimatedRetirementAge={backendMetrics.estimatedRetirementAge}
          />
        ),
      });
    }

    if (hasAssets) {
      cards.push({
        id: "assets",
        title: "Asset mix",
        caption: "Where your net-worth building blocks sit today.",
        content: <AssetChart assets={data.assets} customAssets={data.customAssets} />,
      });
    }

    if (hasLiabilities) {
      cards.push({
        id: "liabilities",
        title: "Debt mix",
        caption: "Outstanding balances across loans and cards.",
        content: (
          <LiabilityChart
            liabilities={data.liabilities}
            customLiabilities={data.customLiabilities}
          />
        ),
      });
    }

    if (hasIncomeFlow) {
      cards.push({
        id: "flow",
        title: "Money flow",
        caption: "How monthly income splits into costs and savings.",
        content: <MobileMoneyFlowCard data={data} />,
      });
    }

    return cards;
  }, [backendMetrics, data, hasAssets, hasEmi, hasIncomeFlow, hasLiabilities, metrics]);

  const scrollToNumbers = () => {
    document.getElementById("mweb-numbers-deck")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-3 duration-400">
      <section className={`${CARD} overflow-hidden`}>
        <div className="flex items-center gap-4 px-4 pt-5 pb-4">
          <div className="relative w-[6.5rem] h-[6.5rem] shrink-0">
            <svg width="104" height="104" viewBox="0 0 100 100" className="-rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="#E5E7EB" strokeWidth="8" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke={scoreColor}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className={`font-mono text-[1.75rem] leading-none font-black ${getScoreColor(story.healthScore)}`}
                style={
                  story.healthScore >= 50 && story.healthScore < 75
                    ? { color: "#D97706" }
                    : undefined
                }
              >
                {story.healthScore}
              </span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-neutral-500">
                {story.healthLabel}
              </span>
            </div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6D28D9]">
              <NotebookText className="w-3.5 h-3.5" />
              Your money score
            </div>
            <h2 className="mt-1.5 text-[15px] font-bold text-neutral-900 dark:text-foreground leading-snug">
              {headlineLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </h2>
            {focusItem?.detail && (
              <p className="mt-1.5 text-xs text-neutral-500 leading-relaxed line-clamp-2">
                {focusItem.detail}
              </p>
            )}
          </div>
        </div>

        <div className="px-4 pb-1">
          {proof.map((item) => (
            <MetricRow key={item.label} {...item} />
          ))}
        </div>
      </section>

      <section className={`${CARD} overflow-hidden`}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
            Finance checkup
          </h3>
        </div>
        <ul>
          {story.checkup.map((item) => (
            <CheckupRow
              key={item.id}
              item={item}
              open={openCheckupId === item.id}
              onToggle={() => setOpenCheckupId(openCheckupId === item.id ? null : item.id)}
            />
          ))}
        </ul>
      </section>

      <button
        type="button"
        onClick={onOpenInsights}
        className="w-full rounded-2xl bg-[#6D28D9] text-white px-4 py-4 flex items-center gap-3 text-left active:scale-[0.99] transition-transform"
      >
        <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
          <Sparkles className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold">Get 3-Step Action Plan</p>
          <p className="text-sm text-white/80">Personalized plan to improve your score.</p>
        </div>
        <span className="w-10 h-10 rounded-full bg-white text-[#6D28D9] flex items-center justify-center shrink-0">
          <ArrowRight className="w-5 h-5" />
        </span>
      </button>

      <div className={`${CARD} overflow-hidden`}>
        <button
          type="button"
          onClick={scrollToNumbers}
          className={`w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left ${DIVIDER}`}
        >
          <div className="w-9 h-9 rounded-lg bg-[#DBEAFE] text-[#1D4ED8] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 dark:text-foreground">Detailed Breakdown (Assets/Debt)</p>
            <p className="text-xs text-neutral-500">See your numbers in detail</p>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
        <button
          type="button"
          onClick={isPaidUser ? onOpenSimulator : onUpgrade}
          className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-[#D1FAE5] text-[#047857] flex items-center justify-center shrink-0">
            <Target className="w-4 h-4" strokeWidth={2.4} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-neutral-900 dark:text-foreground">Wealth Journey & Milestones</p>
            <p className="text-xs text-neutral-500">Track goals and financial progress</p>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400" />
        </button>
      </div>

      <div id="mweb-numbers-deck" className="scroll-mt-24">
        <CyclicChartDeck cards={chartCards} />
      </div>

      {!isPaidUser && <MobileProCard onUpgrade={onUpgrade} />}
    </div>
  );
}

function MetricRow({
  label,
  value,
  Icon,
  tone,
  onClick,
}: {
  label: string;
  value: string;
  Icon: typeof Wallet;
  tone: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${tone}`}>
        <Icon className="w-4 h-4" strokeWidth={2.4} />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p
        className={`ml-auto font-sans text-[15px] font-bold tabular-nums ${
          value === "Add" ? "text-[#1D4ED8]" : "text-neutral-900 dark:text-foreground"
        }`}
      >
        {value}
      </p>
      {onClick && <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />}
    </>
  );

  const className = `flex items-center gap-3 py-3.5 ${DIVIDER} w-full text-left`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function CheckupRow({
  item,
  open,
  onToggle,
}: {
  item: CheckupItem;
  open: boolean;
  onToggle: () => void;
}) {
  const status = STATUS_UI[item.status];

  return (
    <li className={DIVIDER}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="w-full min-h-14 px-4 py-3 flex items-center gap-3 text-left"
      >
        <CheckupIcon id={item.id} status={item.status} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-neutral-900 dark:text-foreground">{item.title}</p>
          <p className="text-xs text-neutral-500 truncate">{item.summary}</p>
        </div>
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold shrink-0 ${status.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <ChevronRight
          className={`w-4 h-4 shrink-0 text-neutral-400 transition-transform ${open ? "rotate-90" : ""}`}
        />
      </button>
      {open && (
        <p className="px-4 pb-3 pl-[3.75rem] text-sm text-neutral-500 leading-relaxed">
          {item.detail}
        </p>
      )}
    </li>
  );
}
