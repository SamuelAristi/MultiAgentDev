-- =============================================
-- Sub-Agents Migration
-- Implements hierarchical agent structure (Orchestrator -> Sub-agents)
-- =============================================

-- 1. Create sub_agents table
CREATE TABLE IF NOT EXISTS sub_agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Parent relationship (which orchestrator owns this sub-agent)
    parent_agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

    -- Basic info
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🔧',

    -- AI Configuration (full config like parent agents)
    ai_model TEXT DEFAULT 'gpt-4o-mini',
    temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0 AND max_tokens <= 128000),
    system_prompt TEXT,

    -- Capabilities
    capabilities JSONB DEFAULT '{
        "rag_enabled": true,
        "web_search": false,
        "code_execution": false,
        "image_generation": false
    }'::jsonb,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES profiles(id),
    modified_by UUID REFERENCES profiles(id),

    -- Ensure unique slug per parent agent
    UNIQUE(parent_agent_id, slug)
);

-- 2. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sub_agents_parent ON sub_agents(parent_agent_id);
CREATE INDEX IF NOT EXISTS idx_sub_agents_org ON sub_agents(organization_id);
CREATE INDEX IF NOT EXISTS idx_sub_agents_active ON sub_agents(is_active) WHERE is_active = true;

-- 3. Create updated_at trigger
CREATE OR REPLACE FUNCTION update_sub_agents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sub_agents_updated_at ON sub_agents;
CREATE TRIGGER sub_agents_updated_at
    BEFORE UPDATE ON sub_agents
    FOR EACH ROW
    EXECUTE FUNCTION update_sub_agents_updated_at();

-- 4. Create sub_agent_knowledge table for sub-agent specific knowledge
-- This links to the existing knowledge_base table via sub_agent_id
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS sub_agent_id UUID REFERENCES sub_agents(id) ON DELETE CASCADE;

-- Create index for sub_agent knowledge queries
CREATE INDEX IF NOT EXISTS idx_knowledge_sub_agent ON knowledge_base(sub_agent_id) WHERE sub_agent_id IS NOT NULL;

-- 5. RLS Policies for sub_agents

-- Enable RLS
ALTER TABLE sub_agents ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS sub_agents_select_org ON sub_agents;
DROP POLICY IF EXISTS sub_agents_insert_admin ON sub_agents;
DROP POLICY IF EXISTS sub_agents_update_admin ON sub_agents;
DROP POLICY IF EXISTS sub_agents_delete_admin ON sub_agents;

-- Helper function to check admin role (avoid recursion)
CREATE OR REPLACE FUNCTION is_org_admin(org_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM profiles
    WHERE id = auth.uid()
    AND organization_id = org_id;

    RETURN user_role = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- SELECT: Any authenticated user in the org can see sub_agents
CREATE POLICY sub_agents_select_org ON sub_agents
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- INSERT: Only admins can create sub_agents
CREATE POLICY sub_agents_insert_admin ON sub_agents
    FOR INSERT
    TO authenticated
    WITH CHECK (
        is_org_admin(organization_id)
    );

-- UPDATE: Only admins can update sub_agents
CREATE POLICY sub_agents_update_admin ON sub_agents
    FOR UPDATE
    TO authenticated
    USING (is_org_admin(organization_id))
    WITH CHECK (is_org_admin(organization_id));

-- DELETE: Only admins can delete sub_agents
CREATE POLICY sub_agents_delete_admin ON sub_agents
    FOR DELETE
    TO authenticated
    USING (is_org_admin(organization_id));

-- 6. Grant permissions
GRANT ALL ON sub_agents TO authenticated;
GRANT ALL ON sub_agents TO service_role;

-- 7. Update RLS for knowledge_base to include sub_agent filtering
-- Add policy for sub_agent knowledge access
DROP POLICY IF EXISTS knowledge_base_sub_agent_select ON knowledge_base;
CREATE POLICY knowledge_base_sub_agent_select ON knowledge_base
    FOR SELECT
    TO authenticated
    USING (
        -- Can read if belongs to same org
        organization_id IN (
            SELECT organization_id FROM profiles WHERE id = auth.uid()
        )
    );

-- 8. Create function to search sub-agent knowledge
CREATE OR REPLACE FUNCTION search_sub_agent_knowledge(
    query_embedding vector(1536),
    p_sub_agent_id UUID,
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
SECURITY DEFINER
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
    WHERE kb.sub_agent_id = p_sub_agent_id
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 9. Add is_orchestrator flag to agents table to mark which agents can have sub-agents
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS is_orchestrator BOOLEAN DEFAULT false;

-- Mark the Copy agent as orchestrator (assuming it exists)
UPDATE agents SET is_orchestrator = true WHERE slug = 'agent-copy';

COMMENT ON TABLE sub_agents IS 'Sub-agents that belong to orchestrator agents. Each sub-agent handles a specific task within the orchestrator workflow.';
COMMENT ON COLUMN sub_agents.parent_agent_id IS 'The orchestrator agent that owns this sub-agent';
COMMENT ON COLUMN agents.is_orchestrator IS 'Whether this agent can have sub-agents';
