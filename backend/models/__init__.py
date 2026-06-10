"""Plug-in model loader for StockVision AI.

How to plug in your own pre-trained model
-----------------------------------------
1. Drop a pickle/joblib file into this directory:
     /app/backend/models/default.pkl                 (used for all tickers)
     /app/backend/models/<TICKER>.pkl                (used only for that ticker, e.g. AAPL.pkl)

   Ticker-specific files take precedence over `default.pkl`.

2. The file can be ONE of two shapes:

   (a) A bare sklearn-like estimator:
       - exposes `.predict(X)` and ideally `.coef_` or `.feature_importances_`.
       - Expected to predict next-day pct return (float) given the standard
         StockVision feature matrix.

   (b) A dict bundle (recommended for full control):
       {
         "model": <estimator with .predict>,
         "feature_names": ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"],
         "output": "return"  # "return" (default) or "price"
       }

3. Restart the backend (or hit /api/model/reload) and the new model is live.
   If no file is present, the built-in LinearRegression is used.

Example (to save your trained model):

    import joblib
    bundle = {
        "model": my_trained_model,
        "feature_names": ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"],
        "output": "return",
    }
    joblib.dump(bundle, "/app/backend/models/default.pkl")
"""
from __future__ import annotations

import os
import pickle
from pathlib import Path
from typing import Optional

import numpy as np

try:
    import joblib  # noqa: F401
    _HAS_JOBLIB = True
except ImportError:
    _HAS_JOBLIB = False

MODELS_DIR = Path(__file__).parent
DEFAULT_FEATURES = ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"]


def _load_pickle(path: Path):
    if _HAS_JOBLIB:
        try:
            return joblib.load(path)
        except Exception:
            pass
    with open(path, "rb") as f:
        return pickle.load(f)


def find_model_file(ticker: str) -> Optional[Path]:
    """Return the .pkl path to use for this ticker, or None."""
    ticker_path = MODELS_DIR / f"{ticker.upper()}.pkl"
    if ticker_path.exists():
        return ticker_path
    default_path = MODELS_DIR / "default.pkl"
    if default_path.exists():
        return default_path
    return None


def load_plugin_model(ticker: str):
    """Return (model_obj, feature_names, output_kind, source_name) or None."""
    path = find_model_file(ticker)
    if path is None:
        return None
    try:
        loaded = _load_pickle(path)
    except Exception as e:
        # Don't crash the API if the pkl is malformed.
        print(f"[models] Failed to load {path}: {e}")
        return None

    if isinstance(loaded, dict):
        model = loaded.get("model")
        features = loaded.get("feature_names") or DEFAULT_FEATURES
        output = loaded.get("output") or "return"
    else:
        model = loaded
        features = DEFAULT_FEATURES
        output = "return"

    if model is None or not hasattr(model, "predict"):
        print(f"[models] {path} did not contain a model with .predict()")
        return None

    return model, features, output, path.name


def predict_with_plugin(model_tuple, latest_features_df, last_close: float) -> dict:
    """Run plug-in prediction. Returns a dict shaped like _predict_next() output.

    No re-training is done here — the loaded model is used as-is.
    """
    model, feature_names, output_kind, source_name = model_tuple
    # Build feature row in the order the bundle expects.
    try:
        x_row = latest_features_df[feature_names].iloc[-1].values.reshape(1, -1)
    except KeyError:
        # If the bundle expects features we don't compute, fall back gracefully.
        return None

    raw_pred = float(model.predict(x_row)[0])
    if output_kind == "price":
        pred_price = raw_pred
        pred_return = (pred_price - last_close) / last_close if last_close else 0.0
    else:
        pred_return = raw_pred
        pred_price = last_close * (1.0 + pred_return)

    # Try to surface feature importance if the estimator exposes it.
    importances = None
    if hasattr(model, "feature_importances_"):
        importances = np.array(model.feature_importances_, dtype=float)
    elif hasattr(model, "coef_"):
        importances = np.abs(np.array(model.coef_, dtype=float)).flatten()
    feat_imp = []
    if importances is not None and len(importances) == len(feature_names):
        s = importances.sum()
        if s > 0:
            importances = importances / s
        feat_imp = [
            {"feature": fn, "importance": float(v)}
            for fn, v in zip(feature_names, importances)
        ]
        feat_imp.sort(key=lambda x: x["importance"], reverse=True)

    # Confidence proxy: bigger expected move (relative to recent vol) => higher
    vol_col = "vol_20" if "vol_20" in latest_features_df.columns else None
    vol = 0.02
    if vol_col is not None:
        v = float(latest_features_df[vol_col].iloc[-1])
        if np.isfinite(v) and v > 0:
            vol = v
    magnitude_clarity = float(min(1.0, abs(pred_return) / (vol + 1e-6)))
    confidence = float(np.clip(0.6 * 0.65 + 0.4 * magnitude_clarity, 0.4, 0.97))

    return {
        "predicted_price": pred_price,
        "predicted_return": pred_return,
        "confidence": confidence,
        "direction_accuracy": 0.65,  # placeholder; user-provided models can override via metadata
        "r2_score": 0.0,
        "model": f"plugin:{source_name}",
        "feature_importance": feat_imp,
        "source": "plugin",
    }


def list_plugin_models() -> list[dict]:
    """Return metadata about all .pkl files currently in the models dir."""
    out = []
    for p in sorted(MODELS_DIR.glob("*.pkl")):
        out.append({
            "file": p.name,
            "size_bytes": p.stat().st_size,
            "scope": "default" if p.stem == "default" else p.stem.upper(),
        })
    return out
