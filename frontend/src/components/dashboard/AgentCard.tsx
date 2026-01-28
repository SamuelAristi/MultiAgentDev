"use client";

import { type Agent } from "@/lib/api";

interface AgentCardProps {
  agent: Agent;
  storeId: string;
  onOpenChat: (agentId: string) => void;
}

/**
 * AgentCard Component
 * Tarjeta simplificada con nombre, estado, descripción y botón
 */
export function AgentCard({ agent, onOpenChat }: AgentCardProps) {
  const handleClick = () => {
    // Solo ejecutar si el agente está activo
    if (agent.is_active) {
      onOpenChat(agent.id);
    }
  };

  return (
    <div className="glass-card group relative overflow-hidden rounded-2xl p-5 transition-all duration-300 hover:shadow-glow">
      {/* Gradient overlay on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-600/5 to-pink-600/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      {/* Content */}
      <div className="relative z-10">
        {/* Header with icon and status */}
        <div className="mb-3 flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Agent icon */}
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 shadow-glow">
              <AgentIcon className="h-5 w-5 text-white" />
            </div>

            <h3 className="text-base font-semibold text-white">{agent.name}</h3>
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs text-gray-400">Online</span>
          </div>
        </div>

        {/* Description */}
        <p className="mb-4 text-sm text-gray-400 line-clamp-2">
          {agent.description}
        </p>

        {/* CTA Button */}
        <button
          onClick={handleClick}
          className="btn-gradient w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium text-white transition-all duration-200 hover:shadow-glow"
        >
          <ChatIcon className="h-4 w-4" />
          Abrir agente
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Icons
// ============================================================================

function AgentIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z"
      />
    </svg>
  );
}

function ChatIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z"
      />
    </svg>
  );
}
