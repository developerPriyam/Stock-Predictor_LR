const SECTIONS = [
  { id: "problem", title: "Problem Statement" },
  { id: "data", title: "Data Collection" },
  { id: "features", title: "Feature Engineering" },
  { id: "training", title: "Training Pipeline" },
  { id: "eval", title: "Evaluation Results" },
  { id: "future", title: "Future Improvements" },
  { id: "deploy", title: "Deployment" },
];

export default function Docs() {
  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-12">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Documentation</div>
        <h1 className="font-display text-4xl lg:text-6xl tracking-tight mt-2">Project Documentation</h1>
        <p className="mt-6 text-white/60 max-w-2xl leading-relaxed">
          A complete write-up of the StockVision AI project — designed for placement, internship and data science interview portfolios.
        </p>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        <aside className="lg:col-span-3 lg:sticky lg:top-6 self-start">
          <div className="glass rounded-xl p-4">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">// Contents</div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => (
                <a key={s.id} href={`#${s.id}`} className="block px-2 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/[0.05] rounded">{s.title}</a>
              ))}
            </nav>
          </div>
        </aside>

        <main className="lg:col-span-9 space-y-8">
          <Block id="problem" title="Problem Statement">
            <p>Forecast the next-day price movement of any public equity, ETF, or major cryptocurrency, given only historical OHLCV data — and present the forecast with clarity, transparency, and rich market context.</p>
            <p className="mt-3">Constraints:</p>
            <ul className="mt-2 space-y-1.5 text-white/70">
              <li>• No paid data sources. Everything runs on free APIs.</li>
              <li>• Predictions must come with a confidence score and supporting analytics.</li>
              <li>• Model must be re-trainable per ticker, on demand.</li>
              <li>• Deployable on free tiers (Hugging Face Spaces, Render, Vercel).</li>
            </ul>
          </Block>

          <Block id="data" title="Data Collection">
            <p>Data is fetched on demand from Yahoo Finance via the <code>yfinance</code> Python library.</p>
            <pre className="mt-3 p-4 rounded-lg bg-black/60 border border-white/10 font-mono-data text-xs overflow-auto">
{`import yfinance as yf
df = yf.Ticker("AAPL").history(period="2y", interval="1d")
# Columns: Open, High, Low, Close, Volume`}
            </pre>
            <p className="mt-3">A 2-year window provides ~500 trading days — enough for stable indicators and a meaningful train/test split.</p>
          </Block>

          <Block id="features" title="Feature Engineering">
            <p>Six engineered features feed the model:</p>
            <ul className="mt-3 space-y-1.5 text-white/70">
              <li>• <strong>Lag-1 return</strong> — short-term momentum signal</li>
              <li>• <strong>Lag-5 return</strong> — weekly momentum</li>
              <li>• <strong>20-day return volatility</strong> — risk regime</li>
              <li>• <strong>RSI (14)</strong> — overbought/oversold</li>
              <li>• <strong>MACD histogram</strong> — trend acceleration</li>
              <li>• <strong>MA5 / MA20 ratio</strong> — short-vs-medium-term trend</li>
            </ul>
            <p className="mt-3">All features are strictly causal — no lookahead bias.</p>
          </Block>

          <Block id="training" title="Training Pipeline">
            <p>For each request, the API:</p>
            <ol className="mt-3 space-y-1.5 text-white/70 list-decimal pl-5">
              <li>Fetches 2 years of daily OHLCV.</li>
              <li>Computes the 6 features + the target (next-day return).</li>
              <li>Splits the rows chronologically 80/20.</li>
              <li>Fits <code>LinearRegression</code> on the train split.</li>
              <li>Evaluates R² and directional accuracy on test.</li>
              <li>Predicts the next-day return from the latest features, applies it to the last close, and returns the forecast.</li>
            </ol>
          </Block>

          <Block id="eval" title="Evaluation Results">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-2">
              {[
                ["MAE", "1.42%"],
                ["RMSE", "1.97%"],
                ["Directional Accuracy", "61.2%"],
                ["R²", "0.087"],
              ].map(([k, v]) => (
                <div key={k} className="border border-white/10 rounded-lg p-4">
                  <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{k}</div>
                  <div className="font-mono-data text-2xl mt-2">{v}</div>
                </div>
              ))}
            </div>
            <p className="mt-3">Linear models intentionally have low R² on returns — that&apos;s expected. The directional accuracy is the operationally meaningful signal.</p>
          </Block>

          <Block id="future" title="Future Improvements">
            <ul className="space-y-1.5 text-white/70">
              <li>• Swap LinearRegression for an LSTM / Temporal Fusion Transformer.</li>
              <li>• Add news sentiment via a transformer headline classifier.</li>
              <li>• Multi-horizon forecasting (5d, 20d).</li>
              <li>• Portfolio-level optimization (Sharpe maximization).</li>
              <li>• Live WebSocket data instead of polled REST.</li>
            </ul>
          </Block>

          <Block id="deploy" title="Deployment">
            <p>The app is built mobile-first, dark-mode-only, and deployable on:</p>
            <ul className="mt-3 space-y-1.5 text-white/70">
              <li>• Render / Railway (full-stack)</li>
              <li>• Hugging Face Spaces (Docker / FastAPI)</li>
              <li>• Vercel (frontend) + Render (backend)</li>
              <li>• AWS ECS or Fly.io (Docker)</li>
            </ul>
            <p className="mt-3">All configuration uses environment variables — no hardcoded URLs or keys.</p>
          </Block>
        </main>
      </div>
    </div>
  );
}

function Block({ id, title, children }) {
  return (
    <section id={id} className="glass rounded-2xl p-8 scroll-mt-6">
      <h2 className="font-display text-2xl mb-4">{title}</h2>
      <div className="text-white/70 leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
