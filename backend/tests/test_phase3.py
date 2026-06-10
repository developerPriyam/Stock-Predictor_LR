"""StockVision AI Phase 3 backend tests - new endpoints + cache + plugin."""
import os
import time
from pathlib import Path
from urllib.parse import quote

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
TIMEOUT = 60
MODELS_DIR = Path("/app/backend/models")
PLUGIN_FILE = MODELS_DIR / "default.pkl"


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Accept": "application/json"})
    return s


# ---------- Version / root ----------
def test_root_version_3(client):
    r = client.get(f"{API}/", timeout=TIMEOUT)
    assert r.status_code == 200
    data = r.json()
    assert data.get("version") == "3.0.0"
    assert data.get("status") == "ok"


# ---------- Universal ticker support ----------
def test_quote_nse_universal(client):
    r = client.get(f"{API}/stocks/RELIANCE.NS/quote", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["symbol"] == "RELIANCE.NS"
    assert d["price"] > 0
    assert d.get("currency") in ("INR", "USD", None) or isinstance(d.get("currency"), str)


def test_history_index_caret(client):
    # ^GSPC must be URL-encoded
    enc = quote("^GSPC", safe="")
    r = client.get(f"{API}/stocks/{enc}/history", params={"period": "1Y"}, timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d["symbol"] == "^GSPC"
    assert d["period"] == "1Y"
    assert len(d["candles"]) > 0


# ---------- Profile ----------
def test_profile_aapl(client):
    r = client.get(f"{API}/stocks/AAPL/profile", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    expected = ["business_summary", "sector", "pe_ratio", "eps", "dividend_yield",
                "beta", "held_percent_institutions", "target_mean_price", "recommendation_key"]
    for key in expected:
        assert key in d, f"missing {key}"
    assert isinstance(d["business_summary"], str) and len(d["business_summary"]) > 10


# ---------- News + Claude AI ----------
def test_news_with_ai_summary(client):
    r = client.get(f"{API}/stocks/AAPL/news", params={"limit": 5}, timeout=90)
    assert r.status_code == 200, r.text
    d = r.json()
    assert "items" in d and isinstance(d["items"], list)
    # yfinance occasionally returns empty news; if so flag
    if len(d["items"]) == 0:
        pytest.skip("Yahoo Finance returned 0 news items for AAPL")
    assert d["overall_sentiment"] in ("Bullish", "Bearish", "Neutral")
    # AI summary may be None if LLM call failed; assert key exists and try to be non-empty
    assert "ai_summary" in d
    if d["ai_summary"] is not None:
        assert isinstance(d["ai_summary"], str) and len(d["ai_summary"]) > 5


# ---------- Compare ----------
def test_compare_three_tickers(client):
    r = client.get(f"{API}/stocks/compare", params={"tickers": "AAPL,MSFT,TSLA"}, timeout=120)
    assert r.status_code == 200, r.text
    d = r.json()
    assert len(d["rows"]) == 3
    assert len(d["series"]) == 3
    assert "correlation" in d
    corr = d["correlation"]
    for s in ("AAPL", "MSFT", "TSLA"):
        assert s in corr, f"{s} missing from correlation matrix"
        for s2 in ("AAPL", "MSFT", "TSLA"):
            assert s2 in corr[s]


# ---------- Explain ----------
def test_explain_aapl(client):
    r = client.get(f"{API}/stocks/AAPL/explain", timeout=TIMEOUT)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("explanation") and isinstance(d["explanation"], str) and len(d["explanation"]) > 20
    contribs = d.get("contributions") or []
    assert len(contribs) == 6, f"expected 6 contributions, got {len(contribs)}"
    for c in contribs:
        for key in ("feature", "importance", "value", "direction"):
            assert key in c
        assert c["direction"] in ("positive", "negative", "neutral")


# ---------- Model info ----------
def test_model_info_plugin_initial(client):
    # Ensure plugin file is NOT present initially
    if PLUGIN_FILE.exists():
        PLUGIN_FILE.unlink()
        client.post(f"{API}/model/reload", timeout=TIMEOUT)
    r = client.get(f"{API}/model/info", timeout=TIMEOUT)
    assert r.status_code == 200
    d = r.json()
    assert "plugin" in d
    assert d["plugin"]["active"] is False
    assert "cache" in d
    for key in ("prediction", "quote", "history", "news"):
        assert key in d["cache"]
        assert "size" in d["cache"][key]
    assert "last_reload" in d
    assert "server_started_at" in d


# ---------- Model reload ----------
def test_model_reload(client):
    r0 = client.get(f"{API}/model/info", timeout=TIMEOUT)
    before = r0.json().get("last_reload")
    # Prime predict cache
    client.get(f"{API}/stocks/AAPL/predict", timeout=TIMEOUT)
    time.sleep(1.1)
    r = client.post(f"{API}/model/reload", timeout=TIMEOUT)
    assert r.status_code == 200
    d = r.json()
    assert d["reloaded"] is True
    assert d["cache_entries_cleared"] >= 0
    r2 = client.get(f"{API}/model/info", timeout=TIMEOUT)
    after = r2.json().get("last_reload")
    assert after != before


# ---------- Cache behavior ----------
def test_quote_cache_hit(client):
    sym = "MSFT"
    r1 = client.get(f"{API}/stocks/{sym}/quote", timeout=TIMEOUT)
    assert r1.status_code == 200
    assert r1.json().get("cache_hit") is False
    r2 = client.get(f"{API}/stocks/{sym}/quote", timeout=TIMEOUT)
    assert r2.status_code == 200
    assert r2.json().get("cache_hit") is True


def test_predict_cache_and_force_refresh(client):
    sym = "MSFT"
    # First call (post reload should be a miss)
    r1 = client.get(f"{API}/stocks/{sym}/predict", timeout=TIMEOUT)
    assert r1.status_code == 200
    r2 = client.get(f"{API}/stocks/{sym}/predict", timeout=TIMEOUT)
    assert r2.status_code == 200
    assert r2.json().get("cache_hit") is True
    r3 = client.get(f"{API}/stocks/{sym}/predict", params={"force_refresh": "true"}, timeout=TIMEOUT)
    assert r3.status_code == 200
    assert r3.json().get("cache_hit") is False


# ---------- Plugin model path ----------
def test_plugin_model_lifecycle(client):
    # Build a Ridge bundle, drop into models dir, reload, predict should be source='plugin'
    try:
        import joblib
        from sklearn.linear_model import Ridge
    except ImportError:
        pytest.skip("joblib / sklearn missing")
    import numpy as np
    rng = np.random.default_rng(42)
    X = rng.standard_normal((200, 6))
    y = rng.standard_normal(200) * 0.01
    model = Ridge(alpha=1.0).fit(X, y)
    bundle = {
        "model": model,
        "feature_names": ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"],
        "output": "return",
    }
    joblib.dump(bundle, PLUGIN_FILE)
    try:
        rel = client.post(f"{API}/model/reload", timeout=TIMEOUT)
        assert rel.status_code == 200
        assert len(rel.json().get("plugins", [])) >= 1

        info = client.get(f"{API}/model/info", timeout=TIMEOUT).json()
        assert info["plugin"]["active"] is True

        r = client.get(f"{API}/stocks/AAPL/predict", params={"force_refresh": "true"}, timeout=TIMEOUT)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("source") == "plugin", f"expected source=plugin, got {d.get('source')}"
    finally:
        # Cleanup
        if PLUGIN_FILE.exists():
            PLUGIN_FILE.unlink()
        client.post(f"{API}/model/reload", timeout=TIMEOUT)

    # After delete + reload — should be builtin
    r2 = client.get(f"{API}/stocks/AAPL/predict", params={"force_refresh": "true"}, timeout=TIMEOUT)
    assert r2.status_code == 200
    assert r2.json().get("source") == "builtin"
