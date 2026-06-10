import { ResponsiveContainer, ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, Bar, ReferenceLine } from "recharts";

export default function IndicatorChart({ data, mode = "ma_bb" }) {
  if (!data?.length) return <div className="h-60 flex items-center justify-center text-white/40 font-mono-data text-xs">No data</div>;

  if (mode === "ma_bb") {
    return (
      <div className="w-full h-60">
        <ResponsiveContainer>
          <ComposedChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
            <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} minTickGap={40} />
            <YAxis domain={["auto", "auto"]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} orientation="right" />
            <Tooltip content={<MultiTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }} />
            <Line type="monotone" dataKey="close" stroke="#FFFFFF" strokeWidth={1.5} dot={false} name="Close" />
            <Line type="monotone" dataKey="ma20" stroke="#007AFF" strokeWidth={1.3} dot={false} name="MA20" />
            <Line type="monotone" dataKey="ma50" stroke="#FFB300" strokeWidth={1.3} dot={false} name="MA50" />
            <Line type="monotone" dataKey="bb_high" stroke="rgba(0,200,83,0.5)" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Upper" />
            <Line type="monotone" dataKey="bb_low" stroke="rgba(255,59,48,0.5)" strokeWidth={1} dot={false} strokeDasharray="3 3" name="BB Lower" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // RSI + MACD stacked panels
  return (
    <div className="w-full h-60 grid grid-rows-2 gap-1">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" hide />
          <YAxis domain={[0, 100]} tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} orientation="right" />
          <ReferenceLine y={70} stroke="rgba(255,59,48,0.4)" strokeDasharray="3 3" />
          <ReferenceLine y={30} stroke="rgba(0,200,83,0.4)" strokeDasharray="3 3" />
          <Tooltip content={<MultiTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }} />
          <Line type="monotone" dataKey="rsi" stroke="#A78BFA" strokeWidth={1.3} dot={false} name="RSI" />
        </ComposedChart>
      </ResponsiveContainer>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.04)" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} minTickGap={40} />
          <YAxis tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: "IBM Plex Mono" }} tickLine={false} axisLine={false} orientation="right" />
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.2)" />
          <Tooltip content={<MultiTooltip />} cursor={{ stroke: "rgba(255,255,255,0.2)", strokeDasharray: "3 3" }} />
          <Bar dataKey="macd_hist" fill="rgba(0,122,255,0.5)" name="MACD Hist" />
          <Line type="monotone" dataKey="macd" stroke="#007AFF" strokeWidth={1.3} dot={false} name="MACD" />
          <Line type="monotone" dataKey="macd_signal" stroke="#FFB300" strokeWidth={1.3} dot={false} name="Signal" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

function MultiTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-strong rounded-lg p-3 font-mono-data text-xs space-y-1">
      <div className="text-white/40">{label}</div>
      {payload.filter(p => p.value !== null && p.value !== undefined).slice(0, 6).map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-white/60">{p.name}:</span>
          <span className="text-white">{typeof p.value === "number" ? p.value.toFixed(2) : p.value}</span>
        </div>
      ))}
    </div>
  );
}
