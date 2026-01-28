

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- PART 2: CUSTOM TYPES
-- ============================================================================

CREATE TYPE app_role AS ENUM ('admin', 'user');

-- ============================================================================
-- PART 3: CORE TABLES (without foreign keys first)
-- ============================================================================

-- Organizations
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI Models (no dependencies)
CREATE TABLE ai_models (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    provider TEXT NOT NULL,
    description TEXT,
    max_tokens INTEGER DEFAULT 4096,
    supports_vision BOOLEAN DEFAULT false,
    supports_functions BOOLEAN DEFAULT true,
    cost_per_1k_input DECIMAL(10, 6),
    cost_per_1k_output DECIMAL(10, 6),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Profiles (references auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID,
    email TEXT,
    full_name TEXT,
    avatar_url TEXT,
    role app_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Stores
CREATE TABLE stores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
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

-- Agents
CREATE TABLE agents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    role TEXT NOT NULL,
    description TEXT,
    icon TEXT DEFAULT '🤖',
    system_prompt TEXT,
    is_active BOOLEAN DEFAULT true,
    settings JSONB DEFAULT '{}',
    ai_model TEXT DEFAULT 'gpt-4o-mini',
    temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2),
    max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0 AND max_tokens <= 128000),
    welcome_message TEXT,
    capabilities JSONB DEFAULT '{"rag_enabled": true, "web_search": false, "code_execution": false, "image_generation": false}',
    category TEXT DEFAULT 'general',
    version INTEGER DEFAULT 1,
    modified_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, slug)
);

-- Knowledge Base
CREATE TABLE knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    store_id UUID,
    agent_id UUID,
    content TEXT NOT NULL,
    embedding vector(1536),
    metadata JSONB DEFAULT '{}',
    document_type TEXT DEFAULT 'general',
    source_url TEXT,
    chunk_index INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- System Prompts
CREATE TABLE system_prompts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    prompt_type TEXT NOT NULL,
    content TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(organization_id, name)
);

-- Chat Sessions
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL,
    user_id UUID NOT NULL,
    store_id UUID,
    agent_id UUID,
    title TEXT,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'deleted')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chat Messages
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Agent Config History
CREATE TABLE agent_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changes JSONB NOT NULL,
    previous_config JSONB NOT NULL,
    change_reason TEXT
);

-- ============================================================================
-- PART 4: ADD FOREIGN KEY CONSTRAINTS
-- ============================================================================

ALTER TABLE profiles ADD CONSTRAINT profiles_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;

ALTER TABLE stores ADD CONSTRAINT stores_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE agents ADD CONSTRAINT agents_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE agents ADD CONSTRAINT agents_modified_by_fk
    FOREIGN KEY (modified_by) REFERENCES profiles(id);

ALTER TABLE knowledge_base ADD CONSTRAINT kb_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE knowledge_base ADD CONSTRAINT kb_store_fk
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE;

ALTER TABLE knowledge_base ADD CONSTRAINT kb_agent_fk
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE system_prompts ADD CONSTRAINT sp_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions ADD CONSTRAINT cs_organization_fk
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions ADD CONSTRAINT cs_user_fk
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

ALTER TABLE chat_sessions ADD CONSTRAINT cs_store_fk
    FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE SET NULL;

ALTER TABLE chat_sessions ADD CONSTRAINT cs_agent_fk
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL;

ALTER TABLE chat_messages ADD CONSTRAINT cm_session_fk
    FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE;

ALTER TABLE agent_config_history ADD CONSTRAINT ach_agent_fk
    FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE;

ALTER TABLE agent_config_history ADD CONSTRAINT ach_changed_by_fk
    FOREIGN KEY (changed_by) REFERENCES profiles(id);

-- ============================================================================
-- PART 5: INDEXES
-- ============================================================================

