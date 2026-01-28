"use client";

import { useState, useRef, useEffect } from "react";
import { getStoreById } from "@/data/mock";
import { apiClient, type Agent } from "@/lib/api";
import { useAuth } from "@/lib/supabase";
import { useChat } from "@/hooks/useChat";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SendIcon from "@mui/icons-material/Send";
import AddIcon from "@mui/icons-material/Add";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import IconButton from "@mui/material/IconButton";

interface FullChatViewProps {
  agentId: string;
  storeId: string;
  onBack: () => void;
}

/**
 * FullChatView Component
 * Vista de chat que ocupa el área principal (manteniendo sidebar visible)
 */
export function FullChatView({ agentId, storeId, onBack }: FullChatViewProps) {
  const [input, setInput] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { profile } = useAuth();

  // Use the chat hook for real API integration
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    isConnected,
  } = useChat({
    storeId,
    agentId,
  });

  // Fetch agent data from API
  useEffect(() => {
    const loadAgent = async () => {
      try {
        const agentData = await apiClient.getAgent(agentId);
        setAgent(agentData);
      } catch (err) {
        console.error("Failed to load agent:", err);
        // Fallback - set basic agent info
        setAgent({
          id: agentId,
          organization_id: profile?.organization_id || "",
          name: "Agent",
          slug: "agent",
          role: "Assistant",
          icon: "🤖",
          is_active: true,
          settings: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          ai_model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 2048,
          capabilities: { rag_enabled: true, web_search: false, code_execution: false, image_generation: false },
          category: "general",
        });
      }
    };

    loadAgent();
  }, [agentId, profile?.organization_id]);

  const store = getStoreById(storeId);
  const storeName = store?.name || "Tienda";

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-resize textarea
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 200) + "px";
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const messageContent = input.trim();
    setInput("");

    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }

    await sendMessage(messageContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleQuickAction = (action: string) => {
    setInput(action);
    inputRef.current?.focus();
  };

  const quickActions = [
    { label: "Hooks", prompt: "Crea hooks para un anuncio de fajas", icon: "🎯" },
    { label: "Descripción", prompt: "Escribe una descripción de producto", icon: "📝" },
    { label: "Anuncio", prompt: "Genera copy para Facebook Ads", icon: "📣" },
    { label: "Email", prompt: "Redacta un email promocional", icon: "✉️" },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-2rem)] glass-card rounded-2xl overflow-hidden">
      {/* Header con botón Atrás */}
      <header className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-dark-800/50">
        {/* Botón Atrás */}
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200"
        >
          <ArrowBackIcon fontSize="small" />
          <span className="text-sm font-medium">Atrás</span>
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-white/10" />

        {/* Agent Info */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 text-lg">
            {agent?.icon || "🤖"}
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">{agent?.name || "Agent"}</h1>
            <p className="text-xs text-gray-500">{agent?.role || storeName}</p>
          </div>
        </div>

        {/* Status */}
        <div className="ml-auto flex items-center gap-1.5">
          {isConnected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
              </span>
              <span className="text-xs text-gray-400">Online</span>
            </>
          ) : (
            <>
              <WifiOffIcon sx={{ fontSize: 14, color: "#f59e0b" }} />
              <span className="text-xs text-yellow-500">Modo local</span>
            </>
          )}
        </div>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          /* Welcome State */
          <div className="flex flex-col items-center justify-center h-full px-6">
            <div className="max-w-xl w-full text-center">
              {/* Greeting */}
              <div className="mb-6">
                <span className="text-2xl mb-2 block">{agent?.icon || "✨"}</span>
                <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">
                  {agent?.name || `Bienvenido a ${storeName}`}
                </h2>
                <p className="mt-2 text-sm text-gray-400">
                  {agent?.welcome_message || agent?.description || "¿En qué puedo ayudarte?"}
                </p>
              </div>

              {/* Quick Action Chips */}
              <div className="flex flex-wrap justify-center gap-2">
                {quickActions.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleQuickAction(action.prompt)}
                    className="
                      flex items-center gap-2 px-3 py-1.5 rounded-full
                      bg-white/5 border border-white/10
                      text-xs text-gray-300 hover:text-white
                      hover:bg-white/10 hover:border-purple-500/30
                      transition-all duration-200
                    "
                  >
                    <span>{action.icon}</span>
                    <span>{action.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="px-5 py-4 space-y-4">
            {/* Error message */}
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`
                    max-w-[80%] rounded-2xl px-4 py-3
                    ${
                      message.role === "user"
                        ? "bg-purple-600 text-white"
                        : "bg-white/5 border border-white/10 text-gray-200"
                    }
                  `}
                >
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {message.content}
                  </p>
                  <span className="mt-1 block text-xs opacity-50 text-right">
                    {new Date(message.created_at).toLocaleTimeString("es-ES", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
                    </div>
                    <span className="text-xs text-gray-400">Escribiendo...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-white/10 bg-dark-800/30 p-4">
        <div className="relative flex items-end gap-3 bg-dark-700 rounded-xl border border-white/10 p-2.5">
          {/* Add button */}
          <IconButton
            size="small"
            sx={{
              color: "#9ca3af",
              "&:hover": {
                color: "#a855f7",
                backgroundColor: "rgba(168, 85, 247, 0.1)",
              },
              padding: "6px",
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>

          {/* Textarea */}
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Escribe tu mensaje..."
            rows={1}
            className="
              flex-1 bg-transparent text-white placeholder-gray-500
              resize-none outline-none text-sm leading-relaxed
              max-h-[150px] py-1.5
            "
            disabled={isLoading}
          />

          {/* Send button */}
          <IconButton
            onClick={() => handleSubmit()}
            disabled={!input.trim() || isLoading}
            sx={{
              backgroundColor: input.trim() && !isLoading ? "#a855f7" : "rgba(168, 85, 247, 0.3)",
              color: "#fff",
              "&:hover": {
                backgroundColor: input.trim() && !isLoading ? "#9333ea" : "rgba(168, 85, 247, 0.3)",
              },
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.3)",
              },
              borderRadius: "10px",
              padding: "8px",
            }}
          >
            <SendIcon fontSize="small" />
          </IconButton>
        </div>

        <p className="mt-2 text-center text-xs text-gray-500">
          {agent?.name || "El agente"} puede cometer errores. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}

