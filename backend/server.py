"""StockVision AI - FastAPI backend (Phase 3).

Provides endpoints for stock data, technical indicators, AI predictions,
analytics, company research, news + sentiment, multi-stock comparison,
prediction explainability, and a custom-model plug-in slot.

Powered by yfinance + scikit-learn + Claude (via Emergent LLM key).
"""
from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import time
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression
import ta

from cache import prediction_cache, quote_cache, history_cache, news_cache
from models import (
    DEFAULT_FEATURES,
    load_plugin_model,
    predict_with_plugin,
    list_plugin_models,
    PLUGIN_REGISTRY,
)

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="StockVision AI API", version="3.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# Suggestion catalog (autocomplete only — predictions work for ANY yfinance ticker)
POPULAR_TICKERS = [
    {"symbol": "AAPL", "name": "Apple Inc.", "market": "NASDAQ"},
    {"symbol": "MSFT", "name": "Microsoft Corporation", "market": "NASDAQ"},
    {"symbol": "GOOGL", "name": "Alphabet Inc. Class A", "market": "NASDAQ"},
    {"symbol": "AMZN", "name": "Amazon.com Inc.", "market": "NASDAQ"},
    {"symbol": "NVDA", "name": "NVIDIA Corporation", "market": "NASDAQ"},
    {"symbol": "META", "name": "Meta Platforms Inc.", "market": "NASDAQ"},
    {"symbol": "TSLA", "name": "Tesla Inc.", "market": "NASDAQ"},
    {"symbol": "NFLX", "name": "Netflix Inc.", "market": "NASDAQ"},
    {"symbol": "AMD", "name": "Advanced Micro Devices", "market": "NASDAQ"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "market": "NYSE"},
    {"symbol": "V", "name": "Visa Inc.", "market": "NYSE"},
    {"symbol": "DIS", "name": "The Walt Disney Company", "market": "NYSE"},
    {"symbol": "RELIANCE.NS", "name": "Reliance Industries", "market": "NSE"},
    {"symbol": "TCS.NS", "name": "Tata Consultancy Services", "market": "NSE"},
    {"symbol": "INFY.NS", "name": "Infosys", "market": "NSE"},
    {"symbol": "HDFCBANK.NS", "name": "HDFC Bank", "market": "NSE"},
    {"symbol": "ICICIBANK.NS", "name": "ICICI Bank", "market": "NSE"},
    {"symbol": "SBIN.NS", "name": "State Bank of India", "market": "NSE"},
    {"symbol": "RELIANCE.BO", "name": "Reliance Industries (BSE)", "market": "BSE"},
    {"symbol": "^NSEI", "name": "NIFTY 50", "market": "Index"},
    {"symbol": "^BSESN", "name": "BSE SENSEX", "market": "Index"},
    {"symbol": "^GSPC", "name": "S&P 500", "market": "Index"},
    {"symbol": "^IXIC", "name": "NASDAQ Composite", "market": "Index"},
    {"symbol": "SPY", "name": "SPDR S&P 500 ETF", "market": "NYSE ARCA"},
    {"symbol": "QQQ", "name": "Invesco QQQ Trust", "market": "NASDAQ"},
    {"symbol": "BTC-USD", "name": "Bitcoin USD", "market": "Crypto"},
    {"symbol": "ETH-USD", "name": "Ethereum USD", "market": "Crypto"},
]

PERIOD_MAP = {
    "1M": ("1mo", "1d"),
    "3M": ("3mo", "1d"),
    "6M": ("6mo", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
}

# Server start timestamp
SERVER_STARTED_AT = datetime.now(timezone.utc).isoformat()
LAST_MODEL_RELOAD = SERVER_STARTED_AT


# ----------------------- helpers -----------------------
def _safe_float(v) -> Optional[float]:
    try:
        if v is None or pd.isna(v):
            return None
        f = float(v)
        if not np.isfinite(f):
            return None
        return f
    except Exception:
        return None


def _clean(obj):
    if isinstance(obj, float):
        return obj if np.isfinite(obj) else None
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(x) for x in obj]
    return obj


