-- ============================================================================
-- Migration: 20260126_admin_panel_and_users.sql
-- Description: Add agent configuration fields and seed test users
-- ============================================================================

-- ============================================================================
-- 1. EXTEND AGENTS TABLE WITH CONFIGURATION FIELDS
-- ============================================================================

-- Add AI model configuration
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS ai_model TEXT DEFAULT 'gpt-4o-mini';

-- Add temperature setting
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS temperature FLOAT DEFAULT 0.7 CHECK (temperature >= 0 AND temperature <= 2);

-- Add max tokens setting
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS max_tokens INTEGER DEFAULT 2048 CHECK (max_tokens > 0 AND max_tokens <= 128000);

-- Add welcome message
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS welcome_message TEXT;

-- Add capabilities/features as JSONB
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{"rag_enabled": true, "web_search": false, "code_execution": false}';

-- Add category for grouping
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'general';

-- Add version tracking
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Add last modified by
ALTER TABLE agents
ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES profiles(id);

-- ============================================================================
-- 2. CREATE AGENT CONFIGURATION HISTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS agent_config_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID REFERENCES agents(id) ON DELETE CASCADE NOT NULL,
    changed_by UUID REFERENCES profiles(id) NOT NULL,
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changes JSONB NOT NULL, -- Stores the diff of what changed
    previous_config JSONB NOT NULL, -- Full snapshot before change
    change_reason TEXT
);

CREATE INDEX IF NOT EXISTS agent_config_history_agent_idx ON agent_config_history(agent_id);
CREATE INDEX IF NOT EXISTS agent_config_history_date_idx ON agent_config_history(changed_at DESC);

