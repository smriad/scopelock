"use client";

import { AppHeader } from "@/components/AppHeader";
import { AlertTriangle, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

type HistoryItem = {
  id: string;
  createdAt: string;
  threadPreview: string;
  summary?: string;
  suggestedReply?: string;
  overallRisk: string;
  mode: string;
  hourlyRate: number;
  tabpfnHours?: number;
  estimatedTotalUsd?: number;
  scopeCreepScore?: number;
  paidProbability?: number;
};

export function HistoryView() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/history");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not load history");
      setItems(data.items ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-full bg-[#070b12] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />
      <AppHeader
        active="history"
        subtitle="Past analyses stored in MongoDB Atlas"
      />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Case history</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Every successful analyze run is saved for your portfolio and DEV
              demo screenshots.
            </p>
          </div>
          <Link
            href="/"
            className="text-sm text-emerald-400 hover:text-emerald-300"
          >
            New analysis →
          </Link>
        </div>

        {loading && (
          <p className="flex items-center gap-2 text-sm text-zinc-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading from Atlas…
          </p>
        )}

        {error && (
          <p className="flex items-center gap-2 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </p>
        )}

        {!loading && !error && items.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center text-sm text-zinc-500">
            No cases yet. Run an analysis on the{" "}
            <Link href="/" className="text-emerald-400">home page</Link>.
          </div>
        )}

        <ul className="space-y-3">
          {items.map((item) => {
            const open = expanded === item.id;
            const date = new Date(item.createdAt);
            return (
              <li
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : item.id)}
                  className="flex w-full items-start gap-3 p-5 text-left hover:bg-white/[0.02]"
                >
                  <RiskDot risk={item.overallRisk} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      <time dateTime={date.toISOString()}>
                        {date.toLocaleString()}
                      </time>
                      <span>·</span>
                      <span>{item.mode}</span>
                      {item.scopeCreepScore != null && (
                        <>
                          <span>·</span>
                          <span>creep {item.scopeCreepScore}</span>
                        </>
                      )}
                      {item.paidProbability != null && (
                        <>
                          <span>·</span>
                          <span>{Math.round(item.paidProbability * 100)}% paid odds</span>
                        </>
                      )}
                      {item.estimatedTotalUsd != null && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-400">
                            ~${item.estimatedTotalUsd} CO
                          </span>
                        </>
                      )}
                    </div>
                    <p className="mt-1 font-medium text-zinc-200 line-clamp-2">
                      {item.summary ?? item.threadPreview}
                    </p>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 shrink-0 text-zinc-600 transition-transform ${open ? "rotate-90" : ""}`}
                  />
                </button>
                {open && (
                  <div className="border-t border-white/10 bg-black/30 px-5 py-4 text-sm space-y-4">
                    <div>
                      <p className="text-xs font-medium text-zinc-500">
                        Client thread
                      </p>
                      <p className="mt-1 whitespace-pre-wrap text-zinc-400 font-mono text-xs">
                        {item.threadPreview}
                      </p>
                    </div>
                    {item.suggestedReply && (
                      <div>
                        <p className="text-xs font-medium text-zinc-500">
                          Suggested reply
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-zinc-300">
                          {item.suggestedReply}
                        </p>
                      </div>
                    )}
                    <p className="text-xs text-zinc-600">
                      ${item.hourlyRate}/hr
                      {item.tabpfnHours != null &&
                        ` · TabPFN ${item.tabpfnHours}h`}
                      {" · "}
                      id {item.id}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}

function RiskDot({ risk }: { risk: string }) {
  const color =
    risk === "high"
      ? "bg-rose-400"
      : risk === "medium"
        ? "bg-amber-400"
        : "bg-emerald-400";
  return (
    <span
      className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${color}`}
      title={`Risk: ${risk}`}
    />
  );
}
