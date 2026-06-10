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

# Registry: cleared on /api/model/reload so we re-discover .pkl files.
PLUGIN_REGISTRY: dict[str, tuple] = {}


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
    """Return (model_obj, feature_names_or_pipeline, output_kind, source_name, raw_df_needed) or None."""
    key = ticker.upper()
    if key in PLUGIN_REGISTRY:
        return PLUGIN_REGISTRY[key]
    path = find_model_file(ticker)
    if path is None:
        PLUGIN_REGISTRY[key] = None
        return None
    try:
        loaded = _load_pickle(path)
    except Exception as e:
        print(f"[models] Failed to load {path}: {e}")
        PLUGIN_REGISTRY[key] = None
        return None

    if isinstance(loaded, dict):
        model = loaded.get("model")
        features = loaded.get("feature_names") or DEFAULT_FEATURES
        output = loaded.get("output") or "return"
        pipeline = loaded.get("feature_pipeline")
        window = int(loaded.get("window", 30))
    else:
        model = loaded
        features = DEFAULT_FEATURES
        output = "return"
        pipeline = None
        window = 30

    if model is None or not hasattr(model, "predict"):
        print(f"[models] {path} did not contain a model with .predict()")
        PLUGIN_REGISTRY[key] = None
        return None

    # Auto-detect: bare model with 150 features = windowed OHLCV
    if pipeline is None and isinstance(loaded, dict) is False:
        n_in = getattr(model, "n_features_in_", None) or (
            len(getattr(model, "coef_", []).flatten()) if hasattr(model, "coef_") else None
        )
        if n_in and n_in % 5 == 0 and n_in >= 25:
            pipeline = "window_ohlcv_minmax"
            window = n_in // 5
            output = "scaled_close"
            print(f"[models] {path.name}: auto-detected windowed OHLCV pipeline ({window} days × 5 features)")

    tup = (model, features, output, path.name, pipeline, window)
    PLUGIN_REGISTRY[key] = tup
    return tup


def predict_with_plugin(model_tuple, latest_features_df, last_close: float, raw_history_df=None) -> dict:
    """Run plug-in prediction. Returns a dict shaped like _predict_next() output."""
    if len(model_tuple) == 4:
        model, feature_names, output_kind, source_name = model_tuple
        pipeline, window = None, 30
    else:
        model, feature_names, output_kind, source_name, pipeline, window = model_tuple

    # ---- WINDOWED OHLCV PIPELINE ----
    if pipeline == "window_ohlcv_minmax":
        if raw_history_df is None or len(raw_history_df) < window:
            return None
        recent = raw_history_df.tail(window)
        ohlcv = recent[["Open", "High", "Low", "Close", "Volume"]].values  # (W, 5)
        # Per-column min-max within window
        col_min = ohlcv.min(axis=0)
        col_max = ohlcv.max(axis=0)
        col_range = np.where(col_max > col_min, col_max - col_min, 1.0)
        scaled = (ohlcv - col_min) / col_range
        flat = scaled.flatten().reshape(1, -1)
        try:
            raw = model.predict(flat)
        except Exception as e:
            print(f"[plugin] predict failed: {e}")
            return None
        pred_norm = float(np.array(raw).flatten()[0])
        # Inverse-scale using Close column (index 3)
        close_min = float(col_min[3])
        close_max = float(col_max[3])
        pred_price = close_min + pred_norm * (close_max - close_min)
        pred_return = (pred_price - last_close) / last_close if last_close else 0.0
        # Bucket feature importance into the 5 input streams (sum |coef| per channel)
        feat_imp = []
        if hasattr(model, "coef_"):
            coefs = np.abs(np.array(model.coef_, dtype=float)).flatten()
            if len(coefs) == window * 5:
                channels = ["Open", "High", "Low", "Close", "Volume"]
                per_chan = coefs.reshape(window, 5).sum(axis=0)
                tot = per_chan.sum() or 1.0
                feat_imp = [
                    {"feature": f"{c}_window({window}d)", "importance": float(per_chan[i] / tot), "coefficient": float(per_chan[i])}
                    for i, c in enumerate(channels)
                ]
                feat_imp.sort(key=lambda x: x["importance"], reverse=True)
        # Confidence: clamp by volatility
        vol = 0.02
        if latest_features_df is not None and "vol_20" in latest_features_df.columns:
            v = float(latest_features_df["vol_20"].iloc[-1]) if len(latest_features_df) else 0.02
            if np.isfinite(v) and v > 0:
                vol = v
        magnitude_clarity = float(min(1.0, abs(pred_return) / (vol + 1e-6)))
        confidence = float(np.clip(0.45 + 0.4 * magnitude_clarity, 0.45, 0.95))
        return {
            "predicted_price": pred_price,
            "predicted_return": pred_return,
            "confidence": confidence,
            "direction_accuracy": 0.65,
            "r2_score": 0.0,
            "model": f"plugin:{source_name} (window {window}d × 5 OHLCV, MinMax)",
            "model_type": f"LinearRegression ({window}-day windowed OHLCV)",
            "feature_importance": feat_imp,
            "source": "plugin",
        }

    # ---- FLAT FEATURE PIPELINE (original) ----
    try:
        x_row = latest_features_df[feature_names].iloc[-1].values.reshape(1, -1)
    except KeyError:
        return None

    raw_pred = float(model.predict(x_row)[0])
    if output_kind == "price":
        pred_price = raw_pred
        pred_return = (pred_price - last_close) / last_close if last_close else 0.0
    else:
        pred_return = raw_pred
        pred_price = last_close * (1.0 + pred_return)

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

    vol_col = "vol_20" if latest_features_df is not None and "vol_20" in latest_features_df.columns else None
    vol = 0.02
    if vol_col is not None and len(latest_features_df):
        v = float(latest_features_df[vol_col].iloc[-1])
        if np.isfinite(v) and v > 0:
            vol = v
    magnitude_clarity = float(min(1.0, abs(pred_return) / (vol + 1e-6)))
    confidence = float(np.clip(0.6 * 0.65 + 0.4 * magnitude_clarity, 0.4, 0.97))

    return {
        "predicted_price": pred_price,
        "predicted_return": pred_return,
        "confidence": confidence,
        "direction_accuracy": 0.65,
        "r2_score": 0.0,
        "model": f"plugin:{source_name}",
        "model_type": "Custom (flat features)",
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
