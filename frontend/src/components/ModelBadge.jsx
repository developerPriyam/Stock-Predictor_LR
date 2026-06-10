import { useQuery } from "@tanstack/react-query";
import { Cpu, ServerCog } from "lucide-react";
import { Link } from "react-router-dom";
import { fetchModelInfo } from "@/lib/api";

export default function ModelBadge() {
  const { data } = useQuery({ queryKey: ["model-info"], queryFn: fetchModelInfo, refetchInterval: 60000 });
  if (!data) return null;
  const active = data.plugin?.active;
  return (
    <Link to="/showcase" data-testid="model-badge" className="block glass rounded-lg p-3 relative overflow-hidden hover:bg-white/[0.05] transition">
      <div className="flex items-center gap-2 mb-1.5">
        {active ? <Cpu className="w-4 h-4 text-[#00C853]" /> : <ServerCog className="w-4 h-4 text-[#007AFF]" />}
        <span className="font-mono-data text-[9px] uppercase tracking-[0.2em] text-white/60">
          {active ? "Custom Model Active" : "Default Engine"}
        </span>
      </div>
      <div className="text-[11px] text-white/80 truncate" title={data.name}>{data.name}</div>
      <div className="font-mono-data text-[9px] text-white/40 mt-1 truncate">{data.model_type}</div>
    </Link>
  );
}