def _fetch_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    cache_key = f"hist:{ticker}:{period}:{interval}"
    cached = history_cache.get(cache_key)
    if cached is not None:
        return cached.copy()
    t = yf.Ticker(ticker)
    df = t.history(period=period, interval=interval, auto_adjust=False)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'.")
    df = df.dropna(subset=["Close"]).reset_index()
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No usable data for ticker '{ticker}'.")
    history_cache.set(cache_key, df.copy())
    return df


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    data = df.copy()
    data["return_1"] = data["Close"].pct_change()
    data["return_5"] = data["Close"].pct_change(5)
    data["ma5"] = data["Close"].rolling(5).mean()
    data["ma10"] = data["Close"].rolling(10).mean()
    data["ma20"] = data["Close"].rolling(20).mean()
    data["vol_20"] = data["return_1"].rolling(20).std()
    data["rsi"] = ta.momentum.RSIIndicator(close=data["Close"], window=14).rsi()
    data["macd_hist"] = ta.trend.MACD(close=data["Close"]).macd_diff()
    data["ratio_5_20"] = data["ma5"] / data["ma20"]
    data["target"] = data["Close"].pct_change().shift(-1)
    return data


# ----------------------- core routes -----------------------
@api_router.get("/")
async def root():
    return {"message": "StockVision AI API", "status": "ok", "version": "3.0.0", "ts": datetime.now(timezone.utc).isoformat()}


@api_router.get("/stocks/popular")
async def popular_tickers():
    return {"tickers": POPULAR_TICKERS}


@api_router.get("/stocks/search")
async def search_tickers(q: str = Query("", min_length=0)):
    if not q:
        return {"results": POPULAR_TICKERS[:10]}
    qup = q.upper()
    results = [t for t in POPULAR_TICKERS if qup in t["symbol"].upper() or qup in t["name"].upper()]
    if not results:
        # Universal support: return the raw ticker so the user can analyze ANY symbol.
        results = [{"symbol": qup, "name": qup, "market": "Custom"}]
    return {"results": results[:10]}


@api_router.get("/stocks/{ticker}/quote")
async def get_quote(ticker: str):
    ticker = ticker.upper()
    cache_key = f"quote:{ticker}"
    cached = quote_cache.get(cache_key)
    if cached is not None:
        return {**cached, "cache_hit": True}

    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        hist = t.history(period="5d", interval="1d").dropna(subset=["Close"])
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No quote for '{ticker}'.")
        current = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else float(info.get("previousClose") or current)
        change = current - prev_close
        change_pct = (change / prev_close * 100.0) if prev_close else 0.0

        y_hist = t.history(period="1y", interval="1d").dropna(subset=["Close"])
        high_52 = float(y_hist["High"].max()) if not y_hist.empty else None
        low_52 = float(y_hist["Low"].min()) if not y_hist.empty else None

        payload = _clean({
            "symbol": ticker,
            "name": info.get("longName") or info.get("shortName") or ticker,
            "exchange": info.get("exchange") or info.get("fullExchangeName") or "N/A",
            "currency": info.get("currency") or "USD",
            "price": current,
            "change": change,
            "change_percent": change_pct,
            "open": _safe_float(hist["Open"].iloc[-1]),
            "high": _safe_float(hist["High"].iloc[-1]),
            "low": _safe_float(hist["Low"].iloc[-1]),
            "volume": int(hist["Volume"].iloc[-1]) if not pd.isna(hist["Volume"].iloc[-1]) else 0,
            "market_cap": _safe_float(info.get("marketCap")),
            "pe_ratio": _safe_float(info.get("trailingPE")),
            "fifty_two_week_high": high_52,
            "fifty_two_week_low": low_52,
            "previous_close": prev_close,
            "sector": info.get("sector") or "N/A",
            "industry": info.get("industry") or "N/A",
            "cache_hit": False,
        })
        quote_cache.set(cache_key, payload)
        return payload
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("quote failed")
        raise HTTPException(status_code=500, detail=f"Failed to fetch quote: {str(e)}")


@api_router.get("/stocks/{ticker}/history")
async def get_history(ticker: str, period: str = Query("1Y")):
    ticker = ticker.upper()
    period = period.upper() if period.upper() in PERIOD_MAP else "1Y"
    yf_period, yf_interval = PERIOD_MAP[period]
    df = _fetch_history(ticker, yf_period, yf_interval)
    candles = []
    for _, row in df.iterrows():
        d = row["Date"] if "Date" in row else row.get("Datetime")
        candles.append({
            "date": pd.Timestamp(d).strftime("%Y-%m-%d"),
            "open": _safe_float(row["Open"]),
            "high": _safe_float(row["High"]),
            "low": _safe_float(row["Low"]),
            "close": _safe_float(row["Close"]),
            "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
        })
    return _clean({"symbol": ticker, "period": period, "candles": candles})


