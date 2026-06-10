import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmtPrice, fmtPct, fmtNum } from "@/lib/format";

const TREND_COLORS = {
  Bullish: { bg: "bg-[#00C853]/10", border: "border-[#00C853]/30", text: "text-[#4CAF50]", icon: TrendingUp },
  Bearish: { bg: "bg-[#FF3B30]/10", border: "border-[#FF3B30]/30", text: "text-[#FF5252]", icon: TrendingDown },
  Neutral: { bg: "bg-white/[0.04]", border: "border-white/10", text: "text-white/70", icon: Minus },
};
const REC_COLORS = {
  Buy: "bg-[#00C853] text-white",
  Sell: "bg-[#FF3B30] text-white",
  Hold: "bg-white/10 text-white",
};

export default function PredictionCard({ prediction, currency = "USD" }) {
  if (!prediction) return null;
  const tc = TREND_COLORS[prediction.trend] || TREND_COLORS.Neutral;
  const Icon = tc.icon;

  return (
    <div className="glass rounded-xl p-6 h-full flex flex-col" data-testid="prediction-card">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">// AI Forecast</div>
          <div className="font-display text-lg mt-1">Next-Day Prediction</div>
        </div>
        <div className={`px-2.5 py-1 rounded-md text-xs font-mono-data border ${tc.bg} ${tc.border} ${tc.text} flex items-center gap-1`}>
          <Icon className="w-3 h-3" /> {prediction.trend.toUpperCase()}
        </div>
      </div>

      <div className="mt-5 space-y-1">
        <div className="font-mono-data text-4xl font-semibold">{fmtPrice(prediction.predicted_price, currency)}</div>
        <div className={`font-mono-data text-sm ${tc.text}`}>
          {fmtPct(prediction.predicted_change_percent)} expected move
        </div>
      </div>

      <div className="mt-5 border-t border-white/10 pt-4 grid grid-cols-2 gap-3">
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Confidence</div>
          <div className="font-mono-data text-lg mt-1">{Math.round((prediction.confidence || 0) * 100)}%</div>
        </div>
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Current</div>
          <div className="font-mono-data text-lg mt-1">{fmtPrice(prediction.current_price, currency)}</div>
        </div>
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Dir. Acc.</div>
          <div className="font-mono-data text-lg mt-1">{Math.round((prediction.direction_accuracy || 0) * 100)}%</div>
        </div>
        <div>
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Model</div>
          <div className="font-mono-data text-xs mt-2 text-white/70 truncate">{prediction.model}</div>
        </div>
      </div>

      <div className="mt-auto pt-5">
        <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">Recommendation</div>
        <div className={`text-center py-3 rounded-lg font-display text-2xl font-semibold ${REC_COLORS[prediction.recommendation]}`} data-testid="recommendation-badge">
          {prediction.recommendation.toUpperCase()}
        </div>
      </div>
    </div>
  );
}
