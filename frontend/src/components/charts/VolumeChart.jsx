import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from "recharts";

function VolumeTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="glass-strong rounded-lg p-2 font-mono-data text-xs">
      <div className="text-white/40">{label}</div>
      <div className="text-white">Vol: {Intl.NumberFormat("en-US", { notation: "compact" }).format(p.volume)}</div>
    </div>
  );
}

export default function VolumeChart({ candles }) {
  if (!candles?.length) return null;
  const data = candles.map((c, i) => ({
    ...c,
    color: i > 0 && c.close < candles[i - 1].close ? "#FF3B30" : "#00C853",
  }));
  return (
    <div className="w-full h-24">
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mb-2">// Volume</div>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 0, right: 8, left: 8, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis hide />
          <Tooltip content={<VolumeTooltip />} cursor={false} />
          <Bar dataKey="volume" radius={[1, 1, 0, 0]}>
            {data.map((d, i) => <Cell key={i} fill={d.color} fillOpacity={0.5} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
