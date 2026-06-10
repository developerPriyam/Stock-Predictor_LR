export default function Gauge({ value = 0, label = "", color = "#007AFF" }) {
  const clamped = Math.max(0, Math.min(1, value));
  const angle = -90 + clamped * 180; // -90° to +90°
  const radius = 60;
  const cx = 80;
  const cy = 80;

  // Arc path
  const arc = (startAngle, endAngle) => {
    const polar = (a) => {
      const rad = (a * Math.PI) / 180;
      return [cx + radius * Math.cos(rad), cy + radius * Math.sin(rad)];
    };
    const [x1, y1] = polar(startAngle);
    const [x2, y2] = polar(endAngle);
    const large = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleLen = radius - 8;
  const needleX = cx + needleLen * Math.cos((angle * Math.PI) / 180);
  const needleY = cy + needleLen * Math.sin((angle * Math.PI) / 180);

  return (
    <div className="flex flex-col items-center mt-2">
      <svg viewBox="0 0 160 100" className="w-full max-w-[160px]">
        <path d={arc(180, 360)} stroke="rgba(255,255,255,0.08)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <path d={arc(180, 180 + clamped * 180)} stroke={color} strokeWidth="10" fill="none" strokeLinecap="round" style={{ filter: `drop-shadow(0 0 6px ${color}80)` }} />
        <line x1={cx} y1={cy} x2={needleX} y2={needleY} stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill="#fff" />
      </svg>
      <div className="font-mono-data text-xl mt-2" style={{ color }}>
        {Math.round(clamped * 100)}%
      </div>
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1 text-center">{label}</div>
    </div>
  );
}
