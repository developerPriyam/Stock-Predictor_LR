import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({ baseURL: API_BASE, timeout: 30000 });

export const fetchPopular = () => api.get("/stocks/popular").then((r) => r.data);
export const searchTickers = (q) => api.get("/stocks/search", { params: { q } }).then((r) => r.data);
export const fetchQuote = (ticker) => api.get(`/stocks/${ticker}/quote`).then((r) => r.data);
export const fetchHistory = (ticker, period = "1Y") =>
  api.get(`/stocks/${ticker}/history`, { params: { period } }).then((r) => r.data);
export const fetchIndicators = (ticker, period = "1Y") =>
  api.get(`/stocks/${ticker}/indicators`, { params: { period } }).then((r) => r.data);
export const fetchPrediction = (ticker) => api.get(`/stocks/${ticker}/predict`).then((r) => r.data);
export const fetchAnalytics = (ticker) => api.get(`/stocks/${ticker}/analytics`).then((r) => r.data);
export const fetchModelInfo = () => api.get("/model/info").then((r) => r.data);

export default api;
