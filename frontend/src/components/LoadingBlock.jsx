export default function LoadingBlock({ h = 200 }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3" style={{ height: h }}>
      <div className="flex gap-1.5">
        <span className="loading-dot w-2 h-2 rounded-full bg-[#007AFF]" />
        <span className="loading-dot w-2 h-2 rounded-full bg-[#007AFF]" />
        <span className="loading-dot w-2 h-2 rounded-full bg-[#007AFF]" />
      </div>
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">Loading market data…</div>
    </div>
  );
}
