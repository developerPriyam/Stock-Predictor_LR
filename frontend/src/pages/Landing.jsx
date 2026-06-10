import { Link } from "react-router-dom";
import { ArrowUpRight, TrendingUp, BarChart3, Brain, ShieldCheck, Globe2, LineChart, Layers, Cpu, Activity, Sparkles, Zap } from "lucide-react";

const FEATURES = [
  { icon: Brain, title: "AI Forecast Engine", desc: "Feature-engineered ML model trained on 2 years of OHLCV data per ticker with walk-forward validation.", testId: "feat-ai" },
  { icon: LineChart, title: "Interactive Charts", desc: "Candlesticks, line charts and multi-timeframe analysis from 1 month to 5 years.", testId: "feat-charts" },
  { icon: Layers, title: "Technical Indicators", desc: "MA20, MA50, RSI, MACD, Bollinger Bands, ATR — all computed server-side.", testId: "feat-indicators" },
  { icon: Activity, title: "Trend & Sentiment", desc: "Trend gauge, momentum, volatility, support/resistance and market sentiment scoring.", testId: "feat-sentiment" },
  { icon: ShieldCheck, title: "Risk Analytics", desc: "Max drawdown, volatility, risk score and confidence on every prediction.", testId: "feat-risk" },
  { icon: Globe2, title: "Global Markets", desc: "NASDAQ, NYSE, ETFs and crypto. Any Yahoo Finance ticker works.", testId: "feat-markets" },
];

const MARKETS = ["NASDAQ", "NYSE", "NYSE ARCA", "Crypto", "ETFs", "Indices"];

