-- ============================================================================
-- Migration: 20260126_add_stores_and_agents.sql
-- Description: Add stores, agents tables and update chat structure
-- ============================================================================

-- ============================================================================
-- 1. STORES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#a855f7',
    logo_url TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- ============================================================================
-- 2. AGENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🤖',
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- ============================================================================
-- 3. STORE KNOWLEDGE BASE (Extends knowledge_base with store context)
-- ============================================================================

-- Add store_id to knowledge_base for store-specific knowledge
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE CASCADE;

-- Add agent_id to knowledge_base for agent-specific knowledge
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE CASCADE;

-- Add document_type for categorization
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'general';

-- ============================================================================
-- 4. UPDATE CHAT_SESSIONS
-- ============================================================================

-- Add store_id to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS store_id UUID REFERENCES stores(id) ON DELETE SET NULL;

-- Add agent_id to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS agent_id UUID REFERENCES agents(id) ON DELETE SET NULL;

-- Add status column to chat_sessions
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted'));

-- ============================================================================
-- 5. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS stores_org_idx ON stores(organization_id);
CREATE INDEX IF NOT EXISTS stores_active_idx ON stores(is_active);
CREATE INDEX IF NOT EXISTS agents_org_idx ON agents(organization_id);
CREATE INDEX IF NOT EXISTS agents_active_idx ON agents(is_active);
CREATE INDEX IF NOT EXISTS knowledge_base_store_idx ON knowledge_base(store_id);
CREATE INDEX IF NOT EXISTS knowledge_base_agent_idx ON knowledge_base(agent_id);
CREATE INDEX IF NOT EXISTS chat_sessions_store_idx ON chat_sessions(store_id);
CREATE INDEX IF NOT EXISTS chat_sessions_agent_idx ON chat_sessions(agent_id);

-- ============================================================================
-- 6. RLS POLICIES FOR STORES
-- ============================================================================

ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- Users can view stores in their organization
CREATE POLICY "Users can view org stores"
    ON stores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = stores.organization_id
        )
    );

-- Admins can manage stores
CREATE POLICY "Admins can manage stores"
    ON stores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = stores.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = stores.organization_id
        )
    );

-- ============================================================================
-- 7. RLS POLICIES FOR AGENTS
-- ============================================================================

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Users can view agents in their organization
CREATE POLICY "Users can view org agents"
    ON agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = agents.organization_id
        )
    );

-- Admins can manage agents
CREATE POLICY "Admins can manage agents"
    ON agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = agents.organization_id
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = agents.organization_id
        )
    );

-- ============================================================================
-- 8. TRIGGERS
-- ============================================================================

CREATE TRIGGER update_stores_updated_at
    BEFORE UPDATE ON stores
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agents_updated_at
    BEFORE UPDATE ON agents
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to search knowledge base by store
CREATE OR REPLACE FUNCTION public.search_store_knowledge(
    query_embedding vector(1536),
    p_store_id UUID,
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5
)
RETURNS TABLE (
    id UUID,
    content TEXT,
    metadata JSONB,
    document_type TEXT,
    similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb.id,
        kb.content,
        kb.metadata,
        kb.document_type,
        1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.store_id = p_store_id
        AND kb.embedding IS NOT NULL
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- 10. SEED DATA
-- ============================================================================

-- This will be inserted via the application or manually
-- Example seed data (run after creating an organization):

/*
-- Get your organization ID first, then run:

INSERT INTO stores (organization_id, name, slug, description, color) VALUES
    ('YOUR_ORG_ID', 'Snatched', 'snatched', 'Fajas y shapewear premium', '#a855f7'),
    ('YOUR_ORG_ID', 'Sonryse', 'sonryse', 'Fajas post-quirúrgicas colombianas', '#ec4899'),
    ('YOUR_ORG_ID', 'Salomé', 'salome', 'Fajas de alta compresión', '#8b5cf6');

INSERT INTO agents (organization_id, name, slug, role, description, icon, is_active) VALUES
    ('YOUR_ORG_ID', 'Agent Copy', 'agent-copy', 'Copywriting', 'Genera copies y variantes para anuncios y tiendas', '✍️', true),
    ('YOUR_ORG_ID', 'Agent ADS', 'agent-ads', 'Advertising', 'Crea y optimiza campañas publicitarias', '📢', false),
    ('YOUR_ORG_ID', 'Agent Apelaciones', 'agent-apelaciones', 'Appeals', 'Redacta apelaciones para e-commerce', '⚖️', false);
*/
