"use client";

import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMessageType } from "@/types";

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex w-full gap-3 p-4",
        isUser ? "justify-end" : "justify-start"
      )}
    >
      {/* Avatar */}
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
          AI
        </div>
      )}

      {/* Message Content */}
      <div
        className={cn(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        {message.isLoading ? (
          <LoadingDots />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            <FormattedContent content={message.content} />
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground text-sm font-medium">
          U
        </div>
      )}
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex items-center gap-1">
      <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.3s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-current [animation-delay:-0.15s]" />
      <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like formatting for headers and bold
  const lines = content.split("\n");

  return (
    <>
      {lines.map((line, index) => {
        // Headers
        if (line.startsWith("## ")) {
          return (
            <h2 key={index} className="text-lg font-bold mt-3 mb-2">
              {line.replace("## ", "")}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3 key={index} className="text-base font-semibold mt-2 mb-1">
              {line.replace("### ", "")}
            </h3>
          );
        }

        // Blockquotes
        if (line.startsWith("> ")) {
          return (
            <blockquote
              key={index}
              className="border-l-2 border-primary/50 pl-3 italic my-1"
            >
              {line.replace("> ", "")}
            </blockquote>
          );
        }

        // Bold text (simple pattern)
        const formattedLine = line.replace(
          /\*\*(.*?)\*\*/g,
          '<strong class="font-semibold">$1</strong>'
        );

        if (formattedLine !== line) {
          return (
            <p
              key={index}
              className="my-1"
              dangerouslySetInnerHTML={{ __html: formattedLine }}
            />
          );
        }

        // Empty lines
        if (line.trim() === "") {
          return <br key={index} />;
        }

        // Regular text
        return (
          <p key={index} className="my-1">
            {line}
          </p>
        );
      })}
    </>
  );
}
