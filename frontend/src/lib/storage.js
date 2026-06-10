import { useState, useEffect, useCallback } from "react";

export function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initial : JSON.parse(raw);
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  }, [key, value]);
  return [value, setValue];
}

const WATCHLIST_KEY = "sv:watchlist";
const RECENT_KEY = "sv:recent";
const PORTFOLIO_KEY = "sv:portfolio";

export function useWatchlist() {
  const [list, setList] = useLocalStorage(WATCHLIST_KEY, []);
  const add = useCallback((sym) => setList((l) => (l.includes(sym) ? l : [...l, sym].slice(-20))), [setList]);
  const remove = useCallback((sym) => setList((l) => l.filter((x) => x !== sym)), [setList]);
  const toggle = useCallback((sym) => setList((l) => (l.includes(sym) ? l.filter((x) => x !== sym) : [...l, sym].slice(-20))), [setList]);
  return { list, add, remove, toggle, isIn: (s) => list.includes(s) };
}

export function useRecent() {
  const [list, setList] = useLocalStorage(RECENT_KEY, []);
  const push = useCallback((sym) => setList((l) => [sym, ...l.filter((x) => x !== sym)].slice(0, 10)), [setList]);
  const clear = useCallback(() => setList([]), [setList]);
  return { list, push, clear };
}

export function usePortfolio() {
  const [holdings, setHoldings] = useLocalStorage(PORTFOLIO_KEY, []);
  // shape: [{symbol, shares, cost_basis}]
  const add = useCallback((h) => setHoldings((l) => {
    const i = l.findIndex((x) => x.symbol === h.symbol);
    if (i >= 0) { const c = [...l]; c[i] = h; return c; }
    return [...l, h];
  }), [setHoldings]);
  const remove = useCallback((sym) => setHoldings((l) => l.filter((x) => x.symbol !== sym)), [setHoldings]);
  return { holdings, add, remove, setHoldings };
}
