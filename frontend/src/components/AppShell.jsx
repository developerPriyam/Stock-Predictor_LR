import { NavLink, Outlet, useLocation } from "react-router-dom";
import { LayoutDashboard, BookOpen, Sparkles, Activity, TrendingUp, ArrowUpRight } from "lucide-react";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testId: "nav-dashboard" },
  { to: "/showcase", label: "Project Showcase", icon: Sparkles, testId: "nav-showcase" },
  { to: "/docs", label: "Documentation", icon: BookOpen, testId: "nav-docs" },
];

export default function AppShell() {
  const loc = useLocation();
  return (
    <div className="min-h-screen flex bg-[#050505]">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-white/[0.08] bg-[#050505] sticky top-0 h-screen" data-testid="app-sidebar">
        <NavLink to="/" className="px-6 py-6 border-b border-white/[0.08] flex items-center gap-2" data-testid="sidebar-logo">
          <div className="w-8 h-8 rounded-lg bg-[#007AFF] flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <div className="font-display text-lg font-semibold leading-none">StockVision</div>
            <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 mt-1">AI · v1.0</div>
          </div>
        </NavLink>

        <nav className="flex-1 px-3 py-6 space-y-1">
          <div className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/40 px-3 mb-3">Workspace</div>
          {NAV.map(({ to, label, icon: Icon, testId }) => {
            const active = loc.pathname === to;
            return (
              <NavLink
                key={to}
                to={to}
                data-testid={testId}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all ${
                  active ? "bg-white/5 text-white" : "text-white/60 hover:text-white hover:bg-white/[0.03]"
                }`}
              >
                {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-5 bg-[#007AFF] rounded-r" />}
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.08]">
          <div className="glass rounded-lg p-4 relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-[#00C853] pulse-dot rounded-full" />
              <span className="font-mono-data text-[10px] uppercase tracking-[0.2em] text-white/60">Live Market</span>
            </div>
            <p className="text-xs text-white/70">Real-time predictions powered by ML on Yahoo Finance data.</p>
          </div>
        </div>
      </aside>

      {/* Mobile top nav */}
      <div className="lg:hidden fixed top-0 inset-x-0 z-50 glass-strong border-b border-white/[0.08] px-4 py-3 flex items-center justify-between">
        <NavLink to="/" className="flex items-center gap-2" data-testid="mobile-logo">
          <div className="w-7 h-7 rounded-md bg-[#007AFF] flex items-center justify-center">
            <TrendingUp className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <span className="font-display font-semibold">StockVision</span>
        </NavLink>
        <div className="flex gap-1">
          {NAV.map(({ to, label, icon: Icon, testId }) => (
            <NavLink key={to} to={to} data-testid={`m-${testId}`} className={({ isActive }) =>
              `p-2 rounded-md ${isActive ? "bg-white/10 text-white" : "text-white/50"}`}>
              <Icon className="w-4 h-4" />
            </NavLink>
          ))}
        </div>
      </div>

      <main className="flex-1 min-w-0 lg:pt-0 pt-14">
        <Outlet />
      </main>
    </div>
  );
}