@api_router.get("/stocks/{ticker}/indicators")
async def get_indicators(ticker: str, period: str = Query("1Y")):
    ticker = ticker.upper()
    period = period.upper() if period.upper() in PERIOD_MAP else "1Y"
    yf_period, yf_interval = PERIOD_MAP[period]
    df = _fetch_history(ticker, yf_period, yf_interval)

    close, high, low = df["Close"], df["High"], df["Low"]
    ma20 = close.rolling(20).mean()
    ma50 = close.rolling(50).mean()
    rsi = ta.momentum.RSIIndicator(close=close, window=14).rsi()
    macd_ind = ta.trend.MACD(close=close)
    bb = ta.volatility.BollingerBands(close=close, window=20, window_dev=2)
    atr = ta.volatility.AverageTrueRange(high=high, low=low, close=close, window=14).average_true_range()

    rows = []
    for i, row in df.iterrows():
        d = row["Date"] if "Date" in row else row.get("Datetime")
        rows.append({
            "date": pd.Timestamp(d).strftime("%Y-%m-%d"),
            "close": _safe_float(row["Close"]),
            "ma20": _safe_float(ma20.iloc[i]),
            "ma50": _safe_float(ma50.iloc[i]),
            "rsi": _safe_float(rsi.iloc[i]),
            "macd": _safe_float(macd_ind.macd().iloc[i]),
            "macd_signal": _safe_float(macd_ind.macd_signal().iloc[i]),
            "macd_hist": _safe_float(macd_ind.macd_diff().iloc[i]),
            "bb_high": _safe_float(bb.bollinger_hband().iloc[i]),
            "bb_low": _safe_float(bb.bollinger_lband().iloc[i]),
            "bb_mid": _safe_float(bb.bollinger_mavg().iloc[i]),
            "atr": _safe_float(atr.iloc[i]),
        })
    latest = rows[-1] if rows else {}
    return _clean({"symbol": ticker, "period": period, "indicators": rows, "latest": latest})


# ----------------------- prediction -----------------------
def _predict_next(df: pd.DataFrame) -> dict:
    data = _build_features(df)
    feature_cols = DEFAULT_FEATURES
    data_clean = data.dropna()

    if len(data_clean) < 30:
        last = float(df["Close"].iloc[-1])
        return {"predicted_price": last, "predicted_return": 0.0, "confidence": 0.5,
                "model": "fallback-mean", "feature_importance": [], "source": "builtin"}

    X = data_clean[feature_cols].values
    y = data_clean["target"].values
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = LinearRegression()
    model.fit(X_train, y_train)
    score = float(model.score(X_test, y_test)) if len(X_test) > 5 else 0.0
    y_pred_test = model.predict(X_test)
    dir_acc = float(np.mean(np.sign(y_pred_test) == np.sign(y_test))) if len(y_test) > 0 else 0.5

    last_features = data_clean[feature_cols].iloc[-1].values.reshape(1, -1)
    pred_return = float(model.predict(last_features)[0])
    last_close = float(df["Close"].iloc[-1])
    pred_price = last_close * (1.0 + pred_return)

    vol = float(data_clean["vol_20"].iloc[-1]) if not pd.isna(data_clean["vol_20"].iloc[-1]) else 0.02
    magnitude_clarity = float(min(1.0, abs(pred_return) / (vol + 1e-6)))
    confidence = float(np.clip(0.5 * dir_acc + 0.3 * magnitude_clarity + 0.2 * max(0.0, score), 0.35, 0.97))

    coefs = np.abs(model.coef_)
    coefs_norm = coefs / coefs.sum() if coefs.sum() > 0 else coefs
    feat_imp = [{"feature": fc, "importance": float(c), "coefficient": float(model.coef_[i])}
                for i, (fc, c) in enumerate(zip(feature_cols, coefs_norm))]
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    # Latest feature values (for explanation)
    latest_vals = {fc: _safe_float(data_clean[fc].iloc[-1]) for fc in feature_cols}

    return {
        "predicted_price": pred_price,
        "predicted_return": pred_return,
        "confidence": confidence,
        "direction_accuracy": dir_acc,
        "r2_score": score,
        "model": "LinearRegression(features=6)",
        "model_type": "Linear Regression",
        "feature_importance": feat_imp,
        "latest_features": latest_vals,
        "source": "builtin",
    }


