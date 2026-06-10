import { useEffect, useState } from "react";

/* Approximate US market hours: 9:30–16:00 ET (UTC-5/UTC-4) — for UX signal only */
function getStatus() {
  const now = new Date();
  const utc = now.getUTCHours() * 60 + now.getUTCMinutes();
  // 14:30 to 21:00 UTC = NYSE open (EST). Roughly.
  const open = utc >= 14 * 60 + 30 && utc <= 21 * 60;
  const day = now.getUTCDay();
  const weekday = day !== 0 && day !== 6;
  return open && weekday ? { open: true, label: "Markets Open" } : { open: false, label: "Markets Closed" };
}

export default function MarketStatus() {
  const [s, setS] = useState(getStatus());
  useEffect(() => {
    const id = setInterval(() => setS(getStatus()), 60000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="glass rounded-lg p-3" data-testid="market-status">
      <div className="flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${s.open ? "bg-[#00C853] pulse-dot" : "bg-white/30"}`} />
        <span className="font-mono-data text-[9px] uppercase tracking-[0.2em] text-white/60">{s.label}</span>
      </div>
      <div className="text-[11px] text-white/50 mt-1">NYSE / NASDAQ ref</div>
    </div>
  );
}
