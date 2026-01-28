"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/supabase";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { StoreHeader } from "@/components/dashboard/StoreHeader";
import { AgentCard } from "@/components/dashboard/AgentCard";
import { FullChatView } from "@/components/dashboard/FullChatView";
import { AdminDashboard } from "@/components/admin";
import { useAgentsRealtime } from "@/hooks/useAgentsRealtime";
import { getStoreById } from "@/data/mock";

type ViewMode = "dashboard" | "chat";

export default function StoreDashboard() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.storeId as string;
  const { profile, isLoading: authLoading } = useAuth();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  // Check if user is admin
  const isAdmin = profile?.role === "admin";
  const organizationId = profile?.organization_id;

  // Use realtime hook for agents - users only see ACTIVE agents
  const { agents, isLoading: agentsLoading } = useAgentsRealtime({
    organizationId: organizationId || undefined,
    activeOnly: !isAdmin, // Users see only active, admins see all (handled in AdminDashboard)
  });

  // Combined loading state
  const isLoading = authLoading || (!isAdmin && agentsLoading);

  // Show timeout message if loading takes too long
  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setLoadingTimeout(true);
      }, 8000); // 8 seconds
      return () => clearTimeout(timer);
    } else {
      setLoadingTimeout(false);
    }
  }, [isLoading]);

  const store = getStoreById(storeId);
  const storeName = store?.name || "Tienda";

  // View state
  const [viewMode, setViewMode] = useState<ViewMode>("dashboard");
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  // Sidebar state
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const handleOpenChat = (agentId: string) => {
    setSelectedAgentId(agentId);
    setViewMode("chat");
  };

  const handleBackToDashboard = () => {
    setViewMode("dashboard");
    setSelectedAgentId(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex min-h-screen bg-dark-900 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-purple-500 border-t-transparent" />
            <span className="text-gray-400">Cargando...</span>
          </div>

          {/* Show timeout message with troubleshooting info */}
          {loadingTimeout && (
            <div className="max-w-md text-center mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
              <p className="text-yellow-400 text-sm font-medium mb-2">
                La carga está tardando más de lo esperado
              </p>
              <p className="text-gray-400 text-xs mb-3">
                Esto puede deberse a un problema con las políticas de seguridad de la base de datos (RLS).
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => router.push("/login")}
                  className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                >
                  Ir al Login
                </button>
                <button
                  onClick={() => window.location.reload()}
                  className="px-3 py-1.5 text-xs bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition-colors"
                >
                  Reintentar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-dark-900">
      {/* Sidebar - siempre visible */}
      <Sidebar
        isOpen={isSidebarOpen}
        onToggle={handleToggleSidebar}
        isAdmin={isAdmin}
      />

      {/* Main content - dynamic margin based on sidebar state */}
      <main
        className={`
          flex-1 p-4 transition-all duration-300 ease-in-out
          ${isSidebarOpen ? "ml-[280px]" : "ml-[80px]"}
        `}
      >
        {/* Admin View */}
        {isAdmin ? (
          <AdminDashboard storeId={storeId} storeName={storeName} />
        ) : viewMode === "chat" && selectedAgentId ? (
          /* Chat View - dentro del área principal */
          <FullChatView
            agentId={selectedAgentId}
            storeId={storeId}
            onBack={handleBackToDashboard}
          />
        ) : (
          /* Dashboard View - Header + Grid de agentes */
          <div className="p-4">
            {/* Header */}
            <StoreHeader storeId={storeId} />

            {/* Agents Grid - 3 columns (only active agents for users) */}
            <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {agents
                .filter((agent) => agent.is_active)
                .map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    storeId={storeId}
                    onOpenChat={handleOpenChat}
                  />
                ))}
            </div>

            {/* Show inactive agents as "coming soon" */}
            {agents.filter((agent) => !agent.is_active).length > 0 && (
              <div className="mt-8">
                <h3 className="text-sm font-medium text-gray-500 mb-4">
                  Próximamente
                </h3>
                <div className="grid gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 opacity-60">
                  {agents
                    .filter((agent) => !agent.is_active)
                    .map((agent) => (
                      <AgentCard
                        key={agent.id}
                        agent={agent}
                        storeId={storeId}
                        onOpenChat={handleOpenChat}
                      />
                    ))}
                </div>
              </div>
            )}

            {/* Empty state if no agents */}
            {agents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-500/20">
                  <svg
                    className="h-8 w-8 text-purple-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={1.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 4.5v15m7.5-7.5h-15"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white">
                  No hay agentes configurados
                </h3>
                <p className="mt-1 text-sm text-gray-400">
                  Añade tu primer agente para comenzar
                </p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