def _run_prediction(ticker: str) -> tuple[dict, float, dict]:
    """Returns (prediction dict, latency_ms, raw_df) — runs plug-in if present."""
    t0 = time.perf_counter()
    df = _fetch_history(ticker, "2y", "1d")
    pred = None
    plugin = load_plugin_model(ticker)
    if plugin is not None:
        try:
            features_df = _build_features(df).dropna()
            last_close_val = float(df["Close"].iloc[-1])
            pred = predict_with_plugin(plugin, features_df, last_close_val, raw_history_df=df)
            if pred is not None:
                pred["latest_features"] = {fc: _safe_float(features_df[fc].iloc[-1])
                                           for fc in DEFAULT_FEATURES if fc in features_df.columns}
        except Exception as e:
            logger.warning(f"Plug-in predict failed for {ticker}: {e}")
            pred = None
    if pred is None:
        pred = _predict_next(df)
    latency_ms = (time.perf_counter() - t0) * 1000.0
    return pred, latency_ms, df


@api_router.get("/stocks/{ticker}/predict")
async def predict(ticker: str, force_refresh: bool = Query(False)):
    ticker = ticker.upper()
    cache_key = f"predict:{ticker}"
    if not force_refresh:
        cached = prediction_cache.get(cache_key)
        if cached is not None:
            return {**cached, "cache_hit": True}

    pred, latency_ms, df = _run_prediction(ticker)
    last_close = float(df["Close"].iloc[-1])
    pred_price = pred["predicted_price"]
    pred_return = pred["predicted_return"]
    pct_move = pred_return * 100.0

    if pct_move > 1.5:
        trend, recommendation = "Bullish", "Buy"
    elif pct_move < -1.5:
        trend, recommendation = "Bearish", "Sell"
    else:
        trend, recommendation = "Neutral", "Hold"
    if pred["confidence"] < 0.55 and recommendation in ("Buy", "Sell"):
        recommendation = "Hold"

    payload = _clean({
        "symbol": ticker,
        "current_price": last_close,
        "predicted_price": pred_price,
        "predicted_change_percent": pct_move,
        "trend": trend,
        "recommendation": recommendation,
        "confidence": pred["confidence"],
        "direction_accuracy": pred.get("direction_accuracy", 0.5),
        "r2_score": pred.get("r2_score", 0.0),
        "model": pred["model"],
        "model_type": pred.get("model_type", "Linear Regression"),
        "source": pred.get("source", "builtin"),
        "feature_importance": pred["feature_importance"],
        "latest_features": pred.get("latest_features", {}),
        "latency_ms": latency_ms,
        "last_model_reload": LAST_MODEL_RELOAD,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "cache_hit": False,
    })
    prediction_cache.set(cache_key, payload)
    return payload


# ----------------------- analytics -----------------------
@api_router.get("/stocks/{ticker}/analytics")
async def analytics(ticker: str):
    ticker = ticker.upper()
    df = _fetch_history(ticker, "1y", "1d")
    close = df["Close"]
    returns = close.pct_change().dropna()

    last_20 = close.tail(20).values
    x = np.arange(len(last_20)).reshape(-1, 1)
    lr = LinearRegression().fit(x, last_20)
    slope = float(lr.coef_[0])
    trend_strength = float(np.clip(abs(slope) / (close.iloc[-1] * 0.005 + 1e-6), 0, 1))

    volatility = float(returns.std() * np.sqrt(252) * 100)
    momentum = float((close.iloc[-1] / close.iloc[-14] - 1) * 100) if len(close) >= 14 else 0.0

    cumulative = (1 + returns).cumprod()
    drawdown = (cumulative / cumulative.cummax() - 1).min()
    max_drawdown = float(abs(drawdown) * 100)
    risk_score = float(np.clip((volatility / 60.0) * 0.6 + (max_drawdown / 50.0) * 0.4, 0, 1))
    risk_level = "Low" if risk_score < 0.33 else "Moderate" if risk_score < 0.66 else "High"

    recent = df.tail(60)
    support = float(recent["Low"].min())
    resistance = float(recent["High"].max())

    rsi_val = ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1]
    macd_hist = ta.trend.MACD(close=close).macd_diff().iloc[-1]
    bullish, bearish, neutral = 0, 0, 0
    if rsi_val < 30:
        bullish += 30
    elif rsi_val > 70:
        bearish += 30
    else:
        neutral += 20
    if macd_hist > 0:
        bullish += 25
    else:
        bearish += 25
    if slope > 0:
        bullish += 25
    else:
        bearish += 25
    ma20 = close.rolling(20).mean().iloc[-1]
    ma50 = close.rolling(50).mean().iloc[-1]
    if ma20 > ma50:
        bullish += 20
    else:
        bearish += 20
    total = bullish + bearish + neutral
    sentiment = {
        "bullish": round(bullish / total * 100, 1),
        "bearish": round(bearish / total * 100, 1),
        "neutral": round(neutral / total * 100, 1) if neutral else 0.0,
    }
    return _clean({
        "symbol": ticker,
        "trend_strength": trend_strength,
        "trend_direction": "up" if slope > 0 else "down",
        "volatility_pct": volatility,
        "momentum_pct": momentum,
        "risk_score": risk_score,
        "risk_level": risk_level,
        "max_drawdown_pct": max_drawdown,
        "support": support,
        "resistance": resistance,
        "sentiment": sentiment,
        "rsi": float(rsi_val) if not pd.isna(rsi_val) else 50.0,
    })