CREATE INDEX profiles_organization_idx ON profiles(organization_id);
CREATE INDEX profiles_role_idx ON profiles(role);
CREATE INDEX stores_org_idx ON stores(organization_id);
CREATE INDEX stores_active_idx ON stores(is_active);
CREATE INDEX agents_org_idx ON agents(organization_id);
CREATE INDEX agents_active_idx ON agents(is_active);
CREATE INDEX knowledge_base_org_idx ON knowledge_base(organization_id);
CREATE INDEX knowledge_base_store_idx ON knowledge_base(store_id);
CREATE INDEX knowledge_base_agent_idx ON knowledge_base(agent_id);
CREATE INDEX chat_sessions_user_idx ON chat_sessions(user_id);
CREATE INDEX chat_sessions_store_idx ON chat_sessions(store_id);
CREATE INDEX chat_sessions_agent_idx ON chat_sessions(agent_id);
CREATE INDEX chat_messages_session_idx ON chat_messages(session_id);
CREATE INDEX agent_config_history_agent_idx ON agent_config_history(agent_id);
CREATE INDEX agent_config_history_date_idx ON agent_config_history(changed_at DESC);

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_config_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can view org profiles" ON profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin' AND p.organization_id = profiles.organization_id));

-- Organizations Policies
CREATE POLICY "Users can view own organization" ON organizations FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = organizations.id));

-- Stores Policies
CREATE POLICY "Users can view org stores" ON stores FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = stores.organization_id));
CREATE POLICY "Admins can manage stores" ON stores FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.organization_id = stores.organization_id));

-- Agents Policies
CREATE POLICY "Users can view org agents" ON agents FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = agents.organization_id));
CREATE POLICY "Admins can manage agents" ON agents FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.organization_id = agents.organization_id));

-- Knowledge Base Policies
CREATE POLICY "Users can read knowledge_base" ON knowledge_base FOR SELECT
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.organization_id = knowledge_base.organization_id));
CREATE POLICY "Admins can manage knowledge_base" ON knowledge_base FOR ALL
    USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin' AND profiles.organization_id = knowledge_base.organization_id));

-- Chat Sessions Policies
CREATE POLICY "Users can manage own sessions" ON chat_sessions FOR ALL USING (user_id = auth.uid());

-- Chat Messages Policies
CREATE POLICY "Users can manage own messages" ON chat_messages FOR ALL
    USING (EXISTS (SELECT 1 FROM chat_sessions WHERE chat_sessions.id = chat_messages.session_id AND chat_sessions.user_id = auth.uid()));

-- AI Models Policies (public read)
CREATE POLICY "Anyone can read AI models" ON ai_models FOR SELECT USING (true);

-- Agent Config History Policies
CREATE POLICY "Users can view agent history" ON agent_config_history FOR SELECT
    USING (EXISTS (SELECT 1 FROM agents a JOIN profiles p ON p.organization_id = a.organization_id WHERE a.id = agent_config_history.agent_id AND p.id = auth.uid()));

-- ============================================================================
-- PART 7: FUNCTIONS
-- ============================================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'user'
    );
    RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_organizations_updated_at BEFORE UPDATE ON organizations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_stores_updated_at BEFORE UPDATE ON stores FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_agents_updated_at BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_knowledge_base_updated_at BEFORE UPDATE ON knowledge_base FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Track agent config changes
CREATE OR REPLACE FUNCTION public.track_agent_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    changes_json JSONB;
    prev_config JSONB;
