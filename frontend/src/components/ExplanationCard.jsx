import { Sparkles, ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";

const FEATURE_NICE = {
  return_1: "Yesterday's return",
  return_5: "5-day return",
  vol_20: "20-day volatility",
  rsi: "RSI(14)",
  macd_hist: "MACD histogram",
  ratio_5_20: "MA5 / MA20 ratio",
};

export default function ExplanationCard({ data }) {
  if (!data) return null;
  const arrows = { positive: ArrowUpRight, negative: ArrowDownRight, neutral: Minus };
  const colors = { positive: "text-[#4CAF50]", negative: "text-[#FF5252]", neutral: "text-white/60" };
  return (
    <div className="glass rounded-2xl p-8" data-testid="explanation-card">
      <div className="flex items-center gap-3 mb-4">
        <Sparkles className="w-5 h-5 text-[#007AFF]" />
        <h2 className="font-display text-xl">Why this prediction?</h2>
      </div>
      <p className="text-white/85 leading-relaxed mb-6" data-testid="explanation-text">{data.explanation}</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(data.contributions || []).slice(0, 6).map((c) => {
          const Arrow = arrows[c.direction] || Minus;
          return (
            <div key={c.feature} className="border border-white/10 rounded-lg p-4 bg-white/[0.02]" data-testid={`contrib-${c.feature}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{FEATURE_NICE[c.feature] || c.feature}</span>
                <Arrow className={`w-3.5 h-3.5 ${colors[c.direction]}`} />
              </div>
              <div className="flex items-end justify-between">
                <div className="font-mono-data text-sm">{c.value !== null && c.value !== undefined ? c.value.toFixed(3) : "—"}</div>
                <div className="font-mono-data text-xs text-white/50">weight {(c.importance * 100).toFixed(0)}%</div>
              </div>
              <div className="mt-2 h-1 rounded-full bg-white/[0.05] overflow-hidden">
                <div className={c.direction === "positive" ? "bg-[#00C853]" : c.direction === "negative" ? "bg-[#FF3B30]" : "bg-white/30"} style={{ width: `${Math.min(100, c.importance * 100)}%`, height: "100%" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
