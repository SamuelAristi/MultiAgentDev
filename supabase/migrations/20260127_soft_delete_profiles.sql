-- ============================================================================
-- Migration: 20260127_soft_delete_profiles.sql
-- Description: Add soft delete to profiles and update RLS policies
-- ============================================================================

-- ============================================================================
-- 1. ADD DELETED_AT COLUMN
-- ============================================================================

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- Index for efficient filtering of non-deleted users
CREATE INDEX IF NOT EXISTS profiles_deleted_at_idx ON profiles(deleted_at);

-- ============================================================================
-- 2. DROP EXISTING RLS POLICIES FOR PROFILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can view org profiles" ON profiles;

-- ============================================================================
-- 3. CREATE NEW RLS POLICIES WITH SOFT DELETE CHECK
-- ============================================================================

-- Users can view their own profile (only if not soft-deleted)
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (
        auth.uid() = id
        AND deleted_at IS NULL
    );

-- Users can update their own profile (only if not soft-deleted)
CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (
        auth.uid() = id
        AND deleted_at IS NULL
    )
    WITH CHECK (
        auth.uid() = id
        AND deleted_at IS NULL
    );

-- Admins can view all profiles in their organization (including soft-deleted for management)
CREATE POLICY "Admins can view org profiles"
    ON profiles FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.organization_id = profiles.organization_id
            AND p.deleted_at IS NULL  -- Admin must be active
        )
    );

-- Admins can update profiles in their organization
CREATE POLICY "Admins can update org profiles"
    ON profiles FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.organization_id = profiles.organization_id
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid()
            AND p.role = 'admin'
            AND p.organization_id = profiles.organization_id
            AND p.deleted_at IS NULL
        )
    );

-- ============================================================================
-- 4. UPDATE OTHER RLS POLICIES TO CHECK PROFILE SOFT DELETE
-- ============================================================================

-- Knowledge Base: Only active users can read
DROP POLICY IF EXISTS "Users can read knowledge_base" ON knowledge_base;
DROP POLICY IF EXISTS "Admins can manage knowledge_base" ON knowledge_base;

CREATE POLICY "Active users can read knowledge_base"
    ON knowledge_base FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = knowledge_base.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

CREATE POLICY "Active admins can manage knowledge_base"
    ON knowledge_base FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = knowledge_base.organization_id
            AND profiles.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = knowledge_base.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

-- Stores: Only active users can view
DROP POLICY IF EXISTS "Users can view org stores" ON stores;
DROP POLICY IF EXISTS "Admins can manage stores" ON stores;

CREATE POLICY "Active users can view org stores"
    ON stores FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = stores.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

CREATE POLICY "Active admins can manage stores"
    ON stores FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = stores.organization_id
            AND profiles.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = stores.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

-- Agents: Only active users can view
DROP POLICY IF EXISTS "Users can view org agents" ON agents;
DROP POLICY IF EXISTS "Admins can manage agents" ON agents;

CREATE POLICY "Active users can view org agents"
    ON agents FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = agents.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

CREATE POLICY "Active admins can manage agents"
    ON agents FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = agents.organization_id
            AND profiles.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
            AND profiles.organization_id = agents.organization_id
            AND profiles.deleted_at IS NULL
        )
    );

-- Chat Sessions: Only active users can manage
DROP POLICY IF EXISTS "Users can manage own sessions" ON chat_sessions;

CREATE POLICY "Active users can manage own sessions"
    ON chat_sessions FOR ALL
    USING (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.deleted_at IS NULL
        )
    )
    WITH CHECK (
        user_id = auth.uid()
        AND EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.deleted_at IS NULL
        )
    );

-- Chat Messages: Only active users can manage
DROP POLICY IF EXISTS "Users can manage own messages" ON chat_messages;

CREATE POLICY "Active users can manage own messages"
    ON chat_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            JOIN profiles p ON p.id = cs.user_id
            WHERE cs.id = chat_messages.session_id
            AND cs.user_id = auth.uid()
            AND p.deleted_at IS NULL
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions cs
            JOIN profiles p ON p.id = cs.user_id
            WHERE cs.id = chat_messages.session_id
            AND cs.user_id = auth.uid()
            AND p.deleted_at IS NULL
        )
    );

-- Organizations: Only active users can view
DROP POLICY IF EXISTS "Users can view own organization" ON organizations;

CREATE POLICY "Active users can view own organization"
    ON organizations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.organization_id = organizations.id
            AND profiles.deleted_at IS NULL
        )
    );

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to check if user is active (not soft-deleted)
CREATE OR REPLACE FUNCTION public.is_user_active(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = user_id AND deleted_at IS NULL
    );
END;
$$;

-- Function to soft delete a user
CREATE OR REPLACE FUNCTION public.soft_delete_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET deleted_at = NOW()
    WHERE id = target_user_id
    AND deleted_at IS NULL;

    RETURN FOUND;
END;
$$;

-- Function to restore a soft-deleted user
CREATE OR REPLACE FUNCTION public.restore_user(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE profiles
    SET deleted_at = NULL
    WHERE id = target_user_id
    AND deleted_at IS NOT NULL;

    RETURN FOUND;
END;
$$;

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Soft delete migration complete!' as status;
