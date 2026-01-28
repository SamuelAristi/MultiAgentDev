"use client";

import { useState, useRef, useEffect } from "react";
import {
  Agent,
  getAgentById,
  getKnowledgeBase,
  getWelcomeMessages,
  generateMockResponse,
} from "@/data/mock";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface AgentChatDrawerProps {
  agentId: string | null;
  storeId: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AgentChatDrawer Component
 * Panel lateral de chat con el agente de IA
 */
export function AgentChatDrawer({
  agentId,
  storeId,
  isOpen,
  onClose,
}: AgentChatDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const agent = agentId ? getAgentById(agentId) : null;
  const knowledge = getKnowledgeBase(storeId);

  // Initialize with welcome message when agent changes
  useEffect(() => {
    if (agentId && storeId) {
      const welcomeMessages = getWelcomeMessages(storeId);
      const randomWelcome =
        welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: randomWelcome,
          timestamp: new Date(),
        },
      ]);
    }
  }, [agentId, storeId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate API delay and generate response
    await new Promise((resolve) => setTimeout(resolve, 1000 + Math.random() * 1000));

    const response = generateMockResponse(storeId, input.trim());
    const assistantMessage: Message = {
      id: `assistant-${Date.now()}`,
      role: "assistant",
      content: response,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 z-50 h-full w-full max-w-lg transform transition-transform duration-300 ease-out">
        <div className="flex h-full flex-col bg-dark-800 border-l border-white/10 shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-pink-500">
                <SparklesIcon className="h-5 w-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">
                  {agent?.name || "Agente"}
                </h3>
                <div className="flex items-center gap-1.5">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  <span className="text-xs text-gray-400">En línea</span>
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>

          {/* Knowledge context badge */}
          {knowledge && (
            <div className="border-b border-white/5 px-6 py-3">
              <div className="flex items-center gap-2 rounded-lg bg-purple-500/10 px-3 py-2">
                <BookIcon className="h-4 w-4 text-purple-400" />
                <span className="text-xs text-purple-300">
                  Contexto: {knowledge.summary.slice(0, 50)}...
                </span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={
                    message.role === "user"
                      ? "chat-message-user"
                      : "chat-message-assistant"
                  }
                >
                  <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  <span className="mt-1 block text-xs opacity-50">
                    {message.timestamp.toLocaleTimeString("es-ES", {
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
                <div className="chat-message-assistant">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.3s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400 [animation-delay:-0.15s]" />
                      <span className="h-2 w-2 animate-bounce rounded-full bg-purple-400" />
                    </div>
                    <span className="text-xs text-gray-400">Pensando...</span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-white/10 p-4">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="input-dark flex-1 rounded-xl px-4 py-3 text-sm"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="btn-gradient flex h-12 w-12 items-center justify-center rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SendIcon className="h-5 w-5 text-white" />
              </button>
            </form>
            <p className="mt-2 text-center text-xs text-gray-500">
              Respuestas generadas por IA • Simulación local
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// Icons
// ============================================================================

function SparklesIcon({ className }: { className?: string }) {
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

function CloseIcon({ className }: { className?: string }) {
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
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

function BookIcon({ className }: { className?: string }) {
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
        d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
      />
    </svg>
  );
}

function SendIcon({ className }: { className?: string }) {
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
        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
      />
    </svg>
  );
}
