import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

const COLORS = { Bullish: "#00C853", Bearish: "#FF3B30", Neutral: "#8E8E93" };

function SentimentTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded p-2 font-mono-data text-xs">
      <span className="text-white/60">{payload[0].name}: </span>
      <span className="text-white">{payload[0].value.toFixed(1)}%</span>
    </div>
  );
}

export default function SentimentDonut({ sentiment }) {
  if (!sentiment) return <div className="h-40 flex items-center justify-center text-white/40 font-mono-data text-xs">—</div>;
  const data = [
    { name: "Bullish", value: sentiment.bullish || 0 },
    { name: "Bearish", value: sentiment.bearish || 0 },
    { name: "Neutral", value: sentiment.neutral || 0 },
  ];
  return (
    <div className="relative">
      <div className="w-full h-40">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} dataKey="value" innerRadius={45} outerRadius={70} paddingAngle={2} startAngle={90} endAngle={-270}>
              {data.map((d) => <Cell key={d.name} fill={COLORS[d.name]} stroke="none" />)}
            </Pie>
            <Tooltip content={<SentimentTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-2 flex justify-around text-[10px] font-mono-data">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: COLORS[d.name] }} />
            <span className="text-white/60">{d.name}</span>
            <span className="text-white">{d.value.toFixed(0)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
