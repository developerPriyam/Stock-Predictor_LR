# StockVision AI — PRD

## Original Problem Statement
Build a modern, production-ready AI Stock Market Prediction Web Application (StockVision AI) that looks like a premium fintech platform — dark mode, glassmorphism, dashboard with stock search, real-time market data, AI predictions, interactive charts (multiple timeframes), technical indicators (MA20, MA50, RSI, MACD, Bollinger, ATR), AI analytics panel, visualizations (candlestick, volume, gauges, sentiment pie, feature importance, confidence gauge), portfolio showcase, documentation page, export to PDF/CSV.

## Architecture
- **Backend**: FastAPI (Python 3.11) at `/app/backend/server.py`. Routes all under `/api`.
- **Frontend**: React 19 + Tailwind + Recharts at `/app/frontend/src/`.
- **Data**: Yahoo Finance via `yfinance` (no API key).
- **ML Model**: Feature-engineered LinearRegression (6 features) trained on demand per ticker with walk-forward 80/20 split. Confidence blends directional accuracy + magnitude clarity.
- **No DB**: Mongo template untouched; app is stateless (no auth, no persistence).

## User Personas
1. **Student / Job Candidate** — uses the showcase + docs pages as a portfolio piece.
2. **Retail Analyst** — searches tickers, inspects forecasts, exports PDF/CSV.
3. **Educator / Quant Hobbyist** — explores feature importance, model metrics.

## Core Requirements (static)
- Dark fintech UI (Bloomberg/TradingView vibe), glass cards, monospace data fonts.
- Stock search w/ autocomplete & popular pills.
- Real-time quote: price, change, %, market cap, volume, 52w range.
- AI prediction: next-day price, trend (Bullish/Bearish/Neutral), confidence, Buy/Hold/Sell, feature importance.
- Charts: area+volume w/ 1M/3M/6M/1Y/5Y, MA20/MA50/BB, RSI, MACD.
- Analytics: trend strength gauge, confidence gauge, sentiment donut, momentum, volatility, risk, max drawdown, support/resistance.
- Pages: Landing, Dashboard, Project Showcase, Documentation.
- Exports: PDF report (jsPDF), CSV download, share link (clipboard).

## What's Implemented (2026-02-XX)
- Backend: `/api/stocks/popular`, `/api/stocks/search`, `/api/stocks/{t}/quote`, `/api/stocks/{t}/history`, `/api/stocks/{t}/indicators`, `/api/stocks/{t}/predict`, `/api/stocks/{t}/analytics`, `/api/model/info`. NaN/Inf-safe JSON serialization.
- Frontend: Landing page (hero + features bento + metrics + markets + CTA), AppShell (sidebar + mobile top-nav), Dashboard (search w/ suggestions, quote cards, period selector, price+volume chart, MA/BB chart, RSI/MACD chart, prediction card, trend gauge, confidence gauge, sentiment donut, feature importance, bottom analytics, export PDF/CSV/share), Project Showcase, Documentation.

## Backlog (P1/P2)
- P1: Plug-in slot for user's pre-trained LSTM/Transformer model (drop a .pkl in `/app/backend/models/`).
- P1: News sentiment integration (headline classifier).
- P2: Multi-horizon forecasts (5d, 20d).
- P2: Saved watchlist (requires auth).
- P2: WebSocket live ticks instead of polled REST.
- P2: Caching layer (Redis) for `/predict` to avoid re-training each request.