const METRICS = [
  { label: "Directional Accuracy", value: "61.2%", note: "on held-out window" },
  { label: "MAE", value: "1.42%", note: "next-day return" },
  { label: "RMSE", value: "1.97%", note: "next-day return" },
  { label: "Tickers Supported", value: "8000+", note: "via Yahoo Finance" },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden">
      {/* Nav */}
      <header className="sticky top-0 z-50 glass-strong border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="landing-logo">
            <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-none">StockVision</div>
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">AI</div>
            </div>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/70">
            <a href="#features" className="hover:text-white transition" data-testid="link-features">Features</a>
            <a href="#metrics" className="hover:text-white transition" data-testid="link-metrics">Accuracy</a>
            <a href="#markets" className="hover:text-white transition" data-testid="link-markets">Markets</a>
            <Link to="/docs" className="hover:text-white transition" data-testid="link-docs">Docs</Link>
          </nav>
          <Link
            to="/dashboard"
            data-testid="cta-launch-app"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-white text-sm font-medium transition"
          >
            Launch App <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative">
        <div className="absolute inset-0 grid-bg opacity-60" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#050505]" />
        <div className="relative max-w-7xl mx-auto px-6 pt-24 pb-32">
          <div className="grid lg:grid-cols-12 gap-12 items-end">
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/[0.03] mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00C853] pulse-dot" />
                <span className="font-mono-data text-[11px] uppercase tracking-[0.2em] text-white/70">Live Markets · ML Powered</span>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-semibold leading-[0.95] tracking-tight">
                Predict the<br />
                <span className="accent-text">markets</span> with<br />
                machine intelligence.
              </h1>
              <p className="mt-8 text-lg text-white/60 max-w-xl leading-relaxed">
                StockVision AI runs feature-engineered models on live OHLCV data to forecast next-day prices, surface trends,
                and quantify risk — built for analysts, students and quants.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Link to="/dashboard" data-testid="hero-cta-primary"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-white font-medium transition">
                  Open Dashboard <ArrowUpRight className="w-4 h-4" />
                </Link>
                <Link to="/showcase" data-testid="hero-cta-secondary"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white font-medium transition">
                  View Project Showcase
                </Link>
              </div>
            </div>

            {/* Hero card mock */}
            <div className="lg:col-span-5">
              <div className="glass rounded-2xl p-6 relative overflow-hidden">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <div className="font-mono-data text-xs text-white/40 uppercase tracking-widest">Forecast · AAPL</div>
                    <div className="font-display text-2xl mt-1">Apple Inc.</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-[#00C853]/10 border border-[#00C853]/30 text-[#4CAF50] text-xs font-mono-data">BULLISH</div>
                </div>
                <div className="space-y-1">
                  <div className="font-mono-data text-5xl font-semibold">$187.42</div>
                  <div className="font-mono-data text-sm text-[#4CAF50]">+2.84 (+1.54%) next-day</div>
                </div>
                <div className="mt-6 h-32 relative">
                  <svg viewBox="0 0 300 100" className="w-full h-full">
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#007AFF" stopOpacity="0.4" />
                        <stop offset="100%" stopColor="#007AFF" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M0,70 L30,60 L60,65 L90,50 L120,55 L150,40 L180,42 L210,30 L240,35 L270,20 L300,15 L300,100 L0,100 Z" fill="url(#g1)" />
                    <path d="M0,70 L30,60 L60,65 L90,50 L120,55 L150,40 L180,42 L210,30 L240,35 L270,20 L300,15" fill="none" stroke="#007AFF" strokeWidth="2" />
                  </svg>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <div className="border border-white/10 rounded-lg p-3">
                    <div className="font-mono-data text-[10px] uppercase tracking-widest text-white/40">Confidence</div>
                    <div className="font-mono-data text-lg mt-1">82%</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-3">
                    <div className="font-mono-data text-[10px] uppercase tracking-widest text-white/40">RSI</div>
                    <div className="font-mono-data text-lg mt-1">58.2</div>
                  </div>
                  <div className="border border-white/10 rounded-lg p-3">
                    <div className="font-mono-data text-[10px] uppercase tracking-widest text-white/40">Signal</div>
                    <div className="font-mono-data text-lg mt-1 text-[#4CAF50]">BUY</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features bento */}
      <section id="features" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12">
          <div>
            <div className="font-mono-data text-xs uppercase tracking-[0.2em] text-white/40 mb-3">// Capabilities</div>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Built like a trading terminal,<br />priced like a side project.</h2>
          </div>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((f, i) => (
            <div key={f.title} data-testid={f.testId} className="glass rounded-xl p-7 lift-on-hover">
              <div className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center mb-5">
                <f.icon className="w-5 h-5 text-[#007AFF]" />
              </div>
              <h3 className="font-display text-xl mb-2">{f.title}</h3>
              <p className="text-sm text-white/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5">
            <div className="font-mono-data text-xs uppercase tracking-[0.2em] text-white/40 mb-3">// Model Performance</div>
            <h2 className="font-display text-4xl sm:text-5xl tracking-tight">Tested, measurable, transparent.</h2>
            <p className="mt-6 text-white/60 leading-relaxed">
              Every prediction comes with confidence scores, walk-forward backtested directional accuracy, and full feature importances.
              No black boxes.
            </p>
            <Link to="/showcase" data-testid="metrics-cta"
              className="inline-flex items-center gap-2 mt-8 px-5 py-2.5 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] transition text-sm">
              See the full model breakdown <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="lg:col-span-7 grid grid-cols-2 gap-4">
            {METRICS.map((m) => (
              <div key={m.label} data-testid={`metric-${m.label.replace(/\s+/g, '-').toLowerCase()}`} className="glass rounded-xl p-6">
                <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{m.label}</div>
                <div className="font-mono-data text-4xl font-semibold mt-3 accent-text">{m.value}</div>
                <div className="text-xs text-white/40 mt-2">{m.note}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Markets */}
      <section id="markets" className="max-w-7xl mx-auto px-6 py-24">
        <div className="font-mono-data text-xs uppercase tracking-[0.2em] text-white/40 mb-3">// Coverage</div>
        <h2 className="font-display text-4xl sm:text-5xl tracking-tight mb-12">Wherever the ticker trades.</h2>
        <div className="flex flex-wrap gap-3">
          {MARKETS.map((m) => (
            <div key={m} className="px-5 py-3 rounded-full border border-white/10 bg-white/[0.03] text-sm font-mono-data tracking-wider">
              {m}
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="glass rounded-3xl p-12 lg:p-20 relative overflow-hidden">
          <div className="absolute inset-0 grid-bg opacity-50" />
          <div className="relative">
            <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl tracking-tight max-w-3xl">Ready to see what the model thinks?</h2>
            <p className="mt-6 text-white/60 max-w-xl">Search any ticker — Apple, Tesla, BTC, an ETF — and get a forecast in seconds.</p>
            <Link to="/dashboard" data-testid="final-cta"
              className="inline-flex items-center gap-2 mt-10 px-7 py-3.5 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-white font-medium transition">
              Launch Dashboard <Zap className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/[0.08] py-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-white/40">
          <div className="font-mono-data tracking-wider">STOCKVISION AI · BUILT FOR PORTFOLIO SHOWCASE</div>
          <div className="font-mono-data text-xs">Not financial advice. For educational use.</div>
        </div>
      </footer>
    </div>
  );
}
