-- ============================================================================
-- Migration: 20260127_fix_rls_recursion.sql
-- Description: Fix infinite recursion in RLS policies for profiles table
-- ============================================================================

-- ============================================================================
-- 1. CREATE SECURITY DEFINER FUNCTIONS (bypass RLS)
-- ============================================================================

-- Function to get user role without RLS check (prevents recursion)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id UUID)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT role::text FROM profiles WHERE id = user_id AND deleted_at IS NULL;
$$;

-- Function to get user organization without RLS check
CREATE OR REPLACE FUNCTION public.get_user_organization(user_id UUID)
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT organization_id FROM profiles WHERE id = user_id AND deleted_at IS NULL;
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id
        AND role = 'admin'
        AND deleted_at IS NULL
    );
$$;

-- ============================================================================
-- 2. DROP ALL PROBLEMATIC POLICIES
-- ============================================================================

-- Profiles policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view org profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can update org profiles" ON profiles;

-- Other tables that reference profiles
DROP POLICY IF EXISTS "Active users can read knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Active admins can manage knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Active users can view org stores" ON stores;
DROP POLICY IF EXISTS "Active admins can manage stores" ON stores;
DROP POLICY IF EXISTS "Active users can view org agents" ON agents;
DROP POLICY IF EXISTS "Active admins can manage agents" ON agents;
DROP POLICY IF EXISTS "Active users can manage own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Active users can manage own messages" ON chat_messages;
DROP POLICY IF EXISTS "Active users can view own organization" ON organizations;

-- Also drop original policies if they exist
DROP POLICY IF EXISTS "Users can read knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Admins can manage knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Users can view org stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;
DROP POLICY IF EXISTS "Users can view org agents" ON agents;
DROP POLICY IF EXISTS "Admins can manage agents" ON agents;
DROP POLICY IF EXISTS "Users can manage own sessions" ON chat_sessions;
DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

-- ============================================================================
-- 3. CREATE NEW POLICIES FOR PROFILES (no self-reference)
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "profiles_select_own"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 4. CREATE POLICIES FOR OTHER TABLES (using helper functions)
-- ============================================================================

-- Organizations: users can view their org
CREATE POLICY "organizations_select"
    ON organizations FOR SELECT
    USING (id = public.get_user_organization(auth.uid()));

-- Stores: users can view stores in their org
CREATE POLICY "stores_select"
    ON stores FOR SELECT
    USING (organization_id = public.get_user_organization(auth.uid()));

-- Stores: admins can manage stores in their org
CREATE POLICY "stores_all_admin"
    ON stores FOR ALL
    USING (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    )
    WITH CHECK (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    );

-- Agents: users can view agents in their org
CREATE POLICY "agents_select"
    ON agents FOR SELECT
    USING (organization_id = public.get_user_organization(auth.uid()));

-- Agents: admins can manage agents in their org
CREATE POLICY "agents_all_admin"
    ON agents FOR ALL
    USING (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    )
    WITH CHECK (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    );

-- Knowledge Base: users can read
CREATE POLICY "knowledge_base_select"
    ON knowledge_base FOR SELECT
    USING (organization_id = public.get_user_organization(auth.uid()));

-- Knowledge Base: admins can manage
CREATE POLICY "knowledge_base_all_admin"
    ON knowledge_base FOR ALL
    USING (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    )
    WITH CHECK (
        organization_id = public.get_user_organization(auth.uid())
        AND public.is_admin(auth.uid())
    );

-- Chat Sessions: users can manage their own
CREATE POLICY "chat_sessions_own"
    ON chat_sessions FOR ALL
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Chat Messages: users can manage messages in their sessions
CREATE POLICY "chat_messages_own"
    ON chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions
            WHERE chat_sessions.id = chat_messages.session_id
            AND chat_sessions.user_id = auth.uid()
        )
    );

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'RLS recursion fix complete!' as status;