BEGIN
    prev_config := jsonb_build_object(
        'name', OLD.name,
        'role', OLD.role,
        'description', OLD.description,
        'system_prompt', OLD.system_prompt,
        'ai_model', OLD.ai_model,
        'temperature', OLD.temperature,
        'max_tokens', OLD.max_tokens,
        'welcome_message', OLD.welcome_message,
        'capabilities', OLD.capabilities,
        'is_active', OLD.is_active
    );

    changes_json := '{}'::jsonb;

    IF OLD.name IS DISTINCT FROM NEW.name THEN
        changes_json := changes_json || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.role IS DISTINCT FROM NEW.role THEN
        changes_json := changes_json || jsonb_build_object('role', jsonb_build_object('old', OLD.role, 'new', NEW.role));
    END IF;
    IF OLD.system_prompt IS DISTINCT FROM NEW.system_prompt THEN
        changes_json := changes_json || jsonb_build_object('system_prompt', jsonb_build_object('old', LEFT(OLD.system_prompt, 100), 'new', LEFT(NEW.system_prompt, 100)));
    END IF;
    IF OLD.ai_model IS DISTINCT FROM NEW.ai_model THEN
        changes_json := changes_json || jsonb_build_object('ai_model', jsonb_build_object('old', OLD.ai_model, 'new', NEW.ai_model));
    END IF;
    IF OLD.temperature IS DISTINCT FROM NEW.temperature THEN
        changes_json := changes_json || jsonb_build_object('temperature', jsonb_build_object('old', OLD.temperature, 'new', NEW.temperature));
    END IF;
    IF OLD.is_active IS DISTINCT FROM NEW.is_active THEN
        changes_json := changes_json || jsonb_build_object('is_active', jsonb_build_object('old', OLD.is_active, 'new', NEW.is_active));
    END IF;

    IF changes_json != '{}'::jsonb AND NEW.modified_by IS NOT NULL THEN
        INSERT INTO agent_config_history (agent_id, changed_by, changes, previous_config)
        VALUES (NEW.id, NEW.modified_by, changes_json, prev_config);
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER track_agent_changes BEFORE UPDATE ON agents FOR EACH ROW EXECUTE FUNCTION public.track_agent_config_change();

