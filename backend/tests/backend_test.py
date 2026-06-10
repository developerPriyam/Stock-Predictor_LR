"""StockVision AI backend API tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://stockvision-ai-3.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 60


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# ---------- Health & catalogs ----------
def test_root_health(client):
    r = client.get(f"{API}/", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ok"
    assert "ts" in data


def test_popular(client):
    r = client.get(f"{API}/stocks/popular", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "tickers" in data
    assert isinstance(data["tickers"], list)
    assert len(data["tickers"]) >= 10
    symbols = {t["symbol"] for t in data["tickers"]}
    assert "AAPL" in symbols and "TSLA" in symbols


def test_search_with_query(client):
    r = client.get(f"{API}/stocks/search", params={"q": "tes"}, timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert "results" in data
    assert any(t["symbol"] == "TSLA" for t in data["results"])


def test_search_empty(client):
    r = client.get(f"{API}/stocks/search", params={"q": ""}, timeout=TIMEOUT)
    assert r.status_code == 200
    assert len(r.json()["results"]) > 0


def test_search_unknown_ticker(client):
    r = client.get(f"{API}/stocks/search", params={"q": "ZZZNOTREAL"}, timeout=TIMEOUT)
    assert r.status_code == 200
    res = r.json()["results"]
    assert len(res) == 1
    assert res[0]["symbol"] == "ZZZNOTREAL"


# ---------- Quote ----------
def test_quote_aapl(client):
    r = client.get(f"{API}/stocks/AAPL/quote", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["symbol"] == "AAPL"
    assert isinstance(d["price"], (int, float))
    assert d["price"] > 0
    assert "change_percent" in d
    assert "market_cap" in d
    assert "fifty_two_week_high" in d
    assert "fifty_two_week_low" in d


def test_quote_invalid(client):
    r = client.get(f"{API}/stocks/XYZINVALID/quote", timeout=TIMEOUT)
    # Expect graceful 404 or 500. Spec says 404.
    assert r.status_code in (404, 500), r.text
    if r.status_code == 500:
        pytest.fail(f"Invalid ticker should return 404, got 500: {r.text}")


# ---------- History ----------
@pytest.mark.parametrize("period", ["1M", "1Y"])
def test_history(client, period):
    r = client.get(f"{API}/stocks/AAPL/history", params={"period": period}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["symbol"] == "AAPL"
    assert d["period"] == period
    assert isinstance(d["candles"], list)
    assert len(d["candles"]) > 0
    c = d["candles"][0]
    for k in ["date", "open", "high", "low", "close", "volume"]:
        assert k in c


# ---------- Indicators ----------
def test_indicators(client):
    r = client.get(f"{API}/stocks/AAPL/indicators", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["symbol"] == "AAPL"
    assert isinstance(d["indicators"], list)
    assert len(d["indicators"]) > 50
    row = d["indicators"][-1]
    for k in ["ma20", "ma50", "rsi", "macd", "bb_high", "bb_low", "atr"]:
        assert k in row
    # latest should have non-null indicators
    latest = d["latest"]
    assert latest.get("rsi") is not None


# ---------- Predict ----------
def test_predict(client):
    r = client.get(f"{API}/stocks/AAPL/predict", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "predicted_price" in d
    assert d["trend"] in ("Bullish", "Bearish", "Neutral")
    assert d["recommendation"] in ("Buy", "Sell", "Hold")
    assert 0 <= d["confidence"] <= 1
    assert isinstance(d["feature_importance"], list)
    assert len(d["feature_importance"]) > 0


# ---------- Analytics ----------
def test_analytics(client):
    r = client.get(f"{API}/stocks/AAPL/analytics", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    for k in ["trend_strength", "volatility_pct", "momentum_pct", "risk_level", "support", "resistance", "sentiment"]:
        assert k in d
    s = d["sentiment"]
    for k in ["bullish", "bearish", "neutral"]:
        assert k in s
    assert d["risk_level"] in ("Low", "Moderate", "High")


# ---------- Model info ----------
def test_model_info(client):
    r = client.get(f"{API}/model/info", timeout=TIMEOUT)
    assert r.status_code == 200
    d = r.json()
    m = d["metrics"]
    for k in ["MAE_pct", "RMSE_pct", "Directional_Accuracy", "R2"]:
        assert k in m
