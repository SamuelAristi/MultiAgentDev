import type { ChatRequest, ChatResponse } from "@/types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchApi<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      errorData.detail || `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

export const api = {
  // Health check
  health: () => fetchApi<{ status: string }>("/health"),

  // Chat endpoint
  chat: (request: ChatRequest) =>
    fetchApi<ChatResponse>("/api/v1/chat/", {
      method: "POST",
      body: JSON.stringify(request),
    }),
};
