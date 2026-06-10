export default function StatCard({ label, value, testId }) {
  return (
    <div className="glass rounded-xl p-5 lift-on-hover" data-testid={testId}>
      <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40">{label}</div>
      <div className="font-mono-data text-xl mt-2 accent-text">{value}</div>
    </div>
  );
}