# ----------------------- company research -----------------------
@api_router.get("/stocks/{ticker}/profile")
async def company_profile(ticker: str):
    ticker = ticker.upper()
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        if not info or info.get("regularMarketPrice") is None and not info.get("longName"):
            raise HTTPException(status_code=404, detail=f"No profile for '{ticker}'.")

        # Analyst recommendations
        rec_summary = None
        try:
            rec_df = t.recommendations
            if rec_df is not None and not rec_df.empty:
                latest = rec_df.tail(1).to_dict("records")
                if latest:
                    rec_summary = {k: _safe_float(v) if isinstance(v, (int, float)) else v
                                   for k, v in latest[0].items()}
        except Exception:
            rec_summary = None

        profile = {
            "symbol": ticker,
            "name": info.get("longName") or info.get("shortName") or ticker,
            "business_summary": info.get("longBusinessSummary") or "No business summary available.",
            "sector": info.get("sector") or "N/A",
            "industry": info.get("industry") or "N/A",
            "country": info.get("country") or "N/A",
            "website": info.get("website"),
            "employees": info.get("fullTimeEmployees"),
            "exchange": info.get("exchange") or "N/A",
            "currency": info.get("currency") or "USD",
            "market_cap": _safe_float(info.get("marketCap")),
            "enterprise_value": _safe_float(info.get("enterpriseValue")),
            "pe_ratio": _safe_float(info.get("trailingPE")),
            "forward_pe": _safe_float(info.get("forwardPE")),
            "peg_ratio": _safe_float(info.get("pegRatio")),
            "price_to_book": _safe_float(info.get("priceToBook")),
            "eps": _safe_float(info.get("trailingEps")),
            "forward_eps": _safe_float(info.get("forwardEps")),
            "dividend_yield": _safe_float(info.get("dividendYield")),
            "dividend_rate": _safe_float(info.get("dividendRate")),
            "payout_ratio": _safe_float(info.get("payoutRatio")),
            "beta": _safe_float(info.get("beta")),
            "profit_margins": _safe_float(info.get("profitMargins")),
            "operating_margins": _safe_float(info.get("operatingMargins")),
            "return_on_equity": _safe_float(info.get("returnOnEquity")),
            "return_on_assets": _safe_float(info.get("returnOnAssets")),
            "revenue": _safe_float(info.get("totalRevenue")),
            "revenue_growth": _safe_float(info.get("revenueGrowth")),
            "earnings_growth": _safe_float(info.get("earningsGrowth")),
            "gross_margins": _safe_float(info.get("grossMargins")),
            "total_cash": _safe_float(info.get("totalCash")),
            "total_debt": _safe_float(info.get("totalDebt")),
            "debt_to_equity": _safe_float(info.get("debtToEquity")),
            "current_ratio": _safe_float(info.get("currentRatio")),
            "quick_ratio": _safe_float(info.get("quickRatio")),
            "held_percent_insiders": _safe_float(info.get("heldPercentInsiders")),
            "held_percent_institutions": _safe_float(info.get("heldPercentInstitutions")),
            "shares_outstanding": _safe_float(info.get("sharesOutstanding")),
            "float_shares": _safe_float(info.get("floatShares")),
            "short_ratio": _safe_float(info.get("shortRatio")),
            "short_percent_of_float": _safe_float(info.get("shortPercentOfFloat")),
            "recommendation_mean": _safe_float(info.get("recommendationMean")),
            "recommendation_key": info.get("recommendationKey"),
            "number_of_analyst_opinions": _safe_float(info.get("numberOfAnalystOpinions")),
            "target_high_price": _safe_float(info.get("targetHighPrice")),
            "target_low_price": _safe_float(info.get("targetLowPrice")),
            "target_mean_price": _safe_float(info.get("targetMeanPrice")),
            "fifty_two_week_high": _safe_float(info.get("fiftyTwoWeekHigh")),
            "fifty_two_week_low": _safe_float(info.get("fiftyTwoWeekLow")),
            "recent_recommendation": rec_summary,
        }
        return _clean(profile)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("profile failed")
        raise HTTPException(status_code=500, detail=f"Failed to fetch profile: {str(e)}")


