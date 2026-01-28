"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient, type Agent } from "@/lib/api";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

interface UseAgentsRealtimeOptions {
  organizationId: string | undefined;
  activeOnly?: boolean;
}

interface UseAgentsRealtimeReturn {
  agents: Agent[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

/**
 * Hook that loads agents and subscribes to realtime updates.
 * When an agent is updated by admin, all connected clients see the change immediately.
 */
export function useAgentsRealtime({
  organizationId,
  activeOnly = false,
}: UseAgentsRealtimeOptions): UseAgentsRealtimeReturn {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load agents from API
  const loadAgents = useCallback(async () => {
    if (!organizationId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.getAgents(organizationId, activeOnly);
      setAgents(response.agents);
    } catch (err) {
      console.error("Failed to load agents:", err);
      setError("Error al cargar los agentes");

      // Fallback to mock data for development
      setAgents(getMockAgents(organizationId));
    } finally {
      setIsLoading(false);
    }
  }, [organizationId, activeOnly]);

  // Subscribe to realtime updates
  useEffect(() => {
    if (!organizationId || !isSupabaseConfigured()) {
      return;
    }

    loadAgents();

    // Set up realtime subscription
    const supabase = getSupabase();
    let channel: RealtimeChannel | null = null;

    const setupSubscription = () => {
      channel = supabase
        .channel(`agents-${organizationId}`)
        .on(
          "postgres_changes",
          {
            event: "*", // Listen to INSERT, UPDATE, DELETE
            schema: "public",
            table: "agents",
            filter: `organization_id=eq.${organizationId}`,
          },
          (payload) => {
            console.log("Agent realtime update:", payload.eventType, payload);

            if (payload.eventType === "INSERT") {
              const newAgent = payload.new as Agent;
              // Only add if not activeOnly filter or agent is active
              if (!activeOnly || newAgent.is_active) {
                setAgents((prev) => [...prev, newAgent]);
              }
            } else if (payload.eventType === "UPDATE") {
              const updatedAgent = payload.new as Agent;
              setAgents((prev) => {
                // If activeOnly and agent became inactive, remove it
                if (activeOnly && !updatedAgent.is_active) {
                  return prev.filter((a) => a.id !== updatedAgent.id);
                }
                // If activeOnly and agent became active, add it
                if (activeOnly && updatedAgent.is_active && !prev.find((a) => a.id === updatedAgent.id)) {
                  return [...prev, updatedAgent];
                }
                // Otherwise update in place
                return prev.map((a) =>
                  a.id === updatedAgent.id ? updatedAgent : a
                );
              });
            } else if (payload.eventType === "DELETE") {
              const deletedAgent = payload.old as Agent;
              setAgents((prev) => prev.filter((a) => a.id !== deletedAgent.id));
            }
          }
        )
        .subscribe((status) => {
          console.log("Agents realtime subscription status:", status);
        });
    };

    setupSubscription();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [organizationId, activeOnly, loadAgents]);

  return {
    agents,
    isLoading,
    error,
    refresh: loadAgents,
  };
}

// Mock data for development/fallback
function getMockAgents(organizationId: string): Agent[] {
  return [
    {
      id: "55555555-5555-5555-5555-555555555555",
      organization_id: organizationId,
      name: "Agent Copy",
      slug: "agent-copy",
      role: "Copywriting Specialist",
      description: "Genera copies persuasivos, hooks virales y contenido de marketing",
      icon: "✍️",
      is_active: true,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model: "gpt-4o-mini",
      temperature: 0.8,
      max_tokens: 4096,
      welcome_message: "¡Hola! Soy tu asistente de copywriting.",
      capabilities: { rag_enabled: true, web_search: false, code_execution: false, image_generation: false },
      category: "marketing",
      version: 1,
    },
    {
      id: "66666666-6666-6666-6666-666666666666",
      organization_id: organizationId,
      name: "Agent ADS",
      slug: "agent-ads",
      role: "Advertising Specialist",
      description: "Crea y optimiza campañas publicitarias en múltiples plataformas",
      icon: "📢",
      is_active: false,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model: "gpt-4o",
      temperature: 0.6,
      max_tokens: 4096,
      welcome_message: "¡Hola! Soy tu especialista en publicidad digital.",
      capabilities: { rag_enabled: true, web_search: true, code_execution: false, image_generation: false },
      category: "advertising",
      version: 1,
    },
    {
      id: "77777777-7777-7777-7777-777777777777",
      organization_id: organizationId,
      name: "Agent Apelaciones",
      slug: "agent-apelaciones",
      role: "Appeals Specialist",
      description: "Redacta apelaciones profesionales para políticas de e-commerce",
      icon: "⚖️",
      is_active: false,
      settings: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ai_model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 8192,
      welcome_message: "¡Hola! Soy tu especialista en apelaciones.",
      capabilities: { rag_enabled: true, web_search: true, code_execution: false, image_generation: false },
      category: "legal",
      version: 1,
    },
  ];
}
