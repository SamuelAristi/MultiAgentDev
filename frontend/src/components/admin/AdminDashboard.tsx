"use client";

import { useState, useEffect } from "react";
import { type Agent } from "@/lib/api";
import { useAuth } from "@/lib/supabase";
import { useAgentsRealtime } from "@/hooks/useAgentsRealtime";
import { AdminAgentCard } from "./AdminAgentCard";
import { AgentConfigPanel } from "./AgentConfigPanel";
import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";
import SyncIcon from "@mui/icons-material/Sync";

interface AdminDashboardProps {
  storeId: string;
  storeName: string;
}

export function AdminDashboard({ storeId, storeName }: AdminDashboardProps) {
  const { profile } = useAuth();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const organizationId = profile?.organization_id;

  // Use realtime hook for agents - admin sees ALL agents (activeOnly = false)
  const { agents, isLoading, error, refresh } = useAgentsRealtime({
    organizationId: organizationId || undefined,
    activeOnly: false,
  });

  // Keep selectedAgent in sync with realtime updates
  useEffect(() => {
    if (selectedAgent) {
      const updated = agents.find((a) => a.id === selectedAgent.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedAgent)) {
        setSelectedAgent(updated);
      }
    }
  }, [agents, selectedAgent]);

  // Handle agent save - the realtime subscription will update the list automatically
  const handleAgentSave = (updatedAgent: Agent) => {
    setSelectedAgent(updatedAgent);
    // Realtime will handle the list update
  };

  // If an agent is selected, show the config panel
  if (selectedAgent) {
    return (
      <AgentConfigPanel
        agent={selectedAgent}
        onBack={() => setSelectedAgent(null)}
        onSave={handleAgentSave}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] glass-card rounded-2xl overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-dark-800/50">
        <div>
          <h1 className="text-xl font-semibold text-white">Panel de Administración</h1>
          <p className="text-sm text-gray-500">{storeName} - Gestión de Agentes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Sync indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 bg-green-500/10 rounded-full">
            <SyncIcon sx={{ fontSize: 14 }} className="text-green-400" />
            <span className="text-xs text-green-400">Sincronizado</span>
          </div>

          <button
            onClick={refresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
          >
            <RefreshIcon fontSize="small" className={isLoading ? "animate-spin" : ""} />
            <span className="text-sm">Actualizar</span>
          </button>

          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-all"
          >
            <AddIcon fontSize="small" />
            Nuevo Agente
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-sm text-yellow-400">
            {error} - Mostrando datos de demostración
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
              <span className="text-gray-400">Cargando agentes...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="glass-card rounded-xl p-4">
                <p className="text-2xl font-bold text-white">{agents.length}</p>
                <p className="text-sm text-gray-500">Total Agentes</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-2xl font-bold text-green-400">
                  {agents.filter((a) => a.is_active).length}
                </p>
                <p className="text-sm text-gray-500">Activos</p>
              </div>
              <div className="glass-card rounded-xl p-4">
                <p className="text-2xl font-bold text-gray-400">
                  {agents.filter((a) => !a.is_active).length}
                </p>
                <p className="text-sm text-gray-500">Inactivos</p>
              </div>
            </div>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {agents.map((agent) => (
                <AdminAgentCard
                  key={agent.id}
                  agent={agent}
                  onClick={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
