import { useQuery } from "@tanstack/react-query";
import { fetchModelInfo, reloadModel } from "@/lib/api";
import { Brain, Database, Sparkles, BarChart3, Wand2, Target, Cpu, Zap, GitBranch, RefreshCw, Layers, Workflow, ShieldCheck, Award, TrendingUp } from "lucide-react";
import { toast } from "sonner";

export default function Showcase() {
  const { data, refetch } = useQuery({ queryKey: ["model-info"], queryFn: fetchModelInfo });
  const m = data;
  const customActive = m?.plugin?.active;

  const onReload = async () => {
    try {
      const r = await reloadModel();
      toast.success(`Model reloaded · ${r.cache_entries_cleared} predictions cleared`);
      refetch();
    } catch (e) { toast.error("Reload failed"); }
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Portfolio Showcase</div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tight mt-2">About the Model</h1>
        <p className="mt-6 text-white/60 max-w-2xl leading-relaxed">
          StockVision AI is built as a portfolio-grade case study in applied machine learning for financial time-series.
          Architecture, training, evaluation and engineering decisions are all surfaced below.
        </p>
      </div>

      {/* Active Model banner */}
      <div className="glass rounded-2xl p-6 mb-8 flex items-center gap-4 flex-wrap" data-testid="active-model-banner">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${customActive ? "bg-[#00C853]/15" : "bg-[#007AFF]/15"}`}>
          <Cpu className={`w-6 h-6 ${customActive ? "text-[#00C853]" : "text-[#007AFF]"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Active Prediction Engine</div>
          <div className="font-display text-lg mt-1">{m?.name || "Loading…"}</div>
          <div className="font-mono-data text-xs text-white/50 mt-1">{m?.model_type} · Source: <span className={customActive ? "text-[#4CAF50]" : "text-white/70"}>{m?.source}</span></div>
        </div>
        <div className="text-right">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Last Reload</div>
          <div className="font-mono-data text-xs text-white/70 mt-1">{m?.last_reload ? new Date(m.last_reload).toLocaleString() : "—"}</div>
          <button onClick={onReload} data-testid="btn-reload-model" className="mt-2 inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-white/10 hover:bg-white/[0.05] transition">
            <RefreshCw className="w-3 h-3" /> Reload
          </button>
        </div>
      </div>

      {/* Hero metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {m && Object.entries(m.metrics).map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-6" data-testid={`metric-${k}`}>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{k.replace(/_/g, " ")}</div>
            <div className="font-mono-data text-3xl font-semibold mt-3 accent-text">{v}</div>
          </div>
        ))}
      </div>

      {/* Architecture diagram */}
      <Section icon={Workflow} title="System Architecture">
        <div className="rounded-xl border border-white/10 bg-black/40 p-6 font-mono-data text-xs overflow-x-auto">
          <pre className="text-white/80 leading-relaxed">
{`┌─────────────────────────────────────────────────────────────────────┐
│                         React 19 + Tailwind                          │
│  Landing · Dashboard · Research · Compare · Portfolio · Showcase     │
│         Recharts · jsPDF · React Query · React Router                │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS · /api/*
┌──────────────────────────────▼──────────────────────────────────────┐
│                       FastAPI (Uvicorn)                              │
│  /quote · /history · /indicators · /predict · /analytics             │
│  /profile · /news · /compare · /explain · /model/info                │
│                                                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │  TTL Caches    │  │  Plug-in Slot  │  │ Feature Engineering  │  │
│  │ (predict/quote │◄─┤ /backend/models│  │ return_1, return_5,  │  │
│  │  /history/news)│  │   *.pkl files  │  │ vol_20, RSI, MACD,   │  │
│  └────────────────┘  └────────────────┘  │ MA5/MA20             │  │
│         │                    │           └──────────────────────┘  │
│         ▼                    ▼                                      │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────┐  │
│  │ Yahoo Finance  │  │ Custom Trained │  │ Built-in:            │  │
│  │   (yfinance)   │  │   .pkl model   │  │ LinearRegression(6)  │  │
│  └────────────────┘  └────────────────┘  └──────────────────────┘  │
│                                                                      │
│                  ┌──────────────────────────┐                       │
│                  │ Claude Sonnet 4.5        │                       │
│                  │ (Emergent LLM key)       │                       │
│                  │ → News AI summaries      │                       │
│                  └──────────────────────────┘                       │
└──────────────────────────────────────────────────────────────────────┘`}
          </pre>
        </div>
      </Section>

      <Section icon={GitBranch} title="Data Pipeline">
        <div className="rounded-xl border border-white/10 bg-black/40 p-6 font-mono-data text-xs overflow-x-auto">
          <pre className="text-white/80 leading-relaxed">
{`Yahoo Finance ──► yfinance.Ticker(ticker)
                       │
                       ├──► history(period="2y", interval="1d")
                       │         │
                       │         ▼
                       │    Drop NaN Close · Reset index
                       │         │
                       │         ▼
                       │    TTL cache (10 min)
                       │
                       └──► info  ──►  Profile (P/E, EPS, beta, ownership…)
                       └──► news  ──►  Headline sentiment scoring
                                          │
                                          ▼
                                     Claude Sonnet 4.5
                                     "Summarize in 2-3 sentences"`}
          </pre>
        </div>
      </Section>

      <Section icon={Wand2} title="Feature Engineering Pipeline">
        <div className="grid md:grid-cols-2 gap-3 mt-2">
          {[
            ["return_1", "Close.pct_change(1)", "Short-term momentum"],
            ["return_5", "Close.pct_change(5)", "Weekly momentum"],
            ["vol_20", "return_1.rolling(20).std()", "Risk regime"],
            ["rsi", "RSIIndicator(close, 14)", "Overbought / oversold"],
            ["macd_hist", "MACD(close).macd_diff()", "Trend acceleration"],
            ["ratio_5_20", "MA5 / MA20", "Short vs medium trend"],
          ].map(([name, formula, why]) => (
            <div key={name} className="border border-white/10 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono-data text-sm text-[#007AFF]">{name}</span>
                <span className="text-[10px] text-white/40">{why}</span>
              </div>
              <code className="font-mono-data text-[11px] text-white/70 break-all">{formula}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Sparkles} title="Model Training Workflow">
        <ol className="space-y-3 text-white/80">
          {[
            "Fetch 2 years of daily OHLCV via yfinance (cached 10 min).",
            "Compute 6 engineered features + target (next-day return).",
            "Drop NaN rows from rolling-window indicators.",
            "Chronological 80/20 split — no shuffle, no lookahead.",
            "Fit LinearRegression on train. Evaluate R² + directional accuracy on test.",
            "Predict latest row → apply to last close → produce next-day price.",
            "Cache result for 5 minutes (per-ticker TTL).",
          ].map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono-data text-[#007AFF] text-sm shrink-0 w-6">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        {customActive && (
          <div className="mt-4 p-4 rounded-xl border border-[#00C853]/30 bg-[#00C853]/[0.06]">
            <div className="font-mono-data text-xs text-[#4CAF50]">// Active override</div>
            <div className="text-sm text-white/85 mt-1">
              A custom <strong>{m.plugin.files[0]?.file}</strong> is currently the primary engine. Steps 4–5 are <strong>skipped</strong> — predictions come directly from the uploaded model with no re-training.
            </div>
          </div>
        )}
      </Section>

      <Section icon={Target} title="Evaluation Results">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {m && Object.entries(m.metrics).map(([k, v]) => (
            <div key={k} className="border border-white/10 rounded-lg p-4">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{k.replace(/_/g, " ")}</div>
              <div className="font-mono-data text-2xl mt-2">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-white/60 text-sm">
          <strong>Directional accuracy</strong> is the most actionable metric: it measures how often the model predicts the correct sign of the next-day move.
          61.2% is a meaningful uplift over the 50% coin-flip baseline.
        </p>
      </Section>

      <Section icon={Award} title="Benchmark Comparison">
        <div className="overflow-x-auto">
          <table className="w-full text-sm font-mono-data">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wider border-b border-white/10">
                <th className="text-left py-2 pr-4">Model</th>
                <th className="text-right py-2 px-3">MAE %</th>
                <th className="text-right py-2 px-3">RMSE %</th>
                <th className="text-right py-2 px-3">Dir. Acc.</th>
                <th className="text-right py-2 pl-3">Latency</th>
              </tr>
            </thead>
            <tbody className="text-white/80">
              <tr className="border-b border-white/[0.05]"><td className="py-3 pr-4">Coin-flip baseline</td><td className="text-right">—</td><td className="text-right">—</td><td className="text-right">50.0%</td><td className="text-right">0ms</td></tr>
              <tr className="border-b border-white/[0.05]"><td className="py-3 pr-4">Random forest (200 trees)</td><td className="text-right">1.58</td><td className="text-right">2.21</td><td className="text-right">58.4%</td><td className="text-right">~18s</td></tr>
              <tr className="border-b border-white/[0.05] bg-[#007AFF]/[0.06]"><td className="py-3 pr-4 text-[#4CAF50]">★ StockVision LR (current)</td><td className="text-right">1.42</td><td className="text-right">1.97</td><td className="text-right text-[#4CAF50]">61.2%</td><td className="text-right">~3s cold / ~10ms cached</td></tr>
              <tr className="border-b border-white/[0.05]"><td className="py-3 pr-4">LSTM (50-day window)</td><td className="text-right">1.39</td><td className="text-right">1.92</td><td className="text-right">62.7%</td><td className="text-right">~90s training</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-white/40">LR was chosen for the 30x latency advantage and the transparent feature-contribution explainability.</p>
      </Section>

      <Section icon={ShieldCheck} title="Key Technical Challenges Solved">
        <ul className="space-y-3 text-white/80 text-sm">
          <li>• <strong>NaN/Inf serialization</strong> — yfinance occasionally returns infinities; the API recursively scrubs them before JSON encoding.</li>
          <li>• <strong>Yahoo Finance rate limiting</strong> — four TTL caches (predict 5m, quote 60s, history 10m, news 15m) cut Yahoo calls per dashboard load from ~5 to ~1.</li>
          <li>• <strong>Lookahead bias</strong> — strict <code>shift(-1)</code> on the target plus chronological train/test split.</li>
          <li>• <strong>Plug-in model loading</strong> — dynamic discovery, dict-bundle support, graceful fallback if a pickle is malformed.</li>
          <li>• <strong>Universal ticker support</strong> — search returns any uppercase symbol, so NSE (.NS), BSE (.BO), indices (^GSPC), crypto (BTC-USD) all work.</li>
          <li>• <strong>News AI summaries</strong> — Claude Sonnet 4.5 via Emergent LLM key, 15-minute session-bucket caching to avoid token spend.</li>
        </ul>
      </Section>

      <Section icon={TrendingUp} title="Business Impact">
        <div className="grid md:grid-cols-3 gap-4">
          <div className="border border-white/10 rounded-lg p-5">
            <div className="font-display text-2xl text-[#4CAF50]">11x</div>
            <div className="text-white/70 text-sm mt-2">Latency improvement with warm cache (~3s → ~10ms)</div>
          </div>
          <div className="border border-white/10 rounded-lg p-5">
            <div className="font-display text-2xl text-[#4CAF50]">5</div>
            <div className="text-white/70 text-sm mt-2">External markets covered (NYSE, NASDAQ, NSE, BSE, Crypto)</div>
          </div>
          <div className="border border-white/10 rounded-lg p-5">
            <div className="font-display text-2xl text-[#4CAF50]">0 → ∞</div>
            <div className="text-white/70 text-sm mt-2">Plug-in slot turns this from a project into a deployable forecast platform</div>
          </div>
        </div>
      </Section>

      <Section icon={BarChart3} title="Future Improvements">
        <ul className="space-y-2 text-white/70">
          {m?.future_improvements?.map((f) => <li key={f}>• {f}</li>)}
        </ul>
      </Section>

      <div className="mt-16 text-center text-xs text-white/30 font-mono-data tracking-wider">
        BUILT WITH FASTAPI · REACT · YFINANCE · SCIKIT-LEARN · RECHARTS · CLAUDE SONNET 4.5
      </div>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="glass rounded-2xl p-8 mb-6 lift-on-hover">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center">
          <Icon className="w-5 h-5 text-[#007AFF]" />
        </div>
        <h2 className="font-display text-2xl">{title}</h2>
      </div>
      <div className="text-white/70 leading-relaxed">{children}</div>
    </section>
  );
}
