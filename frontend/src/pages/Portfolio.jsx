import { useState, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { Plus, Trash2, Wallet, TrendingUp, TrendingDown } from "lucide-react";
import { fetchQuote } from "@/lib/api";
import { fmtPrice, fmtNum, fmtPct, fmtCompact } from "@/lib/format";
import { usePortfolio } from "@/lib/storage";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

const PALETTE = ["#007AFF", "#00C853", "#FFB300", "#FF5252", "#A78BFA", "#26C6DA", "#FF6E40", "#9CCC65"];

export default function Portfolio() {
  const { holdings, add, remove } = usePortfolio();
  const [draft, setDraft] = useState({ symbol: "", shares: "", cost_basis: "" });

  const quoteResults = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ["quote", h.symbol],
      queryFn: () => fetchQuote(h.symbol),
      retry: 1,
    })),
  });

  const enriched = useMemo(() => {
    return holdings.map((h, i) => {
      const q = quoteResults[i]?.data;
      const price = q?.price || 0;
      const value = price * Number(h.shares || 0);
      const cost = Number(h.cost_basis || 0) * Number(h.shares || 0);
      const pnl = value - cost;
      const pnl_pct = cost ? (pnl / cost) * 100 : 0;
      const day_change = (q?.change || 0) * Number(h.shares || 0);
      return { ...h, price, value, cost, pnl, pnl_pct, day_change, currency: q?.currency || "USD", name: q?.name || h.symbol, sector: q?.sector || "—" };
    });
  }, [holdings, quoteResults]);

  const totals = useMemo(() => {
    const value = enriched.reduce((s, r) => s + r.value, 0);
    const cost = enriched.reduce((s, r) => s + r.cost, 0);
    const day = enriched.reduce((s, r) => s + r.day_change, 0);
    return { value, cost, pnl: value - cost, pnl_pct: cost ? ((value - cost) / cost) * 100 : 0, day, day_pct: value ? (day / (value - day)) * 100 : 0 };
  }, [enriched]);

  const sectorAlloc = useMemo(() => {
    const m = new Map();
    enriched.forEach((r) => m.set(r.sector || "—", (m.get(r.sector || "—") || 0) + r.value));
    return Array.from(m.entries()).map(([name, value]) => ({ name, value }));
  }, [enriched]);

  const submit = (e) => {
    e.preventDefault();
    const sym = draft.symbol.trim().toUpperCase();
    const sh = Number(draft.shares);
    const cb = Number(draft.cost_basis);
    if (!sym || !sh || sh <= 0 || !cb || cb <= 0) return;
    add({ symbol: sym, shares: sh, cost_basis: cb });
    setDraft({ symbol: "", shares: "", cost_basis: "" });
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Portfolio</div>
          <h1 className="font-display text-3xl lg:text-4xl tracking-tight mt-1">My Holdings</h1>
        </div>
        <div className="font-mono-data text-[10px] text-white/40 tracking-wider">DATA STORED LOCALLY · NO ACCOUNT REQUIRED</div>
      </header>

      {/* Add holding */}
      <form onSubmit={submit} className="glass rounded-xl p-5 mb-6 grid grid-cols-1 md:grid-cols-4 gap-3" data-testid="portfolio-form">
        <input value={draft.symbol} onChange={(e) => setDraft({ ...draft, symbol: e.target.value.toUpperCase() })}
          placeholder="Ticker (e.g. AAPL)" data-testid="portfolio-symbol-input"
          className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 font-mono-data text-sm outline-none focus:border-[#007AFF]" />
        <input value={draft.shares} onChange={(e) => setDraft({ ...draft, shares: e.target.value })} type="number" step="any" min="0"
          placeholder="Shares" data-testid="portfolio-shares-input"
          className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 font-mono-data text-sm outline-none focus:border-[#007AFF]" />
        <input value={draft.cost_basis} onChange={(e) => setDraft({ ...draft, cost_basis: e.target.value })} type="number" step="any" min="0"
          placeholder="Avg cost per share" data-testid="portfolio-cost-input"
          className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 font-mono-data text-sm outline-none focus:border-[#007AFF]" />
        <button type="submit" data-testid="portfolio-add-btn"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-sm font-medium transition">
          <Plus className="w-4 h-4" /> Add Holding
        </button>
      </form>

      {/* Summary */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6" data-testid="portfolio-summary">
          <SummaryCard label="Total Value" value={fmtPrice(totals.value, "USD")} />
          <SummaryCard label="Cost Basis" value={fmtPrice(totals.cost, "USD")} />
          <SummaryCard label="Total P&L" value={`${fmtPrice(totals.pnl, "USD")} (${fmtPct(totals.pnl_pct)})`} pos={totals.pnl >= 0} />
          <SummaryCard label="Today's Change" value={`${fmtPrice(totals.day, "USD")} (${fmtPct(totals.day_pct)})`} pos={totals.day >= 0} />
        </div>
      )}

      {/* Allocation pies */}
      {holdings.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="glass rounded-2xl p-6" data-testid="alloc-by-holding">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">// Allocation by holding</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={enriched.map((r) => ({ name: r.symbol, value: r.value }))} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {enriched.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="glass rounded-2xl p-6" data-testid="alloc-by-sector">
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-3">// Sector allocation</div>
            <div className="w-full h-64">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={sectorAlloc} dataKey="value" innerRadius={55} outerRadius={90} paddingAngle={2}>
                    {sectorAlloc.map((_, i) => <Cell key={i} fill={PALETTE[(i + 3) % PALETTE.length]} stroke="none" />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: "rgba(10,10,10,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                  <Legend wrapperStyle={{ fontFamily: "IBM Plex Mono", fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Holdings table */}
      <div className="glass rounded-2xl p-6 overflow-x-auto" data-testid="portfolio-table">
        {holdings.length === 0 ? (
          <div className="text-center py-12">
            <Wallet className="w-10 h-10 text-white/30 mx-auto mb-3" />
            <div className="font-display text-xl mb-2">No holdings yet</div>
            <div className="text-white/50 text-sm">Add your first position using the form above.</div>
          </div>
        ) : (
          <table className="w-full text-sm font-mono-data">
            <thead>
              <tr className="text-white/40 text-xs uppercase tracking-wider">
                <th className="text-left py-2 pr-4">Symbol</th>
                <th className="text-right py-2 px-3">Shares</th>
                <th className="text-right py-2 px-3">Avg Cost</th>
                <th className="text-right py-2 px-3">Price</th>
                <th className="text-right py-2 px-3">Value</th>
                <th className="text-right py-2 px-3">Day Δ</th>
                <th className="text-right py-2 px-3">P&L</th>
                <th className="text-right py-2 px-3">P&L %</th>
                <th className="text-right py-2 pl-3"></th>
              </tr>
            </thead>
            <tbody>
              {enriched.map((r, i) => (
                <tr key={r.symbol} className="border-t border-white/[0.05] hover:bg-white/[0.03]" data-testid={`holding-${r.symbol}`}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                      <div>
                        <div>{r.symbol}</div>
                        <div className="text-[10px] text-white/40">{r.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className="text-right px-3">{fmtNum(r.shares, 4)}</td>
                  <td className="text-right px-3">{fmtPrice(r.cost_basis, r.currency)}</td>
                  <td className="text-right px-3">{fmtPrice(r.price, r.currency)}</td>
                  <td className="text-right px-3 text-white">{fmtPrice(r.value, r.currency)}</td>
                  <td className={`text-right px-3 ${r.day_change >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{fmtNum(r.day_change)}</td>
                  <td className={`text-right px-3 ${r.pnl >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{fmtNum(r.pnl)}</td>
                  <td className={`text-right px-3 ${r.pnl_pct >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{fmtPct(r.pnl_pct)}</td>
                  <td className="text-right pl-3">
                    <button onClick={() => remove(r.symbol)} data-testid={`remove-${r.symbol}`} className="text-white/40 hover:text-[#FF5252] transition">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, pos }) {
  return (
    <div className="glass rounded-xl p-5">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`font-mono-data text-xl mt-2 ${pos === undefined ? "text-white" : pos ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>{value}</div>
    </div>
  );
}
