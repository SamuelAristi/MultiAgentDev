"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { apiClient, type Message, type Thread } from "@/lib/api";
import { useAuth } from "@/lib/supabase";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: string | undefined | null): value is string {
  return !!value && UUID_REGEX.test(value);
}

// Sort messages by created_at to ensure correct order
function sortMessagesByTime(messages: Message[]): Message[] {
  return [...messages].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
}

interface UseChatOptions {
  storeId?: string;
  agentId?: string;
  organizationId?: string;
}

interface UseChatReturn {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  thread: Thread | null;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  isConnected: boolean;
}

export function useChat(options: UseChatOptions = {}): UseChatReturn {
  const { storeId, agentId, organizationId } = options;
  const { user, profile } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const threadIdRef = useRef<string | null>(null);

  // Check API connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        await apiClient.healthCheck();
        setIsConnected(true);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
  }, []);

  // Get organization ID from profile or options
  const getOrgId = useCallback(() => {
    const orgId = organizationId || profile?.organization_id || null;
    if (!orgId) {
      console.warn("No organization_id available. Profile may not have loaded correctly.");
    }
    return orgId;
  }, [organizationId, profile]);

  // Create or get thread
  const ensureThread = useCallback(async (): Promise<string | null> => {
    if (threadIdRef.current) {
      return threadIdRef.current;
    }

    const orgId = getOrgId();
    if (!orgId || !user?.id) {
      console.warn("Cannot create thread:", { orgId, userId: user?.id });
      setError("No se pudo cargar tu perfil correctamente. Por favor, recarga la página o inicia sesión de nuevo.");
      return null;
    }

    try {
      // Only pass store_id and agent_id if they are valid UUIDs
      const newThread = await apiClient.createThread(orgId, user.id, {
        store_id: isValidUUID(storeId) ? storeId : undefined,
        agent_id: isValidUUID(agentId) ? agentId : undefined,
        title: "Nueva conversación",
      });

      threadIdRef.current = newThread.id;
      setThread(newThread);
      return newThread.id;
    } catch (err) {
      console.error("Failed to create thread:", err);
      return null;
    }
  }, [getOrgId, user, storeId, agentId]);

  // Send a message
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return;

      setError(null);
      setIsLoading(true);

      // Create optimistic user message
      const tempUserMessage: Message = {
        id: `temp-user-${Date.now()}`,
        thread_id: threadIdRef.current || "temp",
        role: "user",
        content: content.trim(),
        created_at: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, tempUserMessage]);

      try {
        // Use direct chat endpoint if we can't create threads
        const orgId = getOrgId();

        if (!isConnected) {
          // Fallback to mock response when API is not available
          await new Promise((resolve) => setTimeout(resolve, 1000));

          const mockResponse: Message = {
            id: `mock-assistant-${Date.now()}`,
            thread_id: "mock",
            role: "assistant",
            content: getMockResponse(content),
            created_at: new Date().toISOString(),
          };

          setMessages((prev) =>
            sortMessagesByTime(
              prev.map((m) =>
                m.id === tempUserMessage.id
                  ? { ...m, id: `user-${Date.now()}` }
                  : m
              ).concat(mockResponse)
            )
          );
          return;
        }

        // Try to use thread-based API
        const threadId = await ensureThread();

        if (threadId) {
          const response = await apiClient.sendThreadMessage(threadId, content);

          // Replace temp message with real one and add assistant response, then sort
          setMessages((prev) =>
            sortMessagesByTime(
              prev
                .map((m) =>
                  m.id === tempUserMessage.id ? response.user_message : m
                )
                .concat(response.assistant_message)
            )
          );
        } else {
          // Fallback to simple chat endpoint
          const response = await apiClient.sendChatMessage({
            message: content,
            organization_id: orgId || undefined,
          });

          const assistantMessage: Message = {
            id: `assistant-${Date.now()}`,
            thread_id: "direct",
            role: "assistant",
            content: response.response,
            created_at: new Date().toISOString(),
          };

          setMessages((prev) =>
            sortMessagesByTime(
              prev.map((m) =>
                m.id === tempUserMessage.id
                  ? { ...m, id: `user-${Date.now()}` }
                  : m
              ).concat(assistantMessage)
            )
          );
        }
      } catch (err) {
        console.error("Failed to send message:", err);
        setError(err instanceof Error ? err.message : "Error sending message");

        // On error, still show a fallback response
        const errorMessage: Message = {
          id: `error-assistant-${Date.now()}`,
          thread_id: threadIdRef.current || "error",
          role: "assistant",
          content:
            "Lo siento, hubo un error al procesar tu mensaje. Por favor intenta de nuevo.",
          created_at: new Date().toISOString(),
        };

        setMessages((prev) =>
          sortMessagesByTime(
            prev.map((m) =>
              m.id === tempUserMessage.id
                ? { ...m, id: `user-${Date.now()}` }
                : m
            ).concat(errorMessage)
          )
        );
      } finally {
        setIsLoading(false);
      }
    },
    [getOrgId, ensureThread, isConnected]
  );

  // Clear messages and reset thread
  const clearMessages = useCallback(() => {
    setMessages([]);
    setThread(null);
    threadIdRef.current = null;
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    thread,
    sendMessage,
    clearMessages,
    isConnected,
  };
}

