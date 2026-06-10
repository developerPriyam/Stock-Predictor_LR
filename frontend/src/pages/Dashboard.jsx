import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Search, Download, Share2, TrendingUp, TrendingDown, AlertCircle, Star, Sparkles, Clock, Cpu } from "lucide-react";
import { fetchPopular, fetchQuote, fetchHistory, fetchIndicators, fetchPrediction, fetchAnalytics, searchTickers, fetchExplain, fetchModelInfo } from "@/lib/api";
import { fmtPrice, fmtPct, fmtCompact, fmtVolume, fmtNum } from "@/lib/format";
import PriceChart from "@/components/charts/PriceChart";
import VolumeChart from "@/components/charts/VolumeChart";
import IndicatorChart from "@/components/charts/IndicatorChart";
import SentimentDonut from "@/components/charts/SentimentDonut";
import FeatureImportance from "@/components/charts/FeatureImportance";
import Gauge from "@/components/charts/Gauge";
import StatCard from "@/components/StatCard";
import PredictionCard from "@/components/PredictionCard";
import ExplanationCard from "@/components/ExplanationCard";
import LoadingBlock from "@/components/LoadingBlock";
import { downloadCSV, downloadPredictionPDF } from "@/lib/export";
import { useWatchlist, useRecent } from "@/lib/storage";

const PERIODS = ["1M", "3M", "6M", "1Y", "5Y"];