-- Search knowledge base
CREATE OR REPLACE FUNCTION public.search_knowledge_base(
    query_embedding vector(1536),
    org_id UUID,
    match_threshold FLOAT DEFAULT 0.78,
    match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT kb.id, kb.content, kb.metadata, 1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.organization_id = org_id
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Search by store
CREATE OR REPLACE FUNCTION public.search_store_knowledge(
    query_embedding vector(1536),
    p_store_id UUID,
    match_threshold FLOAT DEFAULT 0.75,
    match_count INT DEFAULT 5
)
RETURNS TABLE (id UUID, content TEXT, metadata JSONB, document_type TEXT, similarity FLOAT)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT kb.id, kb.content, kb.metadata, kb.document_type, 1 - (kb.embedding <=> query_embedding) AS similarity
    FROM knowledge_base kb
    WHERE kb.store_id = p_store_id
        AND kb.embedding IS NOT NULL
        AND 1 - (kb.embedding <=> query_embedding) > match_threshold
    ORDER BY kb.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ============================================================================
-- PART 8: SEED DATA
-- ============================================================================

-- Demo Organization
INSERT INTO organizations (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', '2B Agency', '2b-agency');

-- AI Models
INSERT INTO ai_models (id, name, provider, description, max_tokens, supports_vision, supports_functions, cost_per_1k_input, cost_per_1k_output) VALUES
    ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'Fast and cost-effective for most tasks', 128000, true, true, 0.00015, 0.0006),
    ('gpt-4o', 'GPT-4o', 'openai', 'Most capable OpenAI model', 128000, true, true, 0.005, 0.015),
    ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'Balanced performance and cost', 128000, true, true, 0.01, 0.03),
    ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'Fast and economical', 16385, false, true, 0.0005, 0.0015),
    ('claude-3-opus', 'Claude 3 Opus', 'anthropic', 'Most powerful Claude model', 200000, true, true, 0.015, 0.075),
    ('claude-3-sonnet', 'Claude 3 Sonnet', 'anthropic', 'Balanced Claude model', 200000, true, true, 0.003, 0.015),
    ('claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 'Fast and affordable Claude', 200000, true, true, 0.00025, 0.00125);

-- Demo Stores
INSERT INTO stores (id, organization_id, name, slug, description, color, is_active) VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Snatched', 'snatched', 'Fajas y shapewear premium', '#a855f7', true),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sonryse', 'sonryse', 'Fajas post-quirúrgicas colombianas', '#ec4899', true),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Salomé', 'salome', 'Fajas de alta compresión', '#8b5cf6', true);

-- Demo Agents
INSERT INTO agents (id, organization_id, name, slug, role, description, icon, is_active, ai_model, temperature, max_tokens, system_prompt, welcome_message, capabilities, category) VALUES
    (
        '55555555-5555-5555-5555-555555555555',
        '11111111-1111-1111-1111-111111111111',
        'Agent Copy',
        'agent-copy',
        'Copywriting Specialist',
        'Genera copies persuasivos, hooks virales y contenido de marketing',
        '✍️',
        true,
        'gpt-4o-mini',
        0.8,
        4096,
        'Eres un experto copywriter especializado en e-commerce de fajas y shapewear. Tu objetivo es crear contenido persuasivo que conecte emocionalmente con mujeres que buscan sentirse más seguras y cómodas con su cuerpo.

ESTILO:
- Usa un tono cercano y empático
- Evita ser agresivo o crear inseguridades
- Enfócate en beneficios, no solo características
- Usa emojis estratégicamente para engagement

FORMATOS QUE DOMINAS:
- Hooks para TikTok/Reels (primeros 3 segundos)
- Descripciones de producto para Amazon/Shopify
- Emails de marketing y secuencias
- Copies para Facebook/Instagram Ads
- Scripts de video corto

SIEMPRE:
- Pregunta por el objetivo específico si no está claro
- Ofrece variantes A/B cuando sea apropiado
- Incluye llamados a la acción claros',
        '¡Hola! Soy tu asistente de copywriting especializado en e-commerce. ¿Qué contenido necesitas crear hoy?',
        '{"rag_enabled": true, "web_search": false, "code_execution": false, "image_generation": false}',
        'marketing'
    ),
    (
        '66666666-6666-6666-6666-666666666666',
        '11111111-1111-1111-1111-111111111111',
        'Agent ADS',
        'agent-ads',
        'Advertising Specialist',
        'Crea y optimiza campañas publicitarias en múltiples plataformas',
        '📢',
        false,
        'gpt-4o',
        0.6,
        4096,
        'Eres un especialista en publicidad digital con experiencia en Facebook Ads, TikTok Ads, y Google Ads.',
        '¡Hola! Soy tu especialista en publicidad digital. ¿En qué plataforma necesitas ayuda hoy?',
        '{"rag_enabled": true, "web_search": true, "code_execution": false, "image_generation": false}',
        'advertising'
    ),
    (
        '77777777-7777-7777-7777-777777777777',
        '11111111-1111-1111-1111-111111111111',
        'Agent Apelaciones',
        'agent-apelaciones',
        'Appeals Specialist',
        'Redacta apelaciones profesionales para políticas de e-commerce',
        '⚖️',
        false,
        'gpt-4o',
        0.3,
        8192,
        'Eres un especialista en redactar apelaciones para plataformas de e-commerce.',
        '¡Hola! Soy tu especialista en apelaciones. Cuéntame sobre la suspensión o problema que enfrentas.',
        '{"rag_enabled": true, "web_search": true, "code_execution": false, "image_generation": false}',
        'legal'
    );

-- Sample Knowledge Base
INSERT INTO knowledge_base (id, organization_id, store_id, content, metadata, document_type) VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'GUÍA DE MARCA SNATCHED

Snatched es una marca premium de fajas y shapewear diseñada para mujeres modernas.

TONO DE VOZ:
- Empoderador pero no agresivo
- Cercano y amigable
- Inclusivo para todos los tipos de cuerpo

PALABRAS CLAVE:
- Moldea, realza, define
- Comodidad todo el día
- Tecnología de compresión',
        '{"type": "brand_guide", "version": "1.0"}',
        'brand'
    );

-- ============================================================================
-- DONE!
-- ============================================================================

SELECT 'Database setup complete!' as status;

-- ============================================================================
-- NEXT STEPS (run after creating users in Supabase Dashboard):
-- ============================================================================
/*
1. Go to Authentication > Users in Supabase Dashboard
2. Create two users:
   - admin@2b.com / Admin123!
   - user@2b.com / User123!

3. Then run this to assign roles:

UPDATE profiles
SET role = 'admin', organization_id = '11111111-1111-1111-1111-111111111111', full_name = 'Admin 2B'
WHERE email = 'admin@2b.com';

UPDATE profiles
SET role = 'user', organization_id = '11111111-1111-1111-1111-111111111111', full_name = 'Usuario Demo'
WHERE email = 'user@2b.com';
*/