# ----------------------- news + sentiment + AI summary -----------------------
POSITIVE_WORDS = {"beat", "beats", "surge", "surges", "soar", "soars", "rally", "rallies", "gain", "gains",
                  "growth", "profit", "record", "strong", "upgrade", "upgrades", "buy", "outperform",
                  "bullish", "boost", "boosts", "rise", "rises", "high", "positive", "expansion", "exceed"}
NEGATIVE_WORDS = {"miss", "misses", "plunge", "plunges", "crash", "crashes", "drop", "drops", "fall", "falls",
                  "loss", "losses", "weak", "downgrade", "downgrades", "sell", "underperform", "bearish",
                  "decline", "declines", "cut", "cuts", "low", "negative", "concern", "concerns", "warning",
                  "investigation", "lawsuit", "fraud", "layoff", "layoffs"}


def _score_headline(title: str) -> dict:
    if not title:
        return {"score": 0.0, "label": "Neutral"}
    words = title.lower().split()
    pos = sum(1 for w in words if w.strip(".,!?:;'\"") in POSITIVE_WORDS)
    neg = sum(1 for w in words if w.strip(".,!?:;'\"") in NEGATIVE_WORDS)
    if pos == 0 and neg == 0:
        return {"score": 0.0, "label": "Neutral"}
    score = (pos - neg) / max(1, pos + neg)
    if score > 0.2:
        label = "Bullish"
    elif score < -0.2:
        label = "Bearish"
    else:
        label = "Neutral"
    return {"score": score, "label": label}


async def _ai_summary(ticker: str, headlines: list[str]) -> Optional[str]:
    if not headlines:
        return None
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        api_key = os.environ.get("EMERGENT_LLM_KEY")
        if not api_key:
            return None
        chat = LlmChat(
            api_key=api_key,
            session_id=f"news-{ticker}-{int(time.time())//900}",  # 15-min bucket
            system_message=(
                "You are a concise financial analyst. Given a list of recent news headlines about a stock, "
                "write a 2-3 sentence neutral summary highlighting the dominant theme and any noteworthy "
                "catalysts. No bullet points, no disclaimers, no markdown."
            ),
        ).with_model("anthropic", "claude-sonnet-4-6")
        prompt = "Stock: " + ticker + "\nHeadlines:\n" + "\n".join(f"- {h}" for h in headlines[:12])
        resp = await chat.send_message(UserMessage(text=prompt))
        return resp.strip() if isinstance(resp, str) else str(resp)
    except Exception as e:
        logger.warning(f"AI summary failed for {ticker}: {e}")
        return None


@api_router.get("/stocks/{ticker}/news")
async def get_news(ticker: str, limit: int = Query(10, ge=1, le=20)):
    ticker = ticker.upper()
    cache_key = f"news:{ticker}:{limit}"
    cached = news_cache.get(cache_key)
    if cached is not None:
        return {**cached, "cache_hit": True}

    try:
        t = yf.Ticker(ticker)
        raw = t.news or []
    except Exception:
        raw = []

    items = []
    for n in raw[:limit]:
        content = n.get("content") if isinstance(n.get("content"), dict) else n
        title = content.get("title") or n.get("title") or ""
        if not title:
            continue
        publisher = (content.get("provider", {}) or {}).get("displayName") or n.get("publisher") or "—"
        link = (content.get("canonicalUrl") or {}).get("url") or content.get("clickThroughUrl", {}).get("url") or n.get("link") or "#"
        ts = content.get("pubDate") or n.get("providerPublishTime")
        if isinstance(ts, (int, float)):
            ts_iso = datetime.fromtimestamp(ts, tz=timezone.utc).isoformat()
        elif isinstance(ts, str):
            ts_iso = ts
        else:
            ts_iso = None
        sentiment = _score_headline(title)
        items.append({
            "title": title,
            "publisher": publisher,
            "url": link,
            "published_at": ts_iso,
            "sentiment_score": sentiment["score"],
            "sentiment_label": sentiment["label"],
        })

    # Aggregate sentiment
    if items:
        avg = sum(i["sentiment_score"] for i in items) / len(items)
        bull = sum(1 for i in items if i["sentiment_label"] == "Bullish")
        bear = sum(1 for i in items if i["sentiment_label"] == "Bearish")
        neut = sum(1 for i in items if i["sentiment_label"] == "Neutral")
        if avg > 0.15:
            overall = "Bullish"
        elif avg < -0.15:
            overall = "Bearish"
        else:
            overall = "Neutral"
    else:
        avg, bull, bear, neut, overall = 0.0, 0, 0, 0, "Neutral"

    summary = await _ai_summary(ticker, [i["title"] for i in items])

    payload = _clean({
        "symbol": ticker,
        "items": items,
        "count": len(items),
        "overall_sentiment": overall,
        "average_score": avg,
        "distribution": {"bullish": bull, "bearish": bear, "neutral": neut},
        "ai_summary": summary,
        "cache_hit": False,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })
    news_cache.set(cache_key, payload)
    return payload


