"use client";

import { Download, Gauge, Wallet } from "lucide-react";
import type { AnalysisResult } from "@/lib/types";
import { formatChangeOrderMarkdown } from "@/lib/change-order-markdown";
import type { SideHustleInsights } from "@/lib/side-hustle-types";

type Props = {
  insights: SideHustleInsights;
  result: AnalysisResult;
  hourlyRate: number;
};

export function SideHustlePanel({ insights, result, hourlyRate }: Props) {
  const paidPct = insights.paidProbability != null
    ? Math.round(insights.paidProbability * 100)
    : null;

  const downloadCo = () => {
    const md = formatChangeOrderMarkdown(result, hourlyRate, insights);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scopelock-change-order-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-violet-500/10 to-emerald-500/5 p-5">
      <div className="flex items-center gap-2 text-violet-200">
        <Wallet className="h-5 w-5" />
        <h3 className="font-semibold">Side hustle cockpit</h3>
        <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
          Week 2
        </span>
      </div>
      <p className="mt-2 text-sm text-zinc-400">{insights.actionLabel}</p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <Metric
          icon={<Gauge className="h-4 w-4" />}
          label="Scope creep score"
          value={`${insights.scopeCreepScore}/100`}
          hint={
            insights.scopeCreepScore >= 70
              ? "Invoice before you code"
              : "Monitor tone in replies"
          }
          bar={insights.scopeCreepScore}
          barClass="bg-rose-400"
        />
        <Metric
          icon={<Wallet className="h-4 w-4" />}
          label="Get-paid odds (TabPFN)"
          value={paidPct != null ? `${paidPct}%` : "—"}
          hint="From similar freelance change orders"
          bar={paidPct ?? 0}
          barClass="bg-emerald-400"
        />
      </div>

      {insights.rushDetected && (
        <p className="mt-4 text-xs text-amber-200/90">
          Rush language detected — SOW-style{" "}
          <strong>{insights.rushFeePercent}% rush fee</strong> included in
          change-order export.
        </p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        {insights.whyOpenSourceMatters}
      </p>

      {result.changeOrder && (
        <button
          type="button"
          onClick={downloadCo}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-violet-500/20 px-4 py-2 text-sm font-medium text-violet-100 ring-1 ring-violet-400/30 hover:bg-violet-500/30"
        >
          <Download className="h-4 w-4" />
          Export client change order (.md)
        </button>
      )}
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  hint,
  bar,
  barClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  bar: number;
  barClass: string;
}) {
  return (
    <div className="rounded-xl bg-black/30 p-4">
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      <p className="text-xs text-zinc-500">{hint}</p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full ${barClass}`}
          style={{ width: `${Math.min(100, bar)}%` }}
        />
      </div>
    </div>
  );
}
