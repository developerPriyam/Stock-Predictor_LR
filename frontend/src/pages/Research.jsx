import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Building2, Users, TrendingUp, DollarSign, Activity, BarChart3, Newspaper, ExternalLink, Sparkles } from "lucide-react";
import { fetchProfile, fetchQuote, fetchNews } from "@/lib/api";
import { fmtCompact, fmtNum, fmtPct, fmtPrice } from "@/lib/format";
import LoadingBlock from "@/components/LoadingBlock";
import { useRecent } from "@/lib/storage";

export default function Research() {
  const { ticker: paramTicker } = useParams();
  const nav = useNavigate();
  const ticker = (paramTicker || "AAPL").toUpperCase();
  const [draft, setDraft] = useState(ticker);
  const { push } = useRecent();

  const profileQ = useQuery({ queryKey: ["profile", ticker], queryFn: () => fetchProfile(ticker), retry: 1 });
  const quoteQ = useQuery({ queryKey: ["quote", ticker], queryFn: () => fetchQuote(ticker), retry: 1 });
  const newsQ = useQuery({ queryKey: ["news", ticker], queryFn: () => fetchNews(ticker, 10), retry: 1 });

  const p = profileQ.data;
  const q = quoteQ.data;

  const onSubmit = (e) => {
    e.preventDefault();
    const v = draft.trim().toUpperCase();
    if (!v) return;
    push(v);
    nav(`/research/${v}`);
  };

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-7xl mx-auto">
      <header className="mb-6">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Stock Research</div>
        <h1 className="font-display text-3xl lg:text-4xl tracking-tight mt-1">Company Intelligence</h1>
      </header>

      <form onSubmit={onSubmit} className="glass rounded-xl flex items-center px-4 gap-3 mb-6" data-testid="research-form">
        <Search className="w-5 h-5 text-white/40" />
        <input data-testid="research-ticker-input" value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())}
          placeholder="Search any Yahoo Finance ticker (AAPL, RELIANCE.NS, BTC-USD…)"
          className="flex-1 bg-transparent py-4 outline-none font-mono-data text-lg placeholder:text-white/30" />
        <button type="submit" data-testid="research-search-btn" className="px-4 py-2 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-sm font-medium transition">Research</button>
      </form>

      {profileQ.isLoading ? <LoadingBlock h={300} /> : !p ? (
        <div className="glass rounded-xl p-12 text-center text-white/50">No profile available for {ticker}.</div>
      ) : (
        <>
          {/* Company header */}
          <div className="glass rounded-2xl p-8 mb-6" data-testid="company-overview">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <Building2 className="w-6 h-6 text-[#007AFF]" />
                  <h2 className="font-display text-3xl">{p.name}</h2>
                </div>
                <div className="font-mono-data text-xs text-white/50 mt-2 tracking-wider">{ticker} · {p.exchange} · {p.sector} · {p.industry}</div>
                {p.website && <a href={p.website} target="_blank" rel="noopener noreferrer" className="text-xs text-[#007AFF] hover:underline mt-1 inline-flex items-center gap-1">{p.website} <ExternalLink className="w-3 h-3" /></a>}
              </div>
              {q && (
                <div className="text-right">
                  <div className="font-mono-data text-3xl font-semibold">{fmtPrice(q.price, q.currency)}</div>
                  <div className={`font-mono-data text-sm ${q.change >= 0 ? "text-[#4CAF50]" : "text-[#FF5252]"}`}>
                    {fmtNum(q.change)} ({fmtPct(q.change_percent)})
                  </div>
                </div>
              )}
            </div>
            <p className="text-white/70 leading-relaxed">{p.business_summary}</p>
            {(p.employees || p.country) && (
              <div className="mt-4 flex gap-6 text-xs font-mono-data text-white/50">
                {p.employees && <span>{fmtCompact(p.employees)} employees</span>}
                {p.country && <span>· {p.country}</span>}
              </div>
            )}
          </div>

          {/* Valuation */}
          <Section icon={DollarSign} title="Valuation">
            <Metrics rows={[
              ["Market Cap", fmtCompact(p.market_cap), "metric-mcap"],
              ["Enterprise Value", fmtCompact(p.enterprise_value), "metric-ev"],
              ["P/E (Trailing)", fmtNum(p.pe_ratio), "metric-pe"],
              ["P/E (Forward)", fmtNum(p.forward_pe), "metric-fpe"],
              ["PEG Ratio", fmtNum(p.peg_ratio), "metric-peg"],
              ["P/B", fmtNum(p.price_to_book), "metric-pb"],
              ["EPS (Trailing)", fmtNum(p.eps), "metric-eps"],
              ["EPS (Forward)", fmtNum(p.forward_eps), "metric-feps"],
            ]} />
          </Section>

          {/* Dividends + risk */}
          <Section icon={Activity} title="Dividends & Risk">
            <Metrics rows={[
              ["Dividend Yield", p.dividend_yield ? `${(p.dividend_yield * 100).toFixed(2)}%` : "—", "metric-divy"],
              ["Dividend Rate", fmtPrice(p.dividend_rate, p.currency), "metric-divr"],
              ["Payout Ratio", p.payout_ratio ? `${(p.payout_ratio * 100).toFixed(1)}%` : "—", "metric-payout"],
              ["Beta", fmtNum(p.beta), "metric-beta"],
              ["Debt / Equity", fmtNum(p.debt_to_equity), "metric-de"],
              ["Current Ratio", fmtNum(p.current_ratio), "metric-cr"],
              ["Short Ratio", fmtNum(p.short_ratio), "metric-short"],
              ["Short % Float", p.short_percent_of_float ? `${(p.short_percent_of_float * 100).toFixed(2)}%` : "—", "metric-shortfloat"],
            ]} />
          </Section>

          {/* Profitability */}
          <Section icon={TrendingUp} title="Profitability & Growth">
            <Metrics rows={[
              ["Revenue", fmtCompact(p.revenue), "metric-rev"],
              ["Revenue Growth", p.revenue_growth ? `${(p.revenue_growth * 100).toFixed(2)}%` : "—", "metric-revg"],
              ["Earnings Growth", p.earnings_growth ? `${(p.earnings_growth * 100).toFixed(2)}%` : "—", "metric-eg"],
              ["Gross Margin", p.gross_margins ? `${(p.gross_margins * 100).toFixed(2)}%` : "—", "metric-gm"],
              ["Operating Margin", p.operating_margins ? `${(p.operating_margins * 100).toFixed(2)}%` : "—", "metric-om"],
              ["Profit Margin", p.profit_margins ? `${(p.profit_margins * 100).toFixed(2)}%` : "—", "metric-pm"],
              ["ROE", p.return_on_equity ? `${(p.return_on_equity * 100).toFixed(2)}%` : "—", "metric-roe"],
              ["ROA", p.return_on_assets ? `${(p.return_on_assets * 100).toFixed(2)}%` : "—", "metric-roa"],
            ]} />
          </Section>

          {/* Ownership */}
          <Section icon={Users} title="Ownership">
            <Metrics rows={[
              ["Institutional Ownership", p.held_percent_institutions ? `${(p.held_percent_institutions * 100).toFixed(2)}%` : "—", "metric-inst"],
              ["Insider Ownership", p.held_percent_insiders ? `${(p.held_percent_insiders * 100).toFixed(2)}%` : "—", "metric-insider"],
              ["Shares Outstanding", fmtCompact(p.shares_outstanding), "metric-so"],
              ["Float", fmtCompact(p.float_shares), "metric-float"],
            ]} />
          </Section>

          {/* Analyst targets */}
          {(p.target_mean_price || p.recommendation_key) && (
            <Section icon={BarChart3} title="Analyst Recommendations">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <Metric label="Consensus" value={(p.recommendation_key || "—").toUpperCase()} accent />
                <Metric label="# Analysts" value={fmtNum(p.number_of_analyst_opinions, 0)} />
                <Metric label="Score (1=Buy)" value={fmtNum(p.recommendation_mean)} />
                <Metric label="Mean Target" value={fmtPrice(p.target_mean_price, p.currency)} />
                <Metric label="Low Target" value={fmtPrice(p.target_low_price, p.currency)} />
                <Metric label="High Target" value={fmtPrice(p.target_high_price, p.currency)} />
              </div>
            </Section>
          )}
        </>
      )}

      {/* News */}
      <section className="glass rounded-2xl p-8 mt-6" data-testid="news-section">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Newspaper className="w-5 h-5 text-[#007AFF]" />
            <h2 className="font-display text-2xl">News & Sentiment</h2>
          </div>
          {newsQ.data?.overall_sentiment && (
            <SentimentPill label={newsQ.data.overall_sentiment} score={newsQ.data.average_score} />
          )}
        </div>
        {newsQ.data?.ai_summary && (
          <div className="mb-6 p-4 rounded-xl border border-[#007AFF]/30 bg-[#007AFF]/[0.06]">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-[#007AFF]" />
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-[#007AFF]">AI Summary · Claude Sonnet</span>
            </div>
            <p className="text-sm text-white/85 leading-relaxed">{newsQ.data.ai_summary}</p>
          </div>
        )}
        {newsQ.isLoading ? <LoadingBlock h={200} /> : !newsQ.data?.items?.length ? (
          <div className="text-white/40 text-sm">No news available for {ticker}.</div>
        ) : (
          <div className="space-y-3">
            {newsQ.data.items.map((n, i) => (
              <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" data-testid={`news-item-${i}`}
                className="block p-4 rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/20 transition group">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm group-hover:text-[#007AFF] transition">{n.title}</div>
                    <div className="font-mono-data text-[10px] text-white/40 mt-1.5">{n.publisher} · {n.published_at ? new Date(n.published_at).toLocaleDateString() : "—"}</div>
                  </div>
                  <SentimentPill label={n.sentiment_label} score={n.sentiment_score} small />
                </div>
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Section({ icon: Icon, title, children }) {
  return (
    <section className="glass rounded-2xl p-8 mb-6 lift-on-hover">
      <div className="flex items-center gap-3 mb-5">
        <Icon className="w-5 h-5 text-[#007AFF]" />
        <h2 className="font-display text-xl">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function Metrics({ rows }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {rows.map(([label, value, id]) => <Metric key={label} label={label} value={value} testId={id} />)}
    </div>
  );
}

function Metric({ label, value, testId, accent }) {
  return (
    <div className="border border-white/10 rounded-lg p-4" data-testid={testId}>
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`font-mono-data text-lg mt-2 ${accent ? "text-[#4CAF50]" : "text-white"}`}>{value}</div>
    </div>
  );
}

function SentimentPill({ label, score, small }) {
  const map = {
    Bullish: "bg-[#00C853]/10 border-[#00C853]/30 text-[#4CAF50]",
    Bearish: "bg-[#FF3B30]/10 border-[#FF3B30]/30 text-[#FF5252]",
    Neutral: "bg-white/[0.04] border-white/10 text-white/70",
  };
  return (
    <span className={`shrink-0 ${small ? "text-[10px]" : "text-xs"} font-mono-data px-2.5 py-1 rounded-md border ${map[label] || map.Neutral}`}>
      {label.toUpperCase()}{score !== undefined && score !== null ? ` ${score > 0 ? "+" : ""}${(score * 100).toFixed(0)}` : ""}
    </span>
  );
}
