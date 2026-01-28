"use client";

import { type Agent } from "@/lib/api";
import SettingsIcon from "@mui/icons-material/Settings";
import PowerIcon from "@mui/icons-material/Power";
import PowerOffIcon from "@mui/icons-material/PowerOff";

interface AdminAgentCardProps {
  agent: Agent;
  onClick: () => void;
}

export function AdminAgentCard({ agent, onClick }: AdminAgentCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        group relative flex flex-col glass-card rounded-2xl p-5 cursor-pointer
        transition-all duration-300 hover:scale-[1.02] hover:shadow-glow
        ${!agent.is_active ? "opacity-60" : ""}
      `}
    >
      {/* Status Badge */}
      <div className="absolute top-3 right-3">
        {agent.is_active ? (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/20 rounded-full">
            <PowerIcon sx={{ fontSize: 12 }} className="text-green-400" />
            <span className="text-xs text-green-400">Activo</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-500/20 rounded-full">
            <PowerOffIcon sx={{ fontSize: 12 }} className="text-gray-400" />
            <span className="text-xs text-gray-400">Inactivo</span>
          </div>
        )}
      </div>

      {/* Icon */}
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 mb-4">
        <span className="text-2xl">{agent.icon}</span>
      </div>

      {/* Info */}
      <h3 className="text-base font-semibold text-white mb-1">{agent.name}</h3>
      <p className="text-xs text-purple-400 mb-2">{agent.role}</p>
      <p className="text-xs text-gray-500 line-clamp-2 mb-4 flex-1">
        {agent.description || "Sin descripción"}
      </p>

      {/* Config Info */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-2 py-1 text-xs bg-white/10 rounded-lg text-gray-400">
          {agent.ai_model || "gpt-4o-mini"}
        </span>
        <span className="px-2 py-1 text-xs bg-white/10 rounded-lg text-gray-400">
          T: {agent.temperature || 0.7}
        </span>
        <span className="px-2 py-1 text-xs bg-white/10 rounded-lg text-gray-400">
          v{agent.version || 1}
        </span>
      </div>

      {/* Configure Button */}
      <button
        className="
          flex items-center justify-center gap-2 w-full py-2.5 rounded-xl
          bg-purple-600/20 hover:bg-purple-600 border border-purple-500/30
          text-purple-400 hover:text-white text-sm font-medium
          transition-all duration-200 group-hover:bg-purple-600 group-hover:text-white
        "
      >
        <SettingsIcon fontSize="small" />
        Configurar
      </button>
    </div>
  );
}