-- ============================================================================
-- 3. CREATE AVAILABLE AI MODELS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_models (
    id TEXT PRIMARY KEY, -- e.g., 'gpt-4o-mini', 'gpt-4o', 'claude-3-opus'
    name TEXT NOT NULL,
    provider TEXT NOT NULL, -- 'openai', 'anthropic', 'google'
    description TEXT,
    max_tokens INTEGER DEFAULT 4096,
    supports_vision BOOLEAN DEFAULT false,
    supports_functions BOOLEAN DEFAULT true,
    cost_per_1k_input DECIMAL(10, 6),
    cost_per_1k_output DECIMAL(10, 6),
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed available AI models
INSERT INTO ai_models (id, name, provider, description, max_tokens, supports_vision, supports_functions, cost_per_1k_input, cost_per_1k_output) VALUES
    ('gpt-4o-mini', 'GPT-4o Mini', 'openai', 'Fast and cost-effective for most tasks', 128000, true, true, 0.00015, 0.0006),
    ('gpt-4o', 'GPT-4o', 'openai', 'Most capable OpenAI model', 128000, true, true, 0.005, 0.015),
    ('gpt-4-turbo', 'GPT-4 Turbo', 'openai', 'Balanced performance and cost', 128000, true, true, 0.01, 0.03),
    ('gpt-3.5-turbo', 'GPT-3.5 Turbo', 'openai', 'Fast and economical', 16385, false, true, 0.0005, 0.0015),
    ('claude-3-opus', 'Claude 3 Opus', 'anthropic', 'Most powerful Claude model', 200000, true, true, 0.015, 0.075),
    ('claude-3-sonnet', 'Claude 3 Sonnet', 'anthropic', 'Balanced Claude model', 200000, true, true, 0.003, 0.015),
    ('claude-3-haiku', 'Claude 3 Haiku', 'anthropic', 'Fast and affordable Claude', 200000, true, true, 0.00025, 0.00125)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. SEED DATA - DEMO ORGANIZATION AND USERS
-- ============================================================================

-- Create demo organization
INSERT INTO organizations (id, name, slug)
VALUES ('11111111-1111-1111-1111-111111111111', '2B Agency', '2b-agency')
ON CONFLICT (slug) DO NOTHING;

-- Note: Users must be created through Supabase Auth
-- The following is a placeholder to document the expected test users
-- You will need to create these users manually in Supabase Dashboard or via API

/*
TEST USERS TO CREATE:
1. Admin User:
   - Email: admin@2b.com
   - Password: Admin123!
   - Full Name: Admin 2B
   - Role: admin

2. Regular User:
   - Email: user@2b.com
   - Password: User123!
   - Full Name: Usuario Demo
   - Role: user
*/

-- ============================================================================
-- 5. SEED DEMO STORES
-- ============================================================================

INSERT INTO stores (id, organization_id, name, slug, description, color, is_active)
VALUES
    ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'Snatched', 'snatched', 'Fajas y shapewear premium', '#a855f7', true),
    ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'Sonryse', 'sonryse', 'Fajas post-quirúrgicas colombianas', '#ec4899', true),
    ('44444444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'Salomé', 'salome', 'Fajas de alta compresión', '#8b5cf6', true)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 6. SEED DEMO AGENTS WITH FULL CONFIGURATION
-- ============================================================================

INSERT INTO agents (
    id,
    organization_id,
    name,
    slug,
    role,
    description,
    icon,
    is_active,
    ai_model,
    temperature,
    max_tokens,
    system_prompt,
    welcome_message,
    capabilities,
    category
)
VALUES
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
        'Eres un especialista en publicidad digital con experiencia en Facebook Ads, TikTok Ads, y Google Ads. Tu enfoque está en maximizar el ROAS para tiendas de e-commerce de moda.

ÁREAS DE EXPERTISE:
- Estructuras de campañas (CBO, ABO)
- Segmentación de audiencias
- Creatividades que convierten
- Análisis de métricas y optimización
- Escalado de campañas ganadoras

SIEMPRE:
- Pide métricas actuales antes de recomendar
- Sugiere tests A/B específicos
- Considera el presupuesto disponible',
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
        'Eres un especialista en redactar apelaciones para plataformas de e-commerce como Amazon, Facebook, TikTok Shop, y Shopify. Tu objetivo es ayudar a vendedores a recuperar cuentas suspendidas o productos deslistados.

ESTRUCTURA DE APELACIONES:
1. Reconocimiento del problema
2. Causa raíz identificada
3. Acciones correctivas tomadas
4. Plan de prevención futuro

TONO:
- Profesional y respetuoso
- Conciso pero completo
- Sin excusas, enfocado en soluciones

PLATAFORMAS:
- Amazon Seller Central
- Facebook Commerce
- TikTok Shop
- Shopify Payments
- PayPal',
        '¡Hola! Soy tu especialista en apelaciones. Cuéntame sobre la suspensión o problema que enfrentas.',
        '{"rag_enabled": true, "web_search": true, "code_execution": false, "image_generation": false}',
        'legal'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 7. SEED SAMPLE KNOWLEDGE BASE DOCUMENTS
-- ============================================================================

-- Note: Embeddings need to be generated via the API
-- This is sample content without embeddings

INSERT INTO knowledge_base (
    id,
    organization_id,
    store_id,
    content,
    metadata,
    document_type
)
VALUES
    (
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'GUÍA DE MARCA SNATCHED

Snatched es una marca premium de fajas y shapewear diseñada para mujeres modernas que buscan realzar su figura con comodidad y estilo.

TONO DE VOZ:
- Empoderador pero no agresivo
- Cercano y amigable
- Inclusivo para todos los tipos de cuerpo
- Enfocado en confianza, no en "arreglar defectos"

PALABRAS CLAVE:
- Moldea, realza, define
- Comodidad todo el día
- Tecnología de compresión
- Diseño colombiano

EVITAR:
- Lenguaje que cree inseguridades
- Promesas irreales de pérdida de peso
- Comparaciones negativas',
        '{"type": "brand_guide", "version": "1.0", "author": "Marketing Team"}',
        'brand'
    ),
    (
        'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222',
        'CATÁLOGO DE PRODUCTOS SNATCHED

1. FAJA REDUCTORA CLÁSICA
   - Compresión: Alta
   - Material: Powernet + Algodón
   - Tallas: XS a 3XL
   - Precio: $89.99
   - Beneficios: Control de abdomen, soporte lumbar, invisible bajo la ropa

2. BODY REDUCTOR STRAPLESS
   - Compresión: Media-Alta
   - Material: Microfibra premium
   - Tallas: S a 2XL
   - Precio: $79.99
   - Beneficios: Versatilidad, escote libre, efecto levanta cola

3. SHORT REDUCTOR DEPORTIVO
   - Compresión: Media
   - Material: Supplex + Spandex
   - Tallas: XS a XL
   - Precio: $49.99
   - Beneficios: Ideal para ejercicio, anti-transpirante, costuras planas',
        '{"type": "product_catalog", "version": "2024-Q1", "product_count": 3}',
        'product'
    )
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 8. RLS POLICIES FOR NEW TABLES
-- ============================================================================

ALTER TABLE agent_config_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_models ENABLE ROW LEVEL SECURITY;

-- Anyone can read AI models
CREATE POLICY "Anyone can read AI models"
    ON ai_models FOR SELECT
    USING (true);

-- Admins can manage AI models
CREATE POLICY "Admins can manage AI models"
    ON ai_models FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can view config history for agents in their org
CREATE POLICY "Users can view agent config history"
    ON agent_config_history FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents a
            JOIN profiles p ON p.organization_id = a.organization_id
            WHERE a.id = agent_config_history.agent_id
            AND p.id = auth.uid()
        )
    );

-- Admins can insert config history
CREATE POLICY "Admins can insert config history"
    ON agent_config_history FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ============================================================================
-- 9. HELPER FUNCTION TO TRACK CONFIG CHANGES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.track_agent_config_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    changes_json JSONB;
    prev_config JSONB;
BEGIN
    -- Build previous config snapshot
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

    -- Build changes object (only changed fields)
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

    -- Only insert if there are actual changes and modified_by is set
    IF changes_json != '{}'::jsonb AND NEW.modified_by IS NOT NULL THEN
        INSERT INTO agent_config_history (agent_id, changed_by, changes, previous_config)
        VALUES (NEW.id, NEW.modified_by, changes_json, prev_config);

        -- Increment version
        NEW.version := COALESCE(OLD.version, 0) + 1;
    END IF;

    RETURN NEW;
END;
$$;

-- Create trigger for tracking changes
DROP TRIGGER IF EXISTS track_agent_changes ON agents;
CREATE TRIGGER track_agent_changes
    BEFORE UPDATE ON agents
    FOR EACH ROW
    EXECUTE FUNCTION public.track_agent_config_change();
