# StockVision AI · Deployment Guide

A production-ready, AI-powered stock forecasting and research platform.
Built with FastAPI + React + yfinance + scikit-learn + Claude Sonnet 4.5.

---

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env   # fill in EMERGENT_LLM_KEY if you use AI news summaries
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend
```bash
cd frontend
yarn install
yarn start          # http://localhost:3000
```

Set `REACT_APP_BACKEND_URL` in `frontend/.env` to your backend URL.

---

## Docker (Production)

The repo ships with a single multi-stage Dockerfile that builds the React SPA and serves it from the same FastAPI process.

```bash
docker build -t stockvision-ai \
  --build-arg REACT_APP_BACKEND_URL=https://your-host.example.com .
docker run -p 8001:8001 \
  -e EMERGENT_LLM_KEY=sk-... \
  -e CORS_ORIGINS="*" \
  stockvision-ai
```

Open `http://localhost:8001`.

---

## Render (one-click)

`render.yaml` is already provided.

1. Push to GitHub.
2. Render → New → Blueprint → point at your repo.
3. Set `EMERGENT_LLM_KEY` (and optionally `MONGO_URL`) as secrets.

---

## Hugging Face Spaces

`huggingface.yaml` in the root configures a Docker Space.

1. Create a new Space → SDK = Docker.
2. Push the repo.
3. Add `EMERGENT_LLM_KEY` as a Space Secret.

---

## Plug in your own model

Drop a file in `/app/backend/models/`:

| Filename | Effect |
|---|---|
| `default.pkl` | Used for **every** ticker. |
| `AAPL.pkl` (or any other ticker) | Overrides `default.pkl` for that ticker only. |

The file can be either a bare sklearn estimator with `.predict()`, or a bundle:

```python
import joblib
joblib.dump({
    "model": my_trained_model,
    "feature_names": ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"],
    "output": "return",   # or "price"
}, "/app/backend/models/default.pkl")
```

Then either restart the backend or:

```
POST /api/model/reload
```

Confirm with `GET /api/model/info` — you should see `"plugin.active": true`.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `MONGO_URL` | `mongodb://localhost:27017` | (Optional) reserved for future persistence |
| `DB_NAME` | `test_database` | Same |
| `CORS_ORIGINS` | `*` | Comma-separated list |
| `EMERGENT_LLM_KEY` | _required for AI summaries_ | Claude / GPT / Gemini access |
| `PREDICTION_CACHE_TTL` | `300` | seconds |
| `QUOTE_CACHE_TTL` | `60` | seconds |
| `HISTORY_CACHE_TTL` | `600` | seconds |
| `NEWS_CACHE_TTL` | `900` | seconds |

---

## API Reference (selected)

| Method | Path | Description |
|---|---|---|
| GET | `/api/` | Health |
| GET | `/api/stocks/search?q=` | Autocomplete |
| GET | `/api/stocks/{t}/quote` | Live quote |
| GET | `/api/stocks/{t}/history?period=1Y` | OHLCV |
| GET | `/api/stocks/{t}/indicators` | MA/RSI/MACD/BB/ATR |
| GET | `/api/stocks/{t}/predict?force_refresh=false` | Next-day forecast |
| GET | `/api/stocks/{t}/analytics` | Trend/volatility/risk/support-resistance |
| GET | `/api/stocks/{t}/profile` | Company P/E, EPS, ownership, etc. |
| GET | `/api/stocks/{t}/news?limit=10` | Headlines + sentiment + AI summary |
| GET | `/api/stocks/{t}/explain` | Per-feature contribution + text rationale |
| GET | `/api/stocks/compare?tickers=A,B,C` | Multi-stock side-by-side + correlation |
| GET | `/api/model/info` | Active model, plug-in status, cache stats |
| POST | `/api/model/reload` | Re-discover .pkl files, clear predict cache |
| GET | `/api/cache/stats` | All four caches |
| DELETE | `/api/cache` | Clear all caches |

Live OpenAPI docs at `/docs` (Swagger) and `/redoc` once the backend is running.