// Mock response generator for when API is not available
function getMockResponse(userMessage: string): string {
  const message = userMessage.toLowerCase();

  if (message.includes("hook") || message.includes("anuncio")) {
    return `Aquí tienes algunos hooks para tu anuncio:

🎯 **Hook 1 (Problema/Solución)**
"¿Cansada de fajas que se enrollan? Descubre la faja que se mantiene en su lugar TODO el día."

🎯 **Hook 2 (Curiosidad)**
"El secreto de las colombianas para lucir 2 tallas menos en segundos..."

🎯 **Hook 3 (Testimonio)**
"Después de probar 10 fajas diferentes, finalmente encontré LA indicada."

¿Quieres que desarrolle alguno de estos hooks o prefieres más opciones?`;
  }

  if (message.includes("descripción") || message.includes("producto")) {
    return `**Descripción de Producto**

✨ FAJA COLOMBIANA DE ALTA COMPRESIÓN

Diseñada para moldear tu silueta al instante. Nuestra faja premium combina la tradición colombiana con tecnología de compresión avanzada.

**Beneficios:**
• Reduce hasta 2 tallas instantáneamente
• Tela transpirable que no irrita la piel
• Costuras invisibles bajo la ropa
• Soporte lumbar para mejor postura

**Incluye:** Faja + Bolsa de lavado + Guía de tallas

¿Necesitas algún ajuste en el tono o quieres destacar otros beneficios?`;
  }

  if (message.includes("email") || message.includes("correo")) {
    return `**Asunto:** ✨ 30% OFF solo por hoy - Tu faja perfecta te espera

Hola [Nombre],

Sabemos que encontrar la faja perfecta puede ser un desafío. Por eso, hoy queremos hacértelo más fácil.

**Solo por las próximas 24 horas:**
→ 30% de descuento en toda la colección
→ Envío gratis en compras +$50
→ Garantía de 30 días

[COMPRAR AHORA]

Miles de mujeres ya transformaron su silueta. ¿Lista para ser la siguiente?

Con cariño,
El equipo de [Tienda]

¿Quieres ajustar el descuento o agregar un código promocional específico?`;
  }

  return `¡Hola! Soy tu asistente de copywriting. Puedo ayudarte con:

• 📝 **Hooks** para anuncios de TikTok y Facebook
• 🛍️ **Descripciones** de productos optimizadas
• ✉️ **Emails** promocionales y secuencias
• 📣 **Copy** para redes sociales

¿Qué tipo de contenido necesitas hoy?`;
}
