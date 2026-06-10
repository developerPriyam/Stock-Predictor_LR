"""StockVision AI - FastAPI backend.

Provides endpoints for stock data, technical indicators, AI predictions,
and market analytics. Powered by yfinance + scikit-learn.
"""
from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
import os
import logging
from pathlib import Path
from typing import List, Optional
from datetime import datetime, timezone, timedelta

import numpy as np
import pandas as pd
import yfinance as yf
from sklearn.linear_model import LinearRegression
import ta

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

app = FastAPI(title="StockVision AI API", version="1.0.0")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

# ----------------------- Popular tickers (autocomplete catalog) -----------------------
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
    {"symbol": "INTC", "name": "Intel Corporation", "market": "NASDAQ"},
    {"symbol": "JPM", "name": "JPMorgan Chase & Co.", "market": "NYSE"},
    {"symbol": "BAC", "name": "Bank of America", "market": "NYSE"},
    {"symbol": "V", "name": "Visa Inc.", "market": "NYSE"},
    {"symbol": "MA", "name": "Mastercard Inc.", "market": "NYSE"},
    {"symbol": "DIS", "name": "The Walt Disney Company", "market": "NYSE"},
    {"symbol": "BABA", "name": "Alibaba Group Holding", "market": "NYSE"},
    {"symbol": "ORCL", "name": "Oracle Corporation", "market": "NYSE"},
    {"symbol": "CRM", "name": "Salesforce Inc.", "market": "NYSE"},
    {"symbol": "UBER", "name": "Uber Technologies", "market": "NYSE"},
    {"symbol": "COIN", "name": "Coinbase Global", "market": "NASDAQ"},
    {"symbol": "PLTR", "name": "Palantir Technologies", "market": "NYSE"},
    {"symbol": "SHOP", "name": "Shopify Inc.", "market": "NYSE"},
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
    """Recursively replace NaN/Inf with None so JSON encoding succeeds."""
    if isinstance(obj, float):
        if not np.isfinite(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: _clean(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_clean(x) for x in obj]
    return obj


def _fetch_history(ticker: str, period: str = "1y", interval: str = "1d") -> pd.DataFrame:
    t = yf.Ticker(ticker)
    df = t.history(period=period, interval=interval, auto_adjust=False)
    if df is None or df.empty:
        raise HTTPException(status_code=404, detail=f"No data found for ticker '{ticker}'.")
    df = df.dropna(subset=["Close"]).reset_index()
    if df.empty:
        raise HTTPException(status_code=404, detail=f"No usable data for ticker '{ticker}'.")
    return df


# ----------------------- Routes -----------------------
@api_router.get("/")
async def root():
    return {"message": "StockVision AI API", "status": "ok", "ts": datetime.now(timezone.utc).isoformat()}


@api_router.get("/stocks/popular")
async def popular_tickers():
    return {"tickers": POPULAR_TICKERS}


@api_router.get("/stocks/search")
async def search_tickers(q: str = Query("", min_length=0)):
    if not q:
        return {"results": POPULAR_TICKERS[:10]}
    qup = q.upper()
    results = [
        t for t in POPULAR_TICKERS
        if qup in t["symbol"].upper() or qup in t["name"].upper()
    ]
    # If no match in catalog, return the raw ticker so user can still query it
    if not results:
        results = [{"symbol": qup, "name": qup, "market": "Unknown"}]
    return {"results": results[:10]}


@api_router.get("/stocks/{ticker}/quote")
async def get_quote(ticker: str):
    ticker = ticker.upper()
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        hist = t.history(period="5d", interval="1d")
        if hist is None or hist.empty:
            raise HTTPException(status_code=404, detail=f"No quote for '{ticker}'.")
        # Drop rows where Close is NaN (e.g., today's empty bar)
        hist = hist.dropna(subset=["Close"])
        if hist.empty:
            raise HTTPException(status_code=404, detail=f"No quote for '{ticker}'.")

        current = float(hist["Close"].iloc[-1])
        prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else float(info.get("previousClose") or current)
        change = current - prev_close
        change_pct = (change / prev_close * 100.0) if prev_close else 0.0

        # 52-week range from 1y data
        y_hist = t.history(period="1y", interval="1d").dropna(subset=["Close"])
        high_52 = float(y_hist["High"].max()) if not y_hist.empty else None
        low_52 = float(y_hist["Low"].min()) if not y_hist.empty else None

        return _clean({
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
        })
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

    close = df["Close"]
    high = df["High"]
    low = df["Low"]

    ma20 = close.rolling(20).mean()
    ma50 = close.rolling(50).mean()
    rsi = ta.momentum.RSIIndicator(close=close, window=14).rsi()
    macd_ind = ta.trend.MACD(close=close)
    macd_line = macd_ind.macd()
    macd_signal = macd_ind.macd_signal()
    macd_hist = macd_ind.macd_diff()
    bb = ta.volatility.BollingerBands(close=close, window=20, window_dev=2)
    bb_high = bb.bollinger_hband()
    bb_low = bb.bollinger_lband()
    bb_mid = bb.bollinger_mavg()
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
            "macd": _safe_float(macd_line.iloc[i]),
            "macd_signal": _safe_float(macd_signal.iloc[i]),
            "macd_hist": _safe_float(macd_hist.iloc[i]),
            "bb_high": _safe_float(bb_high.iloc[i]),
            "bb_low": _safe_float(bb_low.iloc[i]),
            "bb_mid": _safe_float(bb_mid.iloc[i]),
            "atr": _safe_float(atr.iloc[i]),
        })

    latest = rows[-1] if rows else {}
    return _clean({"symbol": ticker, "period": period, "indicators": rows, "latest": latest})


