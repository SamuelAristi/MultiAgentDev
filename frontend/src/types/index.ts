// Type definitions for the application

// ============================================================================
// Database Types
// ============================================================================

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Profile {
  id: string;
  organization_id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: "admin" | "user";
}

export interface Thread {
  id: string;
  organization_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Artifact {
  id: string;
  organization_id: string;
  thread_id: string;
  type: "tiktok_script" | "amazon_listing" | "blog_post" | "html";
  content: Record<string, unknown>;
  version: number;
  created_at: string;
}

// ============================================================================
// Chat Types
// ============================================================================

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isLoading?: boolean;
}

export interface ChatRequest {
  message: string;
  session_id?: string;
  organization_id?: string;
}

export interface ChatResponse {
  response: string;
  session_id: string | null;
  agent_used: string;
}

// ============================================================================
// UI State Types
// ============================================================================

export interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  sessionId: string | null;
}
