/**
 * API Client for backend communication
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ChatRequest {
  message: string;
  session_id?: string;
  organization_id?: string;
}

export interface ChatResponse {
  response: string;
  session_id?: string;
  agent_used: string;
}

export interface Thread {
  id: string;
  user_id: string;
  organization_id: string;
  store_id?: string;
  agent_id?: string;
  title?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  token_count?: number;
  metadata?: Record<string, unknown>;
}

export interface ThreadWithMessages extends Thread {
  messages: Message[];
}

export interface SendMessageRequest {
  message: string;
}

export interface SendMessageResponse {
  user_message: Message;
  assistant_message: Message;
  thread_id: string;
}

export interface Store {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  description?: string;
  color: string;
  logo_url?: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface AgentCapabilities {
  rag_enabled: boolean;
  web_search: boolean;
  code_execution: boolean;
  image_generation: boolean;
}

export interface Agent {
  id: string;
  organization_id: string;
  name: string;
  slug: string;
  role: string;
  description?: string;
  icon: string;
  system_prompt?: string;
  is_active: boolean;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  // Configuration fields
  ai_model: string;
  temperature: number;
  max_tokens: number;
  welcome_message?: string;
  capabilities: AgentCapabilities;
  category: string;
  version?: number;
  modified_by?: string;
}

export interface AgentUpdate {
  name?: string;
  role?: string;
  description?: string;
  icon?: string;
  system_prompt?: string;
  is_active?: boolean;
  ai_model?: string;
  temperature?: number;
  max_tokens?: number;
  welcome_message?: string;
  capabilities?: Partial<AgentCapabilities>;
  category?: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  description?: string;
  max_tokens: number;
  supports_vision: boolean;
  supports_functions: boolean;
  is_available: boolean;
}

export interface AgentConfigHistoryItem {
  id: string;
  agent_id: string;
  changed_by: string;
  changed_at: string;
  changes: Record<string, { old: unknown; new: unknown }>;
  previous_config: Record<string, unknown>;
  change_reason?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
      });
    } catch (networkError) {
      // Network error (server not running, CORS, etc.)
      const message = networkError instanceof Error
        ? networkError.message
        : "Network error - check if backend is running";
      throw new Error(`Connection failed: ${message}`);
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }));
      // Handle different error formats - ensure we always get a string
      let errorMessage: string;
      if (typeof errorData === "string") {
        errorMessage = errorData;
      } else if (typeof errorData?.detail === "string") {
        errorMessage = errorData.detail;
      } else if (typeof errorData?.detail === "object" && errorData.detail !== null) {
        // FastAPI sometimes returns detail as an array of validation errors
        errorMessage = JSON.stringify(errorData.detail);
      } else if (typeof errorData?.message === "string") {
        errorMessage = errorData.message;
      } else if (typeof errorData?.error === "string") {
        errorMessage = errorData.error;
      } else {
        errorMessage = `HTTP ${response.status}: ${JSON.stringify(errorData)}`;
      }
      console.error("API Error:", response.status, errorData);
      throw new Error(errorMessage);
    }

    return response.json();
  }

  // Chat endpoints
  async sendChatMessage(request: ChatRequest): Promise<ChatResponse> {
    return this.request<ChatResponse>("/api/v1/chat/", {
      method: "POST",
      body: JSON.stringify(request),
    });
  }

  // Stores endpoints
  async getStores(organizationId: string): Promise<{ stores: Store[]; total: number }> {
    return this.request(`/api/v1/stores/?organization_id=${organizationId}`);
  }

  async getStoreBySlug(
    slug: string,
    organizationId: string
  ): Promise<Store> {
    return this.request(
      `/api/v1/stores/slug/${slug}?organization_id=${organizationId}`
    );
  }

  // Agents endpoints
  async getAgents(organizationId: string, activeOnly = false): Promise<{ agents: Agent[]; total: number }> {
    const params = new URLSearchParams({ organization_id: organizationId });
    if (activeOnly) params.append("active_only", "true");
    return this.request(`/api/v1/agents/?${params.toString()}`);
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request(`/api/v1/agents/${agentId}`);
  }

  async getAgentBySlug(
    slug: string,
    organizationId: string
  ): Promise<Agent> {
    return this.request(
      `/api/v1/agents/slug/${slug}?organization_id=${organizationId}`
    );
  }

  async updateAgent(
    agentId: string,
    update: AgentUpdate,
    modifiedBy: string
  ): Promise<Agent> {
    return this.request(`/api/v1/agents/${agentId}?modified_by=${modifiedBy}`, {
      method: "PATCH",
      body: JSON.stringify(update),
    });
  }

  async getAgentHistory(
    agentId: string,
    limit = 20
  ): Promise<{ history: AgentConfigHistoryItem[]; total: number }> {
    return this.request(`/api/v1/agents/${agentId}/history?limit=${limit}`);
  }

  async getAvailableModels(): Promise<{ models: AIModel[]; total: number }> {
    return this.request("/api/v1/agents/models/available");
  }

  async duplicateAgent(
    agentId: string,
    newName: string,
    newSlug: string
  ): Promise<Agent> {
    const params = new URLSearchParams({ new_name: newName, new_slug: newSlug });
    return this.request(`/api/v1/agents/${agentId}/duplicate?${params.toString()}`, {
      method: "POST",
    });
  }

  // Thread endpoints
  async getThreads(
    organizationId: string,
    options?: {
      userId?: string;
      storeId?: string;
      agentId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ threads: Thread[]; total: number }> {
    const params = new URLSearchParams({ organization_id: organizationId });

    if (options?.userId) params.append("user_id", options.userId);
    if (options?.storeId) params.append("store_id", options.storeId);
    if (options?.agentId) params.append("agent_id", options.agentId);
    if (options?.limit) params.append("limit", options.limit.toString());
    if (options?.offset) params.append("offset", options.offset.toString());

    return this.request(`/api/v1/threads/?${params.toString()}`);
  }

  async getThread(threadId: string): Promise<ThreadWithMessages> {
    return this.request(`/api/v1/threads/${threadId}`);
  }

  async createThread(
    organizationId: string,
    userId: string,
    data: {
      title?: string;
      store_id?: string;
      agent_id?: string;
    }
  ): Promise<Thread> {
    const params = new URLSearchParams({
      organization_id: organizationId,
      user_id: userId,
    });

    return this.request(`/api/v1/threads/?${params.toString()}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async sendThreadMessage(
    threadId: string,
    message: string
  ): Promise<SendMessageResponse> {
    return this.request(`/api/v1/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ message }),
    });
  }

  async deleteThread(threadId: string): Promise<void> {
    await this.request(`/api/v1/threads/${threadId}`, {
      method: "DELETE",
    });
  }

  // Knowledge base endpoints
  async searchKnowledge(
    organizationId: string,
    query: string,
    storeId?: string
  ): Promise<{
    results: Array<{
      id: string;
      content: string;
      metadata: Record<string, unknown>;
      document_type: string;
      similarity: number;
    }>;
    query: string;
  }> {
    return this.request(`/api/v1/knowledge/search?organization_id=${organizationId}`, {
      method: "POST",
      body: JSON.stringify({
        query,
        store_id: storeId,
        match_count: 5,
      }),
    });
  }

  // Health check
  async healthCheck(): Promise<{ status: string }> {
    return this.request("/health");
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Export class for custom instances
export { ApiClient };
