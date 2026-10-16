"use client";

import {
  AlertTriangle,
  Check,
  Copy,
  Loader2,
  Shield,
  Sparkles,
  Volume2,
  Mic,
  FileJson,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { SideHustlePanel } from "@/components/SideHustlePanel";
import { slackToThreadText } from "@/lib/slack-import";
import type { SideHustleInsights } from "@/lib/side-hustle-types";
import type { AnalysisResult, ScopeVerdict } from "@/lib/types";

type Health = {
  ollama: boolean;
  database: boolean;
  mongo?: boolean;
  chatModel: string;
  demoMode: boolean;
  appUrl?: string;
};

type Integration = {
  partner: string;
  category: string;
  ok: boolean;
  detail: string;
};

const verdictStyles: Record<
  ScopeVerdict,
  { label: string; className: string }
> = {
  in_scope: {
    label: "In scope",
    className: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30",
  },
  ambiguous: {
    label: "Ambiguous",
    className: "bg-amber-500/15 text-amber-200 ring-amber-500/30",
  },
  out_of_scope: {
    label: "Out of scope",
    className: "bg-rose-500/15 text-rose-200 ring-rose-500/30",
  },
};

export function ScopeLockApp() {
  const [health, setHealth] = useState<Health | null>(null);
  const [sow, setSow] = useState("");
  const [thread, setThread] = useState("");
  const [hourlyRate, setHourlyRate] = useState(125);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [indexBackend, setIndexBackend] = useState<"tiger" | "mongodb" | null>(
    null,
  );
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [tabpfnHours, setTabpfnHours] = useState<number | null>(null);
  const [serpSnippet, setSerpSnippet] = useState<string | null>(null);
  const [sideHustle, setSideHustle] = useState<SideHustleInsights | null>(null);
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const slackInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [indexing, setIndexing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [mode, setMode] = useState<"ollama" | "demo" | "mastra" | null>(null);
  const [ragChunks, setRagChunks] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then(setHealth)
      .catch(() => setHealth(null));
    fetch("/api/samples")
      .then((r) => r.json())
      .then((d) => {
        setSow(d.sow ?? "");
        setThread(d.thread ?? "");
      })
      .catch(() => {});
    fetch("/api/integrations")
      .then((r) => r.json())
      .then((d) => setIntegrations(d.integrations ?? []))
      .catch(() => {});
  }, []);

  const indexSow = useCallback(async () => {
    setError(null);
    setIndexing(true);
    setDocumentId(null);
    setIndexBackend(null);
    try {
      const res = await fetch("/api/sow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Client SOW", content: sow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Indexing failed");
      setDocumentId(data.documentId);
      setIndexBackend(data.backend === "mongodb" ? "mongodb" : "tiger");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Indexing failed");
    } finally {
      setIndexing(false);
    }
  }, [sow]);

  const runAnalysis = useCallback(async () => {
    setError(null);
    setAnalyzing(true);
    setResult(null);
    setSideHustle(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread,
          sowInline: documentId ? undefined : sow,
          documentId: indexBackend === "tiger" ? documentId : undefined,
          mongoDocumentId: indexBackend === "mongodb" ? documentId : undefined,
          hourlyRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setResult(data.result);
      setMode(data.mode);
      setRagChunks(data.ragChunks ?? []);
      setTabpfnHours(data.tabpfnHours ?? null);
      setSerpSnippet(data.serpSnippet ?? null);
      setSideHustle(data.sideHustle ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed");
    } finally {
      setAnalyzing(false);
    }
  }, [thread, sow, documentId, indexBackend, hourlyRate]);

  const importSlackFile = async (file: File) => {
    const text = slackToThreadText(await file.text());
    if (text) setThread(text);
  };

  const transcribeFile = async (file: File) => {
    setTranscribing(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      const res = await fetch("/api/transcribe", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Transcribe failed");
      setThread((t) =>
        t ? `${t}\n\nClient (voice memo): ${data.text}` : `Client (voice memo): ${data.text}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Transcribe failed");
    } finally {
      setTranscribing(false);
    }
  };

  const playVoice = async () => {
    if (!result?.suggestedReply) return;
    setVoiceLoading(true);
    try {
      const res = await fetch("/api/voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: result.suggestedReply }),
      });
      if (!res.ok) throw new Error("Voice failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      await audio.play();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Voice failed");
    } finally {
      setVoiceLoading(false);
    }
  };

  const copyReply = async () => {
    if (!result?.suggestedReply) return;
    await navigator.clipboard.writeText(result.suggestedReply);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const totalChangeOrder =
    result?.changeOrder?.lineItems.reduce((s, li) => s + li.hours, 0) ?? 0;

  return (
    <div className="min-h-full bg-[#070b12] text-zinc-100">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%)]" />
      <AppHeader
        active="home"
        subtitle={`${health?.appUrl ?? "scopelock.smriad.tech"} · Render + open Gemma`}
        trailing={
          <div className="flex flex-wrap gap-2 text-xs">
            <StatusPill
              ok={health?.ollama}
              label={
                health?.ollama
                  ? `Gemma · ${health.chatModel}`
                  : "Inference offline"
              }
            />
            <StatusPill
              ok={health?.database}
              label={health?.database ? "Tiger pgvector" : "Tiger optional"}
            />
            <StatusPill
              ok={health?.mongo}
              label={health?.mongo ? "MongoDB Atlas" : "Atlas optional"}
            />
            {health?.demoMode && (
              <span className="rounded-full bg-violet-500/20 px-3 py-1 text-violet-200 ring-1 ring-violet-400/30">
                Demo mode
              </span>
            )}
          </div>
        }
      />

      <main className="relative mx-auto max-w-6xl px-6 py-10">
        <section className="mb-10 max-w-2xl">
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            Stop donating weekends to &ldquo;quick favors.&rdquo;
          </h1>
          <p className="mt-3 text-zinc-400 leading-relaxed">
            Paste a client thread and your SOW.{" "}
            <span className="text-emerald-300">Gemma</span> (via OpenRouter on
            Render) classifies each ask;{" "}
            <span className="text-emerald-300">TabPFN</span> regresses hours;
            Tiger/Mongo ground citations; ElevenLabs narrates your boundary
            email.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Statement of work" subtitle="Ground truth for retrieval">
            <textarea
              value={sow}
              onChange={(e) => setSow(e.target.value)}
              className="min-h-[220px] w-full resize-y rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-zinc-200 outline-none ring-emerald-500/0 focus:ring-2 focus:ring-emerald-500/40"
              spellCheck={false}
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={indexSow}
                disabled={indexing || !sow.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium hover:bg-white/15 disabled:opacity-40"
              >
                {indexing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Shield className="h-4 w-4 text-emerald-300" />
                )}
                Index SOW (Tiger / Atlas)
              </button>
              {documentId && (
                <span className="flex items-center gap-1 text-xs text-emerald-300">
                  <Check className="h-3.5 w-3.5" /> Indexed for RAG
                </span>
              )}
            </div>
          </Panel>

          <Panel
            title="Client thread"
            subtitle="Slack export, voice memo, email, or DMs"
          >
            <div className="mb-3 flex flex-wrap gap-2">
              <input
                ref={slackInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) importSlackFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => slackInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15"
              >
                <FileJson className="h-3.5 w-3.5" />
                Import Slack JSON
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*,video/webm"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) transcribeFile(f);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                disabled={transcribing}
                onClick={() => audioInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs hover:bg-white/15 disabled:opacity-40"
              >
                {transcribing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mic className="h-3.5 w-3.5" />
                )}
                Client voice memo
              </button>
            </div>
            <textarea
              value={thread}
              onChange={(e) => setThread(e.target.value)}
              className="min-h-[220px] w-full resize-y rounded-xl border border-white/10 bg-black/40 p-4 text-sm leading-relaxed text-zinc-200 outline-none focus:ring-2 focus:ring-emerald-500/40"
              spellCheck={false}
            />
            <label className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
              Hourly rate (USD)
              <input
                type="number"
                min={1}
                value={hourlyRate}
                onChange={(e) => setHourlyRate(Number(e.target.value))}
                className="w-28 rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-zinc-100"
              />
            </label>
          </Panel>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-4">
          <button
            type="button"
            onClick={runAnalysis}
            disabled={analyzing || !thread.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/20 hover:bg-emerald-400 disabled:opacity-40"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Analyze scope
          </button>
          {mode && (
            <p className="text-xs text-zinc-500">
              Inference:{" "}
              <span className="text-zinc-300">
                {mode === "mastra"
                  ? "Mastra + Gemma"
                  : mode === "ollama"
                    ? "Gemma / Ollama"
                    : "demo fallback"}
              </span>
            </p>
          )}
        </div>

        {error && (
          <p className="mt-4 flex items-center gap-2 text-sm text-rose-300">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </p>
        )}

        {result && (
          <section className="mt-10 space-y-6 border-t border-white/10 pt-10">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Verdict</h2>
                <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                  {result.summary}
                </p>
              </div>
              <RiskBadge risk={result.overallRisk} />
            </div>

            {sideHustle && (
              <SideHustlePanel
                insights={sideHustle}
                result={result}
                hourlyRate={hourlyRate}
              />
            )}

            <ul className="space-y-4">
              {result.requests.map((req, i) => (
                <li
                  key={i}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${verdictStyles[req.verdict].className}`}
                    >
                      {verdictStyles[req.verdict].label}
                    </span>
                  </div>
                  <p className="mt-3 text-sm italic text-zinc-300">
                    &ldquo;{req.excerpt}&rdquo;
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">{req.reasoning}</p>
                  <p className="mt-2 text-xs text-emerald-200/80">
                    SOW: {req.sowEvidence}
                  </p>
                </li>
              ))}
            </ul>

            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-medium text-emerald-100">Suggested reply</h3>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={playVoice}
                    disabled={voiceLoading}
                    className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs hover:bg-black/50 disabled:opacity-40"
                  >
                    {voiceLoading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Volume2 className="h-3.5 w-3.5" />
                    )}
                    Listen
                  </button>
                  <button
                    type="button"
                    onClick={copyReply}
                    className="inline-flex items-center gap-1 rounded-lg bg-black/30 px-3 py-1.5 text-xs hover:bg-black/50"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
                {result.suggestedReply}
              </p>
            </div>

            {result.changeOrder && (
              <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                <h3 className="font-medium text-white">
                  {result.changeOrder.title}
                </h3>
                <table className="mt-4 w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-500">
                      <th className="pb-2 font-medium">Line item</th>
                      <th className="pb-2 font-medium text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.changeOrder.lineItems.map((li, i) => (
                      <tr key={i} className="border-t border-white/5">
                        <td className="py-2 text-zinc-300">{li.description}</td>
                        <td className="py-2 text-right text-zinc-400">
                          {li.hours}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-3 text-sm font-medium text-emerald-300">
                  ≈ {tabpfnHours ?? totalChangeOrder}h · $
                  {(tabpfnHours ?? totalChangeOrder) * hourlyRate} at $
                  {hourlyRate}/hr
                  {tabpfnHours ? " (TabPFN)" : ""}
                </p>
                {serpSnippet && (
                  <p className="mt-2 text-xs text-zinc-500">
                    SerpApi market note: {serpSnippet}
                  </p>
                )}
                <p className="mt-2 text-xs text-zinc-500">
                  {result.changeOrder.notes}
                </p>
              </div>
            )}

            {ragChunks.length > 0 && (
              <details className="text-sm text-zinc-500">
                <summary className="cursor-pointer text-zinc-400">
                  RAG chunks used ({ragChunks.length})
                </summary>
                <ul className="mt-2 space-y-2 font-mono text-xs">
                  {ragChunks.map((c, i) => (
                    <li
                      key={i}
                      className="rounded-lg bg-black/40 p-3 text-zinc-400"
                    >
                      {c}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </section>
        )}

        {integrations.length > 0 && (
          <section className="mt-16 border-t border-white/10 pt-10">
            <h2 className="text-sm font-semibold text-zinc-300">
              Partner integrations
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {integrations.map((item) => (
                <li
                  key={item.partner}
                  className="rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xs"
                >
                  <span
                    className={
                      item.ok ? "text-emerald-300" : "text-zinc-500"
                    }
                  >
                    {item.ok ? "●" : "○"}
                  </span>{" "}
                  <span className="font-medium text-zinc-200">
                    {item.partner}
                  </span>
                  <span className="text-zinc-600"> · {item.category}</span>
                  <p className="mt-1 text-zinc-500">{item.detail}</p>
                </li>
              ))}
            </ul>
          </section>
        )}
      </main>

      <footer className="relative border-t border-white/10 py-8 text-center text-xs text-zinc-600">
        Hacktoberfest 2026 Week 2 · scopelock.smriad.tech on Render · MIT
      </footer>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-xl shadow-black/20">
      <h2 className="text-sm font-semibold text-white">{title}</h2>
      <p className="text-xs text-zinc-500">{subtitle}</p>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function StatusPill({ ok, label }: { ok?: boolean; label: string }) {
  return (
    <span
      className={`rounded-full px-3 py-1 ring-1 ${
        ok
          ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
          : "bg-zinc-800/80 text-zinc-400 ring-white/10"
      }`}
    >
      {label}
    </span>
  );
}

function RiskBadge({ risk }: { risk: "low" | "medium" | "high" }) {
  const map = {
    low: "text-emerald-300 bg-emerald-500/10 ring-emerald-500/30",
    medium: "text-amber-200 bg-amber-500/10 ring-amber-500/30",
    high: "text-rose-200 bg-rose-500/10 ring-rose-500/30",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${map[risk]}`}>
      Risk: {risk}
    </span>
  );
}
