# StockVision AI · Custom Model Plug-in Slot

Drop a `.pkl` file in this folder to override the built-in LinearRegression.

## File naming

| Filename | Scope |
|---|---|
| `default.pkl` | Used for **all tickers** when no ticker-specific file exists. |
| `<TICKER>.pkl` (e.g. `AAPL.pkl`, `TSLA.pkl`) | Used **only** for that ticker. Takes precedence over `default.pkl`. |

## File contents

The pickle/joblib file may contain either:

### (a) A bare estimator
Any object with a `.predict(X)` method (sklearn-compatible). Optionally exposes `.coef_` or `.feature_importances_` for the UI.

### (b) A bundle dict (recommended)
```python
{
    "model": my_trained_estimator,         # must have .predict
    "feature_names": [                      # in the exact order your model expects
        "return_1", "return_5", "vol_20",
        "rsi", "macd_hist", "ratio_5_20",
    ],
    "output": "return",                     # "return" (next-day pct return)
                                            #   or "price" (next-day absolute price)
}
```

## Feature definitions

The backend builds these features automatically per request from 2-year OHLCV:

- `return_1` — previous-day pct return
- `return_5` — 5-day pct return
- `vol_20`  — 20-day stdev of daily returns
- `rsi`     — RSI(14)
- `macd_hist` — MACD histogram
- `ratio_5_20` — MA5 / MA20

If your model uses a different feature set, just list them in `feature_names` and make sure the names match either the defaults above **or** columns you can compute downstream. Currently only the defaults are pre-computed.

## How to deploy

```bash
# from anywhere with your trained model in memory
import joblib
joblib.dump({
    "model": my_model,
    "feature_names": ["return_1", "return_5", "vol_20", "rsi", "macd_hist", "ratio_5_20"],
    "output": "return",
}, "/app/backend/models/default.pkl")
```

Then either restart the backend **or** call:

```
POST /api/model/reload
```

Confirm with:

```
GET /api/model/info
```

You will see `"source": "plugin"` and the filename in `model`.

## Notes

- The plug-in path **does not re-train** per request — it just runs `.predict()`. That's why caching is also enabled.
- If the plug-in fails to load or predict, the backend transparently falls back to the built-in model — your dashboard never breaks.
