import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Plus, GitCompare } from "lucide-react";
import { fetchCompare } from "@/lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice } from "@/lib/format";
import LoadingBlock from "@/components/LoadingBlock";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";

const PALETTE = ["#007AFF", "#00C853", "#FFB300", "#FF5252", "#A78BFA"];

export default function Compare() {
  const [tickers, setTickers] = useState(["AAPL", "MSFT", "TSLA"]);
  const [draft, setDraft] = useState("");

  const compareQ = useQuery({
    queryKey: ["compare", tickers],
    queryFn: () => fetchCompare(tickers),
    enabled: tickers.length > 0,
    retry: 1,
  });

  const addTicker = () => {
    const v = draft.trim().toUpperCase();
    if (!v || tickers.includes(v) || tickers.length >= 5) return;
    setTickers([...tickers, v]);
    setDraft("");
  };
  const remove = (s) => setTickers(tickers.filter((t) => t !== s));

  const data = compareQ.data;

  // Build merged series for chart
  const chartData = (() => {
    if (!data?.series?.length) return [];
    const map = new Map();
    data.series.forEach((s) => {
      s.points.forEach((p) => {
        if (!map.has(p.date)) map.set(p.date, { date: p.date });
        map.get(p.date)[s.symbol] = p.value;
      });
    });
    return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
  })();

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Multi-Stock Compare</div>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tight mt-1">Side-by-side Analysis</h1>
        <p className="text-white/50 text-sm mt-2">Compare up to 5 tickers across price, volatility, returns, predictions and correlation.</p>
      </header>

      {/* Ticker pills + add */}
      <div className="glass rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-2 items-center" data-testid="compare-pills">
          {tickers.map((t, i) => (
            <div key={t} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-mono-data border" style={{ borderColor: PALETTE[i % PALETTE.length] + "55", background: PALETTE[i % PALETTE.length] + "11" }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
              {t}
              <button onClick={() => remove(t)} data-testid={`remove-${t}`} className="text-white/40 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
          {tickers.length < 5 && (
            <div className="inline-flex items-center gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTicker())}
                placeholder="Add ticker…" data-testid="compare-ticker-input"
                className="bg-black/40 border border-white/10 rounded-full px-3 py-1.5 text-sm font-mono-data outline-none focus:border-[#007AFF] w-32" />
              <button onClick={addTicker} data-testid="compare-add-btn" className="p-1.5 rounded-full bg-[#007AFF] hover:bg-[#3395FF] transition">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {compareQ.isLoading ? <LoadingBlock h={400} /> : !data ? null : (
        <>
          {/* Normalized performance chart */}
          <div className="glass rounded-2xl p-6 mb-6" data-testid="compare-chart">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Normalized 1Y Performance (start = 100)</div>
                <div className="font-display text-lg mt-1">Relative Returns</div>
              </div>
            </div>
            <div className="w-full h-80">
              <ResponsiveContainer>
                <LineChart data={chartData} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} minTickGap={50} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} orientation="right" />
                  <Tooltip contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "rgba(255,255,255,0.5)", fontFamily: "IBM Plex Mono", fontSize: 11 }} itemStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  {tickers.map((sym, i) => <Line key={sym} type="monotone" dataKey={sym} stroke={PALETTE[i % PALETTE.length]} strokeWidth={1.8} dot={false} />)}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Comparison table */}
          <div className="glass rounded-2xl p-6 mb-6 overflow-x-auto" data-testid="compare-table">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">// Side-by-side metrics</div>
            <table className="w-full text-sm font-mono-data">
              <thead>
                <tr className="text-white/40 text-xs uppercase tracking-wider">
                  <th className="text-left py-2 pr-4">Ticker</th>
                  <th className="text-right py-2 px-3">Price</th>
                  <th className="text-right py-2 px-3">1M</th>
                  <th className="text-right py-2 px-3">1Y</th>
                  <th className="text-right py-2 px-3">Vol (ann.)</th>
                  <th className="text-right py-2 px-3">RSI</th>
                  <th className="text-right py-2 px-3">P/E</th>
                  <th className="text-right py-2 px-3">β</th>
                  <th className="text-right py-2 px-3">Mkt Cap</th>
                  <th className="text-right py-2 px-3">Predicted</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.symbol} className="border-t border-white/[0.05] hover:bg-white/[0.03] transition" data-testid={`row-${r.symbol}`}>
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                        <div>
                          <div className="text-white">{r.symbol}</div>
                          {r.name && <div className="text-[10px] text-white/40">{r.name}</div>}
                        </div>
                      </div>
                    </td>
                    {r.error ? <td colSpan={9} className="py-3 text-[#FF5252] text-xs">Error: {r.error}</td> : (
                      <>
                        <td className="text-right px-3">{fmtNum(r.price)}</td>
                        <td className={`text-right px-3 ${r.change_1m >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{fmtPct(r.change_1m)}</td>
                        <td className={`text-right px-3 ${r.change_1y >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{fmtPct(r.change_1y)}</td>
                        <td className="text-right px-3">{fmtNum(r.volatility)}%</td>
                        <td className="text-right px-3">{fmtNum(r.rsi, 1)}</td>
                        <td className="text-right px-3">{fmtNum(r.pe_ratio)}</td>
                        <td className="text-right px-3">{fmtNum(r.beta)}</td>
                        <td className="text-right px-3">{fmtCompact(r.market_cap)}</td>
                        <td className={`text-right px-3 ${r.predicted_change_pct >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>
                          {fmtPct(r.predicted_change_pct)} <span className="text-white/40">{r.predicted_trend}</span>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Correlation matrix */}
          {Object.keys(data.correlation || {}).length > 1 && (
            <div className="glass rounded-2xl p-6 mb-6 overflow-x-auto" data-testid="correlation-matrix">
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-4">// Daily-Return Correlation (1Y)</div>
              <CorrelationGrid corr={data.correlation} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function CorrelationGrid({ corr }) {
  const tickers = Object.keys(corr);
  const cellColor = (v) => {
    if (v === undefined || v === null) return "rgba(255,255,255,0.04)";
    if (v > 0) return `rgba(0, 200, 83, ${Math.min(0.7, v)})`;
    return `rgba(255, 59, 48, ${Math.min(0.7, Math.abs(v))})`;
  };
  return (
    <table className="border-separate border-spacing-1">
      <thead>
        <tr>
          <th></th>
          {tickers.map((t) => <th key={t} className="font-mono-data text-xs text-white/60 px-3 py-1">{t}</th>)}
        </tr>
      </thead>
      <tbody>
        {tickers.map((a) => (
          <tr key={a}>
            <th className="font-mono-data text-xs text-white/60 px-3 py-1 text-right">{a}</th>
            {tickers.map((b) => (
              <td key={b} className="font-mono-data text-xs text-center px-3 py-2 rounded" style={{ background: cellColor(corr[a][b]), minWidth: 70 }}>
                {corr[a][b]?.toFixed(2)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