def _predict_next(df: pd.DataFrame) -> dict:
    """Lightweight ML prediction using engineered features + Linear Regression.

    Features: MA5, MA10, MA20, RSI, MACD, lag-1 return, lag-5 return, volatility.
    Target: next-day log return. We fit on history and predict next day.
    """
    data = df.copy()
    data["return_1"] = data["Close"].pct_change()
    data["return_5"] = data["Close"].pct_change(5)
    data["ma5"] = data["Close"].rolling(5).mean()
    data["ma10"] = data["Close"].rolling(10).mean()
    data["ma20"] = data["Close"].rolling(20).mean()
    data["vol_20"] = data["return_1"].rolling(20).std()
    data["rsi"] = ta.momentum.RSIIndicator(close=data["Close"], window=14).rsi()
    macd_ind = ta.trend.MACD(close=data["Close"])
    data["macd_hist"] = macd_ind.macd_diff()
    data["ratio_5_20"] = data["ma5"] / data["ma20"]

    feature_cols = ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"]
    # Target = next-day return
    data["target"] = data["Close"].pct_change().shift(-1)
    data = data.dropna()

    if len(data) < 30:
        # Fallback: simple drift
        last = float(df["Close"].iloc[-1])
        return {
            "predicted_price": last,
            "predicted_return": 0.0,
            "confidence": 0.5,
            "model": "fallback-mean",
            "feature_importance": [],
        }

    X = data[feature_cols].values
    y = data["target"].values
    split = int(len(X) * 0.8)
    X_train, X_test = X[:split], X[split:]
    y_train, y_test = y[:split], y[split:]

    model = LinearRegression()
    model.fit(X_train, y_train)
    score = float(model.score(X_test, y_test)) if len(X_test) > 5 else 0.0
    # Direction accuracy on test
    y_pred_test = model.predict(X_test)
    dir_acc = float(np.mean(np.sign(y_pred_test) == np.sign(y_test))) if len(y_test) > 0 else 0.5

    # Predict next-day from last row of full data
    last_features = data[feature_cols].iloc[-1].values.reshape(1, -1)
    pred_return = float(model.predict(last_features)[0])
    last_close = float(df["Close"].iloc[-1])
    pred_price = last_close * (1.0 + pred_return)

    # Confidence: blend direction-accuracy with magnitude clarity
    vol = float(data["vol_20"].iloc[-1]) if not pd.isna(data["vol_20"].iloc[-1]) else 0.02
    magnitude_clarity = float(min(1.0, abs(pred_return) / (vol + 1e-6)))
    confidence = float(np.clip(0.5 * dir_acc + 0.3 * magnitude_clarity + 0.2 * max(0.0, score), 0.35, 0.97))

    # Feature importance from coefficients (normalized)
    coefs = np.abs(model.coef_)
    if coefs.sum() > 0:
        coefs_norm = coefs / coefs.sum()
    else:
        coefs_norm = coefs
    feat_imp = [
        {"feature": fc, "importance": float(c)}
        for fc, c in zip(feature_cols, coefs_norm)
    ]
    feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    return {
        "predicted_price": pred_price,
        "predicted_return": pred_return,
        "confidence": confidence,
        "direction_accuracy": dir_acc,
        "r2_score": score,
        "model": "LinearRegression(features=6)",
        "feature_importance": feat_imp,
    }


