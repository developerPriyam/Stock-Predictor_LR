# 📈 StockVision AI

**AI-Powered Stock Research, Analytics & Forecasting Platform**

StockVision AI is a production-ready fintech application that combines machine learning, financial analytics, explainable AI, and modern web engineering to deliver stock research and next-day price forecasting across global markets.

Built with **React, FastAPI, Machine Learning, Yahoo Finance, and AI-powered news intelligence**, the platform supports stocks, ETFs, indices, and cryptocurrencies while maintaining low-latency performance through caching and plug-in model architecture.

---

## 🚀 Features

### Market Research & Analytics

* Real-time stock quotes
* Historical OHLCV data
* Technical indicators

  * MA20
  * MA50
  * RSI
  * MACD
  * Bollinger Bands
  * ATR
* Support & resistance analysis
* Volatility and momentum scoring
* Risk assessment

### AI-Powered Forecasting

* Next-day stock price prediction
* Trend classification

  * Bullish
  * Bearish
  * Neutral
* Confidence scoring
* Buy / Hold / Sell recommendations
* Feature importance visualization
* Explainable prediction pipeline

### Global Market Coverage

Supports any Yahoo Finance ticker:

* 🇺🇸 US Stocks (AAPL, TSLA, NVDA, MSFT)
* 🇮🇳 NSE Stocks (RELIANCE.NS, TCS.NS, INFY.NS)
* 🇮🇳 BSE Stocks (.BO)
* 📈 Indices (^GSPC, ^NSEI)
* ₿ Cryptocurrencies (BTC-USD, ETH-USD)
* 📊 ETFs

### News Intelligence

* Latest company news
* Sentiment analysis
* AI-generated summaries
* Bullish/Bearish classification

### Portfolio Utilities

* PDF report export
* CSV export
* Shareable research links

---

# 🏗 System Architecture

```text
React 19 + Tailwind CSS
│
├── Landing Page
├── Dashboard
├── Research
├── Compare
├── Portfolio
└── Project Showcase
         │
         ▼
FastAPI Backend
│
├── Quotes API
├── History API
├── Indicators API
├── Prediction API
├── Analytics API
├── News API
└── Model Management API
         │
         ▼
Machine Learning Layer
│
├── Custom Uploaded Models
├── Built-in Forecast Model
└── Feature Engineering Pipeline
         │
         ▼
Yahoo Finance + AI News Processing
```

---

# ⚡ Prediction Engine

### Built-In Model

StockVision AI includes a feature-engineered Linear Regression forecasting engine using:

| Feature          | Purpose             |
| ---------------- | ------------------- |
| Return (1D)      | Short-term momentum |
| Return (5D)      | Weekly momentum     |
| Volatility (20D) | Risk regime         |
| RSI              | Overbought/Oversold |
| MACD Histogram   | Trend acceleration  |
| MA5 / MA20 Ratio | Trend strength      |

### Custom Model Plug-In System

The platform supports hot-swappable user models.

```text
/app/backend/models/

default.pkl
AAPL.pkl
TSLA.pkl
```

Supported formats:

```python
model
```

or

```python
{
    "model": estimator,
    "feature_names": [...],
    "output": ...
}
```

Benefits:

* No code changes required
* Automatic model discovery
* Graceful fallback
* Dynamic feature importance extraction
* Production deployment ready

---

## 📊 Model Evaluation Results

The forecasting models were evaluated using Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) on unseen test data.

| Model               | MAE   | RMSE  |
| ------------------- | ----- | ----- |
| Baseline Model      | 9.56  | 12.66 |
| Linear Regression   | 10.40 | 13.55 |
| LSTM Neural Network | 14.37 | 18.21 |

### Model Selection

Although multiple forecasting approaches were explored, the platform was designed with a plug-in architecture that allows custom trained models to be deployed without code changes.

The current deployment uses a user-uploaded custom model through the StockVision AI plug-in system.

### Training Pipeline

1. Historical stock data collected using Yahoo Finance.
2. Technical indicators generated:

   * MA20
   * MA50
   * RSI
   * MACD
   * Bollinger Bands
   * ATR
3. Feature scaling using MinMaxScaler.
4. Walk-forward train/test split.
5. Model evaluation on unseen market data.
6. Deployment through StockVision AI's dynamic model loader.

### Notes

Stock market forecasting is inherently noisy and non-stationary. The objective of this project is to demonstrate end-to-end machine learning engineering, feature engineering, model deployment, explainability, caching, and scalable fintech application development rather than guarantee trading performance.

# ⚙ Performance Optimizations

### Multi-Layer TTL Cache

| Endpoint    | TTL    |
| ----------- | ------ |
| Predictions | 5 min  |
| Quotes      | 60 sec |
| History     | 10 min |
| News        | 15 min |

Results:

* Cold prediction: ~3 seconds
* Cached prediction: ~10 milliseconds
* Up to 11× latency improvement

### Additional Optimizations

* Thread-safe cache implementation
* Request deduplication
* Automatic cache invalidation
* Model hot-reload support

---

# 🔬 Technical Challenges Solved

### Data Reliability

* NaN and Inf sanitization
* Robust JSON serialization
* Missing data handling

### Financial Data Constraints

* Yahoo Finance rate limiting mitigation
* Intelligent caching strategy
* Multi-market ticker normalization

### Machine Learning Reliability

* Chronological train/test split
* No lookahead bias
* Dynamic model loading
* Explainable predictions

### Production Engineering

* Plug-in architecture
* Hot model swapping
* Cache-aware inference
* Modular API design

---

# 📁 API Endpoints

```text
GET    /api/stocks/popular
GET    /api/stocks/search
GET    /api/stocks/{ticker}/quote
GET    /api/stocks/{ticker}/history
GET    /api/stocks/{ticker}/indicators
GET    /api/stocks/{ticker}/predict
GET    /api/stocks/{ticker}/analytics

GET    /api/profile
GET    /api/news
GET    /api/compare
GET    /api/explain

GET    /api/model/info
POST   /api/model/reload

GET    /api/cache/stats
DELETE /api/cache
```

---

# 🛠 Technology Stack

### Frontend

* React 19
* Tailwind CSS
* React Query
* React Router
* Recharts
* jsPDF

### Backend

* FastAPI
* Uvicorn
* yfinance
* scikit-learn
* Pandas
* NumPy

### AI & ML

* Linear Regression
* Plug-in Model Architecture
* Claude Sonnet 4.5 News Summaries

### Deployment

* Docker
* Hugging Face Spaces
* Render
* Vercel (Frontend)

---

# 🎯 Business Impact

* 11× faster prediction latency through caching
* Universal ticker support across global markets
* Plug-in architecture enables custom model deployment without code changes
* Portfolio-ready fintech platform suitable for internships, placements, ML engineering interviews, and data science showcases

---

# 🔮 Future Roadmap

* Multi-horizon forecasting (5D, 20D, 60D)
* Transformer-based forecasting models
* News sentiment ensemble learning
* Live WebSocket market feeds
* Portfolio optimization engine
* Options analytics
* Reinforcement-learning trading simulations

---

## 👨‍💻 Author

Built as an end-to-end Machine Learning + Full-Stack Engineering project focused on financial analytics, explainable AI, and scalable deployment.
