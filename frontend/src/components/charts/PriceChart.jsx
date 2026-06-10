import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine } from "recharts";

export default function PriceChart({ candles }) {
  if (!candles?.length) return <div className="h-80 flex items-center justify-center text-white/40 font-mono-data text-xs">No data</div>;

  const data = candles.map((c) => ({ ...c }));
  const isUp = data[data.length - 1].close >= data[0].close;
  const color = isUp ? "#00C853" : "#FF3B30";

  return (
    <div className="w-full h-80">
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 8, bottom: 0 }}>
          <defs>
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} orientation="right" tickFormatter={(v) => v.toFixed(0)} />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }} />
          <Area type="monotone" dataKey="close" stroke={color} strokeWidth={2} fill="url(#priceGradient)" dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass-strong rounded-lg p-3 font-mono-data text-xs">
      <div className="text-white/40 mb-1">{label}</div>
      <div className="space-y-0.5">
        <div>O: <span className="text-white">{p.open?.toFixed(2)}</span></div>
        <div>H: <span className="text-[#4CAF50]">{p.high?.toFixed(2)}</span></div>
        <div>L: <span className="text-[#FF5252]">{p.low?.toFixed(2)}</span></div>
        <div>C: <span className="text-white">{p.close?.toFixed(2)}</span></div>
      </div>
    </div>
  );
}