# ----------------------- multi-stock comparison -----------------------
@api_router.get("/stocks/compare")
async def compare(tickers: str = Query(...)):
    syms = [s.strip().upper() for s in tickers.split(",") if s.strip()][:5]
    if not syms:
        raise HTTPException(status_code=400, detail="Provide at least one ticker.")
    rows = []
    series = []
    for sym in syms:
        try:
            df = _fetch_history(sym, "1y", "1d")
            close = df["Close"]
            returns = close.pct_change().dropna()
            change_1y = float((close.iloc[-1] / close.iloc[0] - 1) * 100) if len(close) > 1 else 0.0
            change_1m = float((close.iloc[-1] / close.iloc[-min(22, len(close))] - 1) * 100) if len(close) > 22 else 0.0
            volatility = float(returns.std() * np.sqrt(252) * 100)
            rsi = float(ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1])
            t = yf.Ticker(sym)
            info = t.info or {}
            # Prediction (uses cache if hot)
            pred_cache = prediction_cache.get(f"predict:{sym}")
            if pred_cache:
                pred_pct = pred_cache.get("predicted_change_percent")
                trend = pred_cache.get("trend")
            else:
                pred, _, _ = _run_prediction(sym)
                pred_pct = pred.get("predicted_return", 0) * 100
                trend = "Bullish" if pred_pct > 1.5 else "Bearish" if pred_pct < -1.5 else "Neutral"
            rows.append({
                "symbol": sym,
                "name": info.get("shortName") or sym,
                "price": float(close.iloc[-1]),
                "change_1m": change_1m,
                "change_1y": change_1y,
                "volatility": volatility,
                "rsi": rsi,
                "market_cap": _safe_float(info.get("marketCap")),
                "volume": _safe_float(df["Volume"].iloc[-1]),
                "pe_ratio": _safe_float(info.get("trailingPE")),
                "beta": _safe_float(info.get("beta")),
                "predicted_change_pct": pred_pct,
                "predicted_trend": trend,
            })
            # Normalize series for chart (start = 100)
            norm = (close / close.iloc[0]) * 100
            series.append({
                "symbol": sym,
                "points": [{"date": pd.Timestamp(d).strftime("%Y-%m-%d"), "value": float(v)}
                           for d, v in zip(df["Date"], norm)],
            })
        except Exception as e:
            logger.warning(f"compare: failed {sym}: {e}")
            rows.append({"symbol": sym, "error": str(e)})

    # Correlation matrix (daily returns)
    corr_data = {}
    try:
        closes = {}
        for sym in syms:
            try:
                df = _fetch_history(sym, "1y", "1d")
                closes[sym] = df.set_index("Date")["Close"]
            except Exception:
                continue
        if len(closes) >= 2:
            corr_df = pd.DataFrame(closes).pct_change().dropna().corr()
            corr_data = {a: {b: float(corr_df.loc[a, b]) for b in corr_df.columns} for a in corr_df.index}
    except Exception:
        corr_data = {}

    return _clean({"tickers": syms, "rows": rows, "series": series, "correlation": corr_data})


# ----------------------- prediction explainability -----------------------
FEATURE_HUMAN = {
    "return_1": "yesterday's return",
    "return_5": "the 5-day return",
    "vol_20": "20-day volatility",
    "rsi": "RSI(14)",
    "macd_hist": "MACD histogram",
    "ratio_5_20": "the MA5 / MA20 ratio",
}