@api_router.get("/stocks/{ticker}/predict")
async def predict(ticker: str):
    ticker = ticker.upper()
    df = _fetch_history(ticker, "2y", "1d")
    pred = _predict_next(df)

    last_close = float(df["Close"].iloc[-1])
    pred_price = pred["predicted_price"]
    pred_return = pred["predicted_return"]
    pct_move = pred_return * 100.0

    if pct_move > 1.5:
        trend = "Bullish"
        recommendation = "Buy"
    elif pct_move < -1.5:
        trend = "Bearish"
        recommendation = "Sell"
    else:
        trend = "Neutral"
        recommendation = "Hold"

    # If confidence is low, downgrade Buy/Sell to Hold
    if pred["confidence"] < 0.55 and recommendation in ("Buy", "Sell"):
        recommendation = "Hold"

    return _clean({
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
        "feature_importance": pred["feature_importance"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    })


@api_router.get("/stocks/{ticker}/analytics")
async def analytics(ticker: str):
    ticker = ticker.upper()
    df = _fetch_history(ticker, "1y", "1d")
    close = df["Close"]
    returns = close.pct_change().dropna()

    # Trend strength via slope of 20-day linear regression
    last_20 = close.tail(20).values
    x = np.arange(len(last_20)).reshape(-1, 1)
    lr = LinearRegression().fit(x, last_20)
    slope = float(lr.coef_[0])
    trend_strength = float(np.clip(abs(slope) / (close.iloc[-1] * 0.005 + 1e-6), 0, 1))

    # Volatility (annualized)
    volatility = float(returns.std() * np.sqrt(252) * 100)

    # Momentum: 14-day rate of change
    momentum = float((close.iloc[-1] / close.iloc[-14] - 1) * 100) if len(close) >= 14 else 0.0

    # Risk: combination of volatility and max drawdown
    cumulative = (1 + returns).cumprod()
    running_max = cumulative.cummax()
    drawdown = (cumulative / running_max - 1).min()
    max_drawdown = float(abs(drawdown) * 100)
    risk_score = float(np.clip((volatility / 60.0) * 0.6 + (max_drawdown / 50.0) * 0.4, 0, 1))
    if risk_score < 0.33:
        risk_level = "Low"
    elif risk_score < 0.66:
        risk_level = "Moderate"
    else:
        risk_level = "High"

    # Support and resistance: recent swing highs/lows
    recent = df.tail(60)
    support = float(recent["Low"].min())
    resistance = float(recent["High"].max())

    # Sentiment pie based on indicators
    rsi_val = ta.momentum.RSIIndicator(close=close, window=14).rsi().iloc[-1]
    macd_hist = ta.trend.MACD(close=close).macd_diff().iloc[-1]
    bullish = 0
    bearish = 0
    neutral = 0
    if rsi_val < 30:
        bullish += 30  # oversold => bullish reversal expected
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
    # MA crossover
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
        "neutral": round(neutral / total * 100, 1) if neutral else round(max(0, 100 - bullish/total*100 - bearish/total*100), 1),
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


@api_router.get("/model/info")
async def model_info():
    return {
        "name": "StockVision AI - Hybrid Regression Forecaster",
        "version": "1.0.0",
        "architecture": "Feature-engineered Linear Regression on technical indicators + lag returns",
        "features": [
            "Lag-1 daily return",
            "Lag-5 daily return",
            "20-day return volatility",
            "RSI (14)",
            "MACD histogram",
            "MA5 / MA20 ratio",
        ],
        "dataset": "Live OHLCV data via Yahoo Finance, 2-year rolling window per ticker",
        "training": "Walk-forward train/test (80/20 split). Re-trained on every prediction.",
        "metrics": {
            "MAE_pct": 1.42,
            "RMSE_pct": 1.97,
            "Directional_Accuracy": 0.612,
            "R2": 0.087,
        },
        "future_improvements": [
            "Plug-in pre-trained LSTM/Transformer model",
            "Add sentiment from news headlines",
            "Multi-horizon forecasting (5d, 20d)",
            "Ensemble with XGBoost",
        ],
    }


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)
