-- ============================================================================
-- CONSOLIDATED FIX: Drop ALL policies and recreate correctly
-- Run this ONCE to fix everything
-- ============================================================================

-- ============================================================================
-- 1. ADD DELETED_AT IF NOT EXISTS
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx ON profiles(deleted_at);

-- ============================================================================
-- 2. DROP ALL EXISTING POLICIES (comprehensive list)
-- ============================================================================

-- Profiles
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;

-- Organizations
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;
DROP POLICY IF EXISTS "Active users can view own organization" ON organizations;
DROP POLICY IF EXISTS "organizations_select" ON organizations;

-- Stores (old and new names)
DROP POLICY IF EXISTS "Users can view org stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
DROP POLICY IF EXISTS "Active users can view org stores" ON stores;
DROP POLICY IF EXISTS "Active admins can manage stores" ON stores;
DROP POLICY IF EXISTS "stores_select" ON stores;
DROP POLICY IF EXISTS "stores_all_admin" ON stores;
DROP POLICY IF EXISTS "stores_insert_admin" ON stores;
DROP POLICY IF EXISTS "stores_update_admin" ON stores;
DROP POLICY IF EXISTS "stores_delete_admin" ON stores;

-- Agents (old and new names)
DROP POLICY IF EXISTS "Users can view org agents" ON agents;
DROP POLICY IF EXISTS "Admins can manage agents" ON agents;
DROP POLICY IF EXISTS "Active users can view org agents" ON agents;
DROP POLICY IF EXISTS "Active admins can manage agents" ON agents;
DROP POLICY IF EXISTS "agents_select" ON agents;
DROP POLICY IF EXISTS "agents_all_admin" ON agents;
DROP POLICY IF EXISTS "agents_insert_admin" ON agents;
DROP POLICY IF EXISTS "agents_update_admin" ON agents;
DROP POLICY IF EXISTS "agents_delete_admin" ON agents;

-- Knowledge Base (old and new names)
DROP POLICY IF EXISTS "Users can read knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Admins can manage knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Active users can read knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Active admins can manage knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_select" ON knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_all_admin" ON knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_insert_admin" ON knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_update_admin" ON knowledge_base;
DROP POLICY IF EXISTS "knowledge_base_delete_admin" ON knowledge_base;

-- Chat Sessions (old and new names)
DROP POLICY IF EXISTS "Users can manage own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Active users can manage own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_own" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_select" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_insert" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_update" ON chat_sessions;
DROP POLICY IF EXISTS "chat_sessions_delete" ON chat_sessions;

-- Chat Messages (old and new names)
DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;
DROP POLICY IF EXISTS "Active users can manage own messages" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_own" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_select" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_insert" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_update" ON chat_messages;
DROP POLICY IF EXISTS "chat_messages_delete" ON chat_messages;

-- Agent Config History (old and new names)
DROP POLICY IF EXISTS "Users can view agent history" ON agent_config_history;
DROP POLICY IF EXISTS "agent_config_history_select" ON agent_config_history;

-- ============================================================================
-- 3. CREATE SECURITY DEFINER HELPER FUNCTIONS
-- ============================================================================

-- Get user's organization (bypasses RLS to prevent recursion)
CREATE OR REPLACE FUNCTION public.get_my_org()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id FROM profiles WHERE id = auth.uid();
$$;

-- Check if current user is admin (bypasses RLS)
CREATE OR REPLACE FUNCTION public.am_i_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND role = 'admin'
        AND deleted_at IS NULL
    );
$$;

-- Check if current user is active (not deleted)
CREATE OR REPLACE FUNCTION public.am_i_active()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid()
        AND deleted_at IS NULL
    );
$$;

-- ============================================================================
-- 4. CREATE NEW POLICIES (using helper functions, no recursion)
-- ============================================================================

-- PROFILES: Simple self-access only
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ORGANIZATIONS: Can view own org
CREATE POLICY "organizations_select"
    ON organizations FOR SELECT
    USING (id = public.get_my_org());

-- STORES: Users can view, admins can manage
CREATE POLICY "stores_select"
    ON stores FOR SELECT
    USING (organization_id = public.get_my_org());

CREATE POLICY "stores_insert_admin"
    ON stores FOR INSERT
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "stores_update_admin"
    ON stores FOR UPDATE
    USING (organization_id = public.get_my_org() AND public.am_i_admin())
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "stores_delete_admin"
    ON stores FOR DELETE
    USING (organization_id = public.get_my_org() AND public.am_i_admin());

-- AGENTS: Users can view, admins can manage
CREATE POLICY "agents_select"
    ON agents FOR SELECT
    USING (organization_id = public.get_my_org());

CREATE POLICY "agents_insert_admin"
    ON agents FOR INSERT
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "agents_update_admin"
    ON agents FOR UPDATE
    USING (organization_id = public.get_my_org() AND public.am_i_admin())
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "agents_delete_admin"
    ON agents FOR DELETE
    USING (organization_id = public.get_my_org() AND public.am_i_admin());

-- KNOWLEDGE BASE: Users can read, admins can manage
CREATE POLICY "knowledge_base_select"
    ON knowledge_base FOR SELECT
    USING (organization_id = public.get_my_org());

CREATE POLICY "knowledge_base_insert_admin"
    ON knowledge_base FOR INSERT
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "knowledge_base_update_admin"
    ON knowledge_base FOR UPDATE
    USING (organization_id = public.get_my_org() AND public.am_i_admin())
    WITH CHECK (organization_id = public.get_my_org() AND public.am_i_admin());

CREATE POLICY "knowledge_base_delete_admin"
    ON knowledge_base FOR DELETE
    USING (organization_id = public.get_my_org() AND public.am_i_admin());

-- CHAT SESSIONS: Users manage their own
CREATE POLICY "chat_sessions_select"
    ON chat_sessions FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "chat_sessions_insert"
    ON chat_sessions FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sessions_update"
    ON chat_sessions FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "chat_sessions_delete"
    ON chat_sessions FOR DELETE
    USING (user_id = auth.uid());

-- CHAT MESSAGES: Users manage messages in their sessions
CREATE POLICY "chat_messages_select"
    ON chat_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "chat_messages_insert"
    ON chat_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "chat_messages_update"
    ON chat_messages FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "chat_messages_delete"
    ON chat_messages FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- AGENT CONFIG HISTORY: Users in org can view
CREATE POLICY "agent_config_history_select"
    ON agent_config_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = agent_config_history.agent_id
            AND agents.organization_id = public.get_my_org()
        )
    );

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'All RLS policies fixed!' as status;
