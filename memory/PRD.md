# StockVision AI — PRD

## Original Problem Statement
Build a modern, production-ready AI Stock Market Prediction Web Application (StockVision AI) that looks like a premium fintech platform. Phase 3 turns it into a portfolio-grade AI research & forecasting platform with custom-model plug-in, universal market support, stock research, news + AI summary, multi-stock compare, portfolio tracker, explainability, and full production tooling.

## Architecture
- **Backend**: FastAPI v3 (`/app/backend/server.py`). 16 endpoints under `/api`.
- **Frontend**: React 19 + Tailwind + Recharts. 7 pages.
- **Data**: yfinance (live OHLCV, profile, news).
- **ML model**: Built-in LinearRegression on 6 engineered features (walk-forward 80/20 per request), with **plug-in slot** at `/app/backend/models/*.pkl` for custom pre-trained models that become the primary engine automatically.
- **LLM**: Claude Sonnet 4.5 (via Emergent Universal Key) — AI news summaries.
- **Caching**: 4 in-memory TTL caches (predict 5m, quote 60s, history 10m, news 15m).
- **Persistence**: localStorage only (watchlist, recent searches, portfolio).
- **Auth**: None — public app.

## User Personas
1. **Student / Job Candidate** — uses showcase + docs as portfolio piece.
2. **Retail Analyst** — researches a stock end-to-end (quote → indicators → AI forecast → news → company financials → export PDF).
3. **Quant Hobbyist** — drops a trained `.pkl` into `/backend/models/` and immediately sees their model power predictions across the UI.

## Core Requirements (static)
- Dark fintech UI (Bloomberg / TradingView vibe), glass cards, Clash Display + IBM Plex Mono.
- Universal Yahoo Finance ticker support (NSE `.NS`, BSE `.BO`, indices `^GSPC`, crypto `BTC-USD`).
- 7 routes: `/`, `/dashboard`, `/research/:ticker?`, `/compare`, `/portfolio`, `/showcase`, `/docs`.
- Custom model plug-in slot with reload + active badge.
- Prediction explainability (per-feature contributions + natural-language rationale).
- News + Claude AI summary + headline sentiment scoring.
- Multi-stock compare (≤5) with normalized price chart, side-by-side metrics, correlation matrix.
- Portfolio with shares + cost basis, P&L, daily change, allocation pies (holding + sector).
- Exports: PDF report (jsPDF), CSV, share link.
- Docker + Render + HF Spaces deployment configs.

## What's Implemented

### Phase 1 (MVP)
- Landing, Dashboard (search + autocomplete + popular pills, multi-timeframe area chart + volume, MA/BB + RSI/MACD, prediction card, gauges, sentiment donut, feature importance, export PDF/CSV/share), Showcase, Docs pages.
- Built-in LinearRegression model, NaN-safe JSON.
- 100% test pass.

### Phase 2 (Plug-in + Cache)
- `/app/backend/models/` slot with `default.pkl` / `<TICKER>.pkl` convention.
- Predict TTL cache + `POST /api/model/reload` + `GET /api/cache/stats`.
- `?force_refresh=true` bypass.

### Phase 3 (Portfolio-grade)
- **Universal ticker** — search returns any uppercase symbol; verified with `RELIANCE.NS`, `^GSPC`, `BTC-USD`.
- **/api/stocks/{t}/profile** — 30+ company fields including P/E, EPS, dividend yield, beta, ownership, analyst targets.
- **/api/stocks/{t}/news** — yfinance headlines + per-headline sentiment + Claude AI 2-3 sentence summary.
- **/api/stocks/compare** — 5-ticker rows, normalized 1Y series, return-correlation matrix.
- **/api/stocks/{t}/explain** — feature contributions + natural-language rationale.
- **/api/model/info** — exposes `plugin.active`, files, cache stats, `last_reload`, `server_started_at`.
- **Extended caches** for quote/history/news with hit/miss/hit-rate metrics.
- **Research page** with valuation, dividends, profitability, ownership grids + news section + AI summary panel.
- **Compare page** — chip-based ticker selection, normalized chart, comparison table, correlation heatmap.
- **Portfolio page** (localStorage) — add holdings, P&L, daily change, allocation by holding + sector pies.
- **Explainability card** on Dashboard with feature contributions + bars.
- **Custom Model Active badge** (dashboard header) + Model Badge in sidebar.
- **Model meta footer** (model name, source, latency_ms, last_reload, cache_hit).
- **Watchlist + Recent searches** (localStorage hooks).
- **Mobile top nav** with all 6 sections.
- **Market status indicator** in sidebar.
- **Showcase page upgrade** — architecture diagram, data pipeline diagram, feature engineering grid, training workflow, benchmark comparison table, technical challenges, business impact.
- **Dockerfile** (multi-stage, builds React + serves via FastAPI), **render.yaml**, **huggingface.yaml**, **DEPLOYMENT.md**.
- **100% test pass** (25 backend tests + full frontend Playwright walkthrough).

## Backlog (P1/P2)
- P1: Background refresh job for hot tickers (Redis + APScheduler).
- P1: Drag-and-drop UI to upload `.pkl` directly through the dashboard.
- P2: Volatility surface 3D chart, candlestick chart upgrade (D3).
- P2: Multi-horizon predictions (5d, 20d).
- P2: WebSocket live quotes.
- P2: Backend persistence for watchlist / portfolio (requires auth).
