"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { api } from "@/services/api";
import type { ChatMessage as ChatMessageType } from "@/types";

export function Chat() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (content: string) => {
    setError(null);

    // Add user message
    const userMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      timestamp: new Date(),
    };

    // Add loading message for assistant
    const loadingMessage: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isLoading: true,
    };

    setMessages((prev) => [...prev, userMessage, loadingMessage]);
    setIsLoading(true);

    try {
      const response = await api.chat({ message: content });

      // Replace loading message with actual response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === loadingMessage.id
            ? {
                ...msg,
                content: response.response,
                isLoading: false,
              }
            : msg
        )
      );
    } catch (err) {
      // Remove loading message and show error
      setMessages((prev) => prev.filter((msg) => msg.id !== loadingMessage.id));
      setError(err instanceof Error ? err.message : "Error al enviar mensaje");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b px-4 py-3">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">MultiAgent Chat</h1>
            <p className="text-sm text-muted-foreground">
              Marketing AI Assistant
            </p>
          </div>
          <AgentBadge />
        </div>
      </header>

      {/* Messages Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl">
          {messages.length === 0 ? (
            <WelcomeScreen />
          ) : (
            <>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </>
          )}

          {error && (
            <div className="mx-4 my-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Input Area */}
      <ChatInput
        onSend={handleSend}
        disabled={isLoading}
        placeholder="Ej: Crea un TikTok script sobre marketing digital..."
      />
    </div>
  );
}

function WelcomeScreen() {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground text-2xl font-bold">
        M
      </div>
      <h2 className="mb-2 text-2xl font-bold">MultiAgent Marketing Platform</h2>
      <p className="mb-8 max-w-md text-muted-foreground">
        Tu asistente de IA para crear contenido de marketing. Prueba con alguno
        de estos ejemplos:
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        <ExampleCard
          title="TikTok Script"
          description="Crea un script viral para TikTok sobre ahorro de dinero"
        />
        <ExampleCard
          title="Amazon Listing"
          description="Optimiza mi listing de Amazon para audfonos bluetooth"
        />
        <ExampleCard
          title="Copy de Ventas"
          description="Escribe copy persuasivo para un curso de marketing"
        />
        <ExampleCard
          title="Saludo"
          description="Hola, que puedes hacer?"
        />
      </div>
    </div>
  );
}

function ExampleCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left transition-colors hover:bg-muted/50 cursor-pointer">
      <h3 className="font-medium">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AgentBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-400">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
      </span>
      Online
    </div>
  );
}