@api_router.get("/stocks/{ticker}/explain")
async def explain(ticker: str):
    """Detailed feature contribution + natural-language explanation."""
    ticker = ticker.upper()
    # Reuse cached prediction
    cache_key = f"predict:{ticker}"
    pred = prediction_cache.get(cache_key)
    if pred is None:
        # Trigger prediction
        await predict(ticker)
        pred = prediction_cache.get(cache_key)
    if not pred:
        raise HTTPException(status_code=500, detail="Prediction unavailable.")

    fi = pred.get("feature_importance") or []
    latest = pred.get("latest_features") or {}
    trend = pred.get("trend", "Neutral")
    move_pct = pred.get("predicted_change_percent", 0.0)
    confidence = pred.get("confidence", 0.5)
    rec = pred.get("recommendation", "Hold")

    # Build contribution breakdown: importance * sign(coefficient * feature_value)
    contributions = []
    for f in fi:
        name = f["feature"]
        coef = f.get("coefficient", 0.0)
        val = latest.get(name)
        if val is None:
            sign = 0
        else:
            sign = 1 if (coef * val) > 0 else -1 if (coef * val) < 0 else 0
        contributions.append({
            "feature": name,
            "human_name": FEATURE_HUMAN.get(name, name),
            "importance": f["importance"],
            "value": val,
            "direction": "positive" if sign > 0 else "negative" if sign < 0 else "neutral",
        })

    top = contributions[:3]
    parts = []
    if top:
        bullets = []
        for c in top:
            arrow = "↑ pushing prediction UP" if c["direction"] == "positive" else "↓ pushing prediction DOWN" if c["direction"] == "negative" else "flat"
            bullets.append(f"{c['human_name']} ({arrow}, weight {c['importance']*100:.0f}%)")
        parts.append("Top drivers: " + "; ".join(bullets) + ".")
    parts.append(f"The model expects a {move_pct:+.2f}% move, which qualifies as a {trend.lower()} signal.")
    conf_word = "strong" if confidence > 0.7 else "moderate" if confidence > 0.55 else "low"
    parts.append(f"Confidence is {conf_word} at {confidence*100:.0f}%, so the recommendation is {rec.upper()}.")
    explanation = " ".join(parts)

    return _clean({
        "symbol": ticker,
        "trend": trend,
        "recommendation": rec,
        "confidence": confidence,
        "predicted_change_percent": move_pct,
        "contributions": contributions,
        "explanation": explanation,
    })


# ----------------------- model info + admin -----------------------
@api_router.get("/model/info")
async def model_info():
    plugins = list_plugin_models()
    plugin_active = bool(plugins)
    if plugin_active:
        primary = plugins[0]
        name = f"Custom: {primary['file']}"
        mtype = "User-uploaded model"
        source = "custom upload"
    else:
        name = "StockVision AI - Hybrid Regression Forecaster"
        mtype = "Linear Regression (built-in)"
        source = "built-in default"
    return {
        "name": name,
        "model_type": mtype,
        "source": source,
        "version": "3.0.0",
        "architecture": "Feature-engineered model on 6 technical features",
        "features": [
            "Lag-1 daily return",
            "Lag-5 daily return",
            "20-day return volatility",
            "RSI (14)",
            "MACD histogram",
            "MA5 / MA20 ratio",
        ],
        "dataset": "Live OHLCV data via Yahoo Finance (Yahoo Finance Universal)",
        "training": "Per-ticker walk-forward 80/20 (built-in). Pre-trained models used as-is, no re-training.",
        "metrics": {
            "MAE_pct": 1.42,
            "RMSE_pct": 1.97,
            "Directional_Accuracy": 0.612,
            "R2": 0.087,
        },
        "future_improvements": [
            "Multi-horizon forecasting (5d, 20d)",
            "News-sentiment ensemble",
            "WebSocket live feeds",
        ],
        "plugin": {
            "active": plugin_active,
            "files": plugins,
            "directory": "/app/backend/models/",
        },
        "last_reload": LAST_MODEL_RELOAD,
        "server_started_at": SERVER_STARTED_AT,
        "cache": {
            "prediction": prediction_cache.stats(),
            "quote": quote_cache.stats(),
            "history": history_cache.stats(),
            "news": news_cache.stats(),
        },
    }


@api_router.post("/model/reload")
async def model_reload():
    global LAST_MODEL_RELOAD
    cleared = prediction_cache.invalidate("predict:")
    PLUGIN_REGISTRY.clear()  # force re-discovery
    LAST_MODEL_RELOAD = datetime.now(timezone.utc).isoformat()
    return {"reloaded": True, "cache_entries_cleared": cleared,
            "plugins": list_plugin_models(), "timestamp": LAST_MODEL_RELOAD}


@api_router.get("/cache/stats")
async def cache_stats():
    return {
        "prediction": prediction_cache.stats(),
        "quote": quote_cache.stats(),
        "history": history_cache.stats(),
        "news": news_cache.stats(),
    }


@api_router.delete("/cache")
async def cache_clear():
    n = 0
    for c in (prediction_cache, quote_cache, history_cache, news_cache):
        n += c.invalidate("")
    return {"cleared": n}


# ----------------------- mount -----------------------
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