export default function Dashboard() {
  const [ticker, setTicker] = useState("AAPL");
  const [draft, setDraft] = useState("AAPL");
  const [debouncedDraft, setDebouncedDraft] = useState("AAPL");
  const [showSuggest, setShowSuggest] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedDraft(draft), 200);
    return () => clearTimeout(t);
  }, [draft]);

  const watch = useWatchlist();
  const recent = useRecent();

  const selectTicker = (v) => {
    const up = v.toUpperCase();
    setTicker(up);
    setDraft(up);
    recent.push(up);
  };

  const suggestQ = useQuery({
    queryKey: ["search", debouncedDraft],
    queryFn: () => searchTickers(debouncedDraft),
    enabled: showSuggest && debouncedDraft.length > 0,
    staleTime: 60000,
  });
  const suggestions = suggestQ.data?.results || [];

  const modelQ = useQuery({ queryKey: ["model-info"], queryFn: fetchModelInfo });
  const [period, setPeriod] = useState("1Y");
  const popularQ = useQuery({ queryKey: ["popular"], queryFn: fetchPopular });
  const quoteQ = useQuery({ queryKey: ["quote", ticker], queryFn: () => fetchQuote(ticker), enabled: !!ticker, retry: 1 });
  const histQ = useQuery({ queryKey: ["history", ticker, period], queryFn: () => fetchHistory(ticker, period), enabled: !!ticker, retry: 1 });
  const indQ = useQuery({ queryKey: ["ind", ticker, period], queryFn: () => fetchIndicators(ticker, period), enabled: !!ticker, retry: 1 });
  const predQ = useQuery({ queryKey: ["pred", ticker], queryFn: () => fetchPrediction(ticker), enabled: !!ticker, retry: 1 });
  const anaQ = useQuery({ queryKey: ["ana", ticker], queryFn: () => fetchAnalytics(ticker), enabled: !!ticker, retry: 1 });
  const explainQ = useQuery({ queryKey: ["explain", ticker], queryFn: () => fetchExplain(ticker), enabled: !!ticker && !!predQ.data, retry: 1 });

  useEffect(() => {
    const err = quoteQ.error || histQ.error || predQ.error;
    if (err) toast.error(`Could not load data for ${ticker}. Try another ticker.`);
  }, [quoteQ.error, histQ.error, predQ.error, ticker]);

  const onSubmit = (e) => { e?.preventDefault?.(); const v = (draft || "").trim().toUpperCase(); if (!v) return; selectTicker(v); setShowSuggest(false); };
  const onShare = async () => {
    const url = `${window.location.origin}/dashboard?ticker=${ticker}`;
    try { await navigator.clipboard.writeText(url); toast.success("Share link copied"); }
    catch { toast.message(url); }
  };
  const onExportCSV = () => { if (!histQ.data?.candles?.length) return toast.error("No data to export"); downloadCSV(histQ.data.candles, `${ticker}_${period}_history.csv`); toast.success("CSV downloaded"); };
  const onExportPDF = () => { if (!predQ.data) return toast.error("Prediction not ready"); downloadPredictionPDF({ ticker, quote: quoteQ.data, prediction: predQ.data, analytics: anaQ.data }); toast.success("Report downloaded"); };

  const quote = quoteQ.data;
  const isUp = (quote?.change || 0) >= 0;
  const customModel = modelQ.data?.plugin?.active;

  return (
    <div className="min-h-screen p-4 lg:p-8 max-w-[1600px] mx-auto">
      <header className="mb-6 flex flex-col lg:flex-row lg:items-center gap-4 justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Dashboard</div>
            <h1 className="font-display text-3xl lg:text-4xl tracking-tight mt-1">Market Forecast</h1>
          </div>
          {customModel && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#00C853]/40 bg-[#00C853]/10" data-testid="custom-model-badge">
              <Cpu className="w-3.5 h-3.5 text-[#00C853]" />
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-[#4CAF50]">Custom Model Active</span>
            </div>
          )}
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to={`/research/${ticker}`} data-testid="btn-research" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm transition">
            Research
          </Link>
          <button onClick={onShare} data-testid="btn-share" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm transition">
            <Share2 className="w-4 h-4" /> Share
          </button>
          <button onClick={onExportCSV} data-testid="btn-export-csv" className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-sm transition">
            <Download className="w-4 h-4" /> CSV
          </button>
          <button onClick={onExportPDF} data-testid="btn-export-pdf" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-sm font-medium transition">
            <Download className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      {/* Search */}
      <form onSubmit={onSubmit} className="relative mb-4" data-testid="search-form">
        <div className="glass rounded-xl flex items-center px-4 gap-3">
          <Search className="w-5 h-5 text-white/40" />
          <input data-testid="ticker-input" value={draft}
            onChange={(e) => { setDraft(e.target.value.toUpperCase()); setShowSuggest(true); }}
            onFocus={() => setShowSuggest(true)} onBlur={() => setTimeout(() => setShowSuggest(false), 200)}
            placeholder="Any Yahoo Finance ticker — AAPL, RELIANCE.NS, ^NSEI, BTC-USD…"
            className="flex-1 bg-transparent py-4 outline-none font-mono-data text-lg placeholder:text-white/30" />
          <button type="button" onClick={() => watch.toggle(ticker)} data-testid="btn-watchlist-toggle"
            className={`p-2 rounded-md transition ${watch.isIn(ticker) ? "text-[#FFB300]" : "text-white/40 hover:text-white"}`}>
            <Star className="w-4 h-4" fill={watch.isIn(ticker) ? "#FFB300" : "transparent"} />
          </button>
          <button type="submit" data-testid="btn-search" className="px-4 py-2 rounded-md bg-[#007AFF] hover:bg-[#3395FF] text-sm font-medium transition">Analyze</button>
        </div>
        {showSuggest && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 glass-strong rounded-xl py-2 z-40 max-h-96 overflow-auto">
            {suggestions.map((s) => (
              <button key={s.symbol} type="button" data-testid={`suggest-${s.symbol}`}
                onClick={() => { selectTicker(s.symbol); setShowSuggest(false); }}
                className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-white/[0.05] text-left">
                <div>
                  <div className="font-mono-data text-sm">{s.symbol}</div>
                  <div className="text-xs text-white/50">{s.name}</div>
                </div>
                <span className="font-mono-data text-[10px] uppercase tracking-widest text-white/40">{s.market}</span>
              </button>
            ))}
          </div>
        )}
      </form>

      {/* Watchlist + Recent */}
      <div className="flex flex-col lg:flex-row gap-3 mb-6">
        {watch.list.length > 0 && (
          <div className="flex-1 glass rounded-xl px-4 py-3" data-testid="watchlist-strip">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-3 h-3 text-[#FFB300]" />
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/50">Watchlist</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {watch.list.map((s) => (
                <button key={s} data-testid={`watch-${s}`} onClick={() => selectTicker(s)}
                  className={`text-xs font-mono-data px-2.5 py-1 rounded-full border transition ${ticker === s ? "border-[#FFB300] bg-[#FFB300]/10 text-[#FFB300]" : "border-white/10 hover:bg-white/[0.05]"}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {recent.list.length > 1 && (
          <div className="flex-1 glass rounded-xl px-4 py-3" data-testid="recent-strip">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-3 h-3 text-white/50" />
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/50">Recent Searches</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {recent.list.filter((s) => s !== ticker).slice(0, 6).map((s) => (
                <button key={s} data-testid={`recent-${s}`} onClick={() => selectTicker(s)}
                  className="text-xs font-mono-data px-2.5 py-1 rounded-full border border-white/10 hover:bg-white/[0.05] transition">
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Popular pills */}
      <div className="flex gap-2 overflow-x-auto pb-3 mb-6" data-testid="popular-pills">
        {(popularQ.data?.tickers || []).slice(0, 12).map((t) => (
          <button key={t.symbol} data-testid={`pill-${t.symbol}`} onClick={() => selectTicker(t.symbol)}
            className={`shrink-0 px-3 py-1.5 rounded-full border text-xs font-mono-data tracking-wider transition ${ticker === t.symbol ? "border-[#007AFF] bg-[#007AFF]/10 text-white" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-white/70"}`}>
            {t.symbol}
          </button>
        ))}
      </div>

      {/* Top stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-6 col-span-1 md:col-span-2" data-testid="hero-quote">
          {quoteQ.isLoading ? <LoadingBlock h={80} /> : quote ? (
            <>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{quote.exchange} · {quote.currency}</div>
                  <div className="font-display text-2xl mt-1">{quote.name}</div>
                  <div className="font-mono-data text-xs text-white/40 mt-1">{quote.sector} · {quote.industry}</div>
                </div>
                <div className={`px-2.5 py-1 rounded-md text-xs font-mono-data ${isUp ? "bg-[#00C853]/10 border border-[#00C853]/30 text-[#4CAF50]" : "bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF5252]"}`}>
                  {isUp ? "BULLISH" : "BEARISH"}
                </div>
              </div>
              <div className="mt-6 flex items-end gap-4 flex-wrap">
                <div className="font-mono-data text-5xl font-semibold">{fmtPrice(quote.price, quote.currency)}</div>
                <div className={`font-mono-data text-base ${isUp ? "text-[#4CAF50]" : "text-[#FF5252]"} flex items-center gap-1`}>
                  {isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  {fmtNum(quote.change)} ({fmtPct(quote.change_percent)})
                </div>
              </div>
            </>
          ) : <div className="text-white/40 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4" /> No data</div>}
        </div>
        <StatCard label="Market Cap" value={quote ? fmtCompact(quote.market_cap) : "—"} testId="stat-marketcap" />
        <StatCard label="Volume" value={quote ? fmtVolume(quote.volume) : "—"} testId="stat-volume" />
        <StatCard label="52W High" value={quote ? fmtPrice(quote.fifty_two_week_high, quote.currency) : "—"} testId="stat-52wh" />
        <StatCard label="52W Low" value={quote ? fmtPrice(quote.fifty_two_week_low, quote.currency) : "—"} testId="stat-52wl" />
        <StatCard label="Day Open" value={quote ? fmtPrice(quote.open, quote.currency) : "—"} testId="stat-open" />
        <StatCard label="Day Range" value={quote ? `${fmtNum(quote.low)} – ${fmtNum(quote.high)}` : "—"} testId="stat-range" />
      </div>

      {/* Chart + Prediction */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <div className="glass rounded-xl p-6 lg:col-span-2" data-testid="chart-block">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Price History</div>
              <div className="font-display text-lg mt-1">{ticker} · {period}</div>
            </div>
            <div className="flex gap-1 p-1 rounded-lg border border-white/10 bg-black/40">
              {PERIODS.map((p) => (
                <button key={p} data-testid={`period-${p}`} onClick={() => setPeriod(p)}
                  className={`px-3 py-1 rounded-md text-xs font-mono-data transition ${period === p ? "bg-white/10 text-white" : "text-white/50 hover:text-white"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          {histQ.isLoading ? <LoadingBlock h={320} /> : <PriceChart candles={histQ.data?.candles || []} />}
          <div className="mt-4">{histQ.data?.candles?.length ? <VolumeChart candles={histQ.data.candles} /> : null}</div>
        </div>
        <div data-testid="prediction-block">
          {predQ.isLoading ? <div className="glass rounded-xl p-6"><LoadingBlock h={300} /></div> : <PredictionCard prediction={predQ.data} currency={quote?.currency} />}
        </div>
      </div>

      {/* Explainability */}
      <div className="mb-6" data-testid="explain-block">
        {explainQ.data && <ExplanationCard data={explainQ.data} />}
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <div className="glass rounded-xl p-6">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Moving Averages & Bollinger</div>
          <div className="font-display text-lg mt-1 mb-4">Trend Indicators</div>
          {indQ.isLoading ? <LoadingBlock h={240} /> : <IndicatorChart data={indQ.data?.indicators || []} mode="ma_bb" />}
        </div>
        <div className="glass rounded-xl p-6">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// RSI & MACD</div>
          <div className="font-display text-lg mt-1 mb-4">Momentum Indicators</div>
          {indQ.isLoading ? <LoadingBlock h={240} /> : <IndicatorChart data={indQ.data?.indicators || []} mode="rsi_macd" />}
        </div>
      </div>

      {/* Analytics row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="glass rounded-xl p-6" data-testid="analytics-trend">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Trend Strength</div>
          <Gauge value={anaQ.data?.trend_strength || 0} label={anaQ.data?.trend_direction === "up" ? "Uptrend" : "Downtrend"} color={anaQ.data?.trend_direction === "up" ? "#00C853" : "#FF3B30"} />
        </div>
        <div className="glass rounded-xl p-6" data-testid="analytics-confidence">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Confidence</div>
          <Gauge value={predQ.data?.confidence || 0} label={`${Math.round((predQ.data?.confidence || 0) * 100)}% confident`} color="#007AFF" />
        </div>
        <div className="glass rounded-xl p-6" data-testid="analytics-sentiment">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Market Sentiment</div>
          <SentimentDonut sentiment={anaQ.data?.sentiment} />
        </div>
        <div className="glass rounded-xl p-6" data-testid="analytics-features">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// Feature Importance</div>
          <FeatureImportance features={predQ.data?.feature_importance || []} />
        </div>
      </div>

      {/* Bottom analytics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="analytics-bottom">
        <AnalyticStat label="Volatility" value={anaQ.data ? `${fmtNum(anaQ.data.volatility_pct)}%` : "—"} />
        <AnalyticStat label="Momentum 14d" value={anaQ.data ? fmtPct(anaQ.data.momentum_pct) : "—"} positive={anaQ.data?.momentum_pct >= 0} />
        <AnalyticStat label="Risk Level" value={anaQ.data?.risk_level || "—"} />
        <AnalyticStat label="Max Drawdown" value={anaQ.data ? `-${fmtNum(anaQ.data.max_drawdown_pct)}%` : "—"} negative />
        <AnalyticStat label="Support" value={anaQ.data ? fmtPrice(anaQ.data.support, quote?.currency) : "—"} />
        <AnalyticStat label="Resistance" value={anaQ.data ? fmtPrice(anaQ.data.resistance, quote?.currency) : "—"} />
      </div>

      {/* Model meta footer */}
      {predQ.data && (
        <div className="mt-6 glass rounded-xl px-5 py-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-xs font-mono-data text-white/50" data-testid="model-meta">
          <span className="flex items-center gap-2"><Cpu className="w-3 h-3 text-[#007AFF]" /> {predQ.data.model}</span>
          <span>· Source: <span className={predQ.data.source === "plugin" ? "text-[#4CAF50]" : "text-white/70"}>{predQ.data.source}</span></span>
          <span>· Latency: {fmtNum(predQ.data.latency_ms, 0)}ms</span>
          <span>· Last reload: {predQ.data.last_model_reload ? new Date(predQ.data.last_model_reload).toLocaleTimeString() : "—"}</span>
          {predQ.data.cache_hit && <span className="text-[#4CAF50]">· CACHED</span>}
        </div>
      )}

      <div className="mt-8 text-center text-xs text-white/30 font-mono-data tracking-wider">
        DATA · YAHOO FINANCE · NOT FINANCIAL ADVICE · FOR EDUCATIONAL PURPOSES
      </div>
    </div>
  );
}

function AnalyticStat({ label, value, positive, negative }) {
  const color = positive ? "text-[#4CAF50]" : negative ? "text-[#FF5252]" : "text-white";
  return (
    <div className="glass rounded-lg p-4">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className={`font-mono-data text-base mt-2 ${color}`}>{value}</div>
    </div>
  );
}
