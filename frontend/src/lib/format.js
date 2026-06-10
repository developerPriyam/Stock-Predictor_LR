export const fmtPrice = (n, currency = "USD") => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const opts = { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 };
  try {
    return new Intl.NumberFormat("en-US", opts).format(n);
  } catch {
    return `$${Number(n).toFixed(2)}`;
  }
};

export const fmtNum = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return Number(n).toFixed(digits);
};

export const fmtPct = (n, digits = 2) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${Number(n).toFixed(digits)}%`;
};

export const fmtCompact = (n) => {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(n);
};

export const fmtVolume = (n) => {
  if (!n) return "—";
  return new Intl.NumberFormat("en-US", { notation: "compact" }).format(n);
};
