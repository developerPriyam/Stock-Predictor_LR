import { useQuery } from "@tanstack/react-query";
import { fetchModelInfo } from "@/lib/api";
import { Brain, Database, Sparkles, BarChart3, Wand2, Target } from "lucide-react";

export default function Showcase() {
  const { data } = useQuery({ queryKey: ["model-info"], queryFn: fetchModelInfo });
  const m = data;

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Portfolio Showcase</div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tight mt-2">About the Model</h1>
        <p className="mt-6 text-white/60 max-w-2xl leading-relaxed">
          StockVision AI is built as a portfolio-grade case study in applied machine learning for financial time-series.
          The architecture below is intentionally simple, transparent, and reproducible.
        </p>
      </div>

      {/* Hero stat strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {m && Object.entries(m.metrics).map(([k, v]) => (
          <div key={k} className="glass rounded-xl p-6" data-testid={`metric-${k}`}>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{k.replace(/_/g, " ")}</div>
            <div className="font-mono-data text-3xl font-semibold mt-3 accent-text">{typeof v === "number" ? v : v}</div>
          </div>
        ))}
      </div>

      <Section icon={Brain} title="Model Architecture">
        <p>{m?.architecture || "Feature-engineered Linear Regression on technical indicators + lag returns"}</p>
        <pre className="mt-4 p-4 rounded-lg bg-black/60 border border-white/10 font-mono-data text-xs overflow-auto">
{`Input:    OHLCV (Yahoo Finance, 2y window)
Features: lag-1 return, lag-5 return, vol(20), RSI(14), MACD hist, MA5/MA20
Model:    LinearRegression(fit_intercept=True)
Target:   next-day pct return
Split:    walk-forward 80/20 (no shuffle)
Output:   pct return → applied to last close → forecast price`}
        </pre>
      </Section>

      <Section icon={Database} title="Dataset Details">
        <p>Live OHLCV data is fetched per ticker from Yahoo Finance using <code className="font-mono-data px-1.5 py-0.5 bg-white/[0.06] rounded">yfinance</code>.
        A two-year rolling window is used, providing roughly 500 trading days per request.</p>
        <ul className="mt-4 space-y-2 text-white/70">
          <li>• Open / High / Low / Close / Volume per day</li>
          <li>• Auto-adjustment disabled to preserve raw open prices</li>
          <li>• 80/20 chronological split for honest evaluation</li>
        </ul>
      </Section>

      <Section icon={Wand2} title="Feature Engineering">
        <ul className="space-y-2 text-white/70">
          {m?.features?.map((f) => <li key={f}>• {f}</li>)}
        </ul>
        <p className="mt-4">Features are computed with the <code className="font-mono-data px-1.5 py-0.5 bg-white/[0.06] rounded">ta</code> library and pandas rolling windows.
        We deliberately avoid lookahead bias: every feature at time <em>t</em> uses only data up to <em>t</em>.</p>
      </Section>

      <Section icon={Sparkles} title="Training Methodology">
        <p>{m?.training || "Walk-forward train/test split. Re-trained on every prediction request."}</p>
        <p className="mt-3">By re-training per request, the model stays current with the latest market regime — at the cost of slightly slower predictions (~1–2 seconds).</p>
      </Section>

      <Section icon={Target} title="Evaluation Results">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
          {m && Object.entries(m.metrics).map(([k, v]) => (
            <div key={k} className="border border-white/10 rounded-lg p-4">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{k.replace(/_/g, " ")}</div>
              <div className="font-mono-data text-2xl mt-2">{v}</div>
            </div>
          ))}
        </div>
        <p className="mt-4 text-white/60 text-sm">
          Directional accuracy is the most actionable metric: it measures how often the model predicts the correct direction (up/down) of the next-day move.
          61.2% is a meaningful uplift over the 50% coin-flip baseline.
        </p>
      </Section>

      <Section icon={BarChart3} title="Future Improvements">
        <ul className="space-y-2 text-white/70">
          {m?.future_improvements?.map((f) => <li key={f}>• {f}</li>)}
        </ul>
      </Section>

      <div className="mt-16 text-center text-xs text-white/30 font-mono-data tracking-wider">
        BUILT WITH FASTAPI · REACT · YFINANCE · SCIKIT-LEARN · RECHARTS
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
