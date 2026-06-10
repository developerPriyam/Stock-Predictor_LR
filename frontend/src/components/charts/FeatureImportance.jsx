import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Cell, Tooltip } from "recharts";

function ImpTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return <div className="glass-strong rounded p-2 font-mono-data text-xs"><span className="text-white">{payload[0].value.toFixed(1)}%</span></div>;
}

export default function FeatureImportance({ features }) {
  if (!features?.length) return <div className="h-40 flex items-center justify-center text-white/40 font-mono-data text-xs">—</div>;
  const data = features.map((f) => ({
    name: f.feature.replace(/_/g, " "),
    value: Math.round(f.importance * 1000) / 10,
  }));
  return (
    <div className="w-full h-40 mt-2">
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} width={70} />
          <Tooltip content={<ImpTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
          <Bar dataKey="value" radius={[0, 3, 3, 0]}>
            {data.map((_, i) => <Cell key={i} fill="#007AFF" fillOpacity={0.9 - i * 0.12} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
