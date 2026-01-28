export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          organization_id: string | null;
          email: string | null;
          full_name: string | null;
          avatar_url: string | null;
          role: "admin" | "user";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          organization_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "user";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          email?: string | null;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: "admin" | "user";
          created_at?: string;
          updated_at?: string;
        };
      };
      stores: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          description: string | null;
          color: string;
          logo_url: string | null;
          is_active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          description?: string | null;
          color?: string;
          logo_url?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          color?: string;
          logo_url?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          slug: string;
          role: string;
          description: string | null;
          icon: string;
          system_prompt: string | null;
          is_active: boolean;
          settings: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          slug: string;
          role: string;
          description?: string | null;
          icon?: string;
          system_prompt?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          slug?: string;
          role?: string;
          description?: string | null;
          icon?: string;
          system_prompt?: string | null;
          is_active?: boolean;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      knowledge_base: {
        Row: {
          id: string;
          organization_id: string;
          store_id: string | null;
          agent_id: string | null;
          content: string;
          embedding: number[] | null;
          metadata: Json;
          source_url: string | null;
          document_type: string;
          chunk_index: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          store_id?: string | null;
          agent_id?: string | null;
          content: string;
          embedding?: number[] | null;
          metadata?: Json;
          source_url?: string | null;
          document_type?: string;
          chunk_index?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          store_id?: string | null;
          agent_id?: string | null;
          content?: string;
          embedding?: number[] | null;
          metadata?: Json;
          source_url?: string | null;
          document_type?: string;
          chunk_index?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_sessions: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          store_id: string | null;
          agent_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          store_id?: string | null;
          agent_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          store_id?: string | null;
          agent_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      chat_messages: {
        Row: {
          id: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          role: "user" | "assistant" | "system";
          content: string;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          role?: "user" | "assistant" | "system";
          content?: string;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Functions: {
      search_knowledge_base: {
        Args: {
          query_embedding: number[];
          org_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          similarity: number;
        }[];
      };
      search_store_knowledge: {
        Args: {
          query_embedding: number[];
          p_store_id: string;
          match_threshold?: number;
          match_count?: number;
        };
        Returns: {
          id: string;
          content: string;
          metadata: Json;
          document_type: string;
          similarity: number;
        }[];
      };
    };
  };
};

// Utility types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience types
export type Profile = Tables<"profiles">;
export type Organization = Tables<"organizations">;
export type Store = Tables<"stores">;
export type Agent = Tables<"agents">;
export type KnowledgeBase = Tables<"knowledge_base">;
export type ChatSession = Tables<"chat_sessions">;
export type ChatMessage = Tables<"chat_messages">;
