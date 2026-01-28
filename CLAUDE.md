# CLAUDE.md - Enterprise Multi-Agent Marketing Platform (v3.0)

> **Actualizado**: Enero 2025

---

## 1. Directiva Principal (The Directive)

### Objetivo
Construir una plataforma SaaS empresarial ("Agency-as-a-Platform") con **arquitectura jerárquica de agentes** para automatizar marketing de e-commerce (fajas y shapewear).

### Diferenciadores Clave

| Diferenciador | Descripción |
|---------------|-------------|
| **RBAC Estricto** | `ADMIN` gestiona agentes y conocimiento / `USER` consume agentes |
| **RAG Dinámico** | Base de conocimiento viva con embeddings (pgvector) |
| **Agentes Configurables** | Similar a n8n: modelo AI, temperatura, prompts, capabilities |
| **Multi-tenancy** | Múltiples organizaciones con aislamiento por RLS |

### Filosofia de Desarrollo

| Rol | Responsabilidad |
|-----|-----------------|
| **Humano** | Director (Define el "Que") |
| **Claude** | Arquitecto e Ingeniero Principal (Define el "Como" y ejecuta) |

**Prioridades**: Codigo limpio, tipado estricto, seguridad (RLS) y modularidad.

---

## 2. Pila Tecnologica & Arquitectura

### Backend (FastAPI + LangGraph)

| Tecnologia | Uso | Estado |
|------------|-----|--------|
| **FastAPI** | Framework Python 3.11+ | Implementado |
| **LangGraph** | Orquestacion Supervisor-Worker | Implementado |
| **Supabase (PostgreSQL)** | Base de Datos + Auth | Implementado |
| **pgvector** | Embeddings para RAG | Implementado |
| **OpenAI API** | Modelos de lenguaje | Implementado |

### Frontend (Next.js 15)

| Tecnologia | Uso | Estado |
|------------|-----|--------|
| **Next.js 15** | App Router + RSC | Implementado |
| **TypeScript** | Strict Mode | Implementado |
| **Tailwind CSS** | Estilos (tema oscuro glassmorphism) | Implementado |
| **Material UI** | Iconos y componentes | Implementado |
| **Vercel AI SDK** | Streaming de chat | Implementado |

### Arquitectura de Interfaces

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
├─────────────────────────────────┬───────────────────────────────────┤
│          ADMIN PANEL            │           USER PANEL              │
│  • Ver todos los agentes        │  • Ver agentes activos            │
│  • Configurar agentes:          │  • Chat con agentes               │
│    - Modelo AI (GPT-4o, Claude) │  • Historial de conversaciones    │
│    - Temperature & Max Tokens   │  • Interfaz tipo canvas           │
│    - System Prompt              │                                   │
│    - Capabilities (RAG, Web)    │                                   │
│  • Activar/Desactivar agentes   │                                   │
│  • Historial de cambios (audit) │                                   │
│  • Gestionar Knowledge Base     │                                   │
└─────────────────────────────────┴───────────────────────────────────┘
```

---

## 3. Modelo de Datos (Supabase)

### Diagrama de Relaciones

```
┌──────────────────┐
│  organizations   │ (Multi-tenancy root)
└────────┬─────────┘
         │
    ┌────┴────┬──────────┬──────────┬──────────┐
    ▼         ▼          ▼          ▼          ▼
┌────────┐ ┌────────┐ ┌────────┐ ┌──────────┐ ┌───────────────┐
│profiles│ │ stores │ │ agents │ │knowledge │ │ chat_sessions │
│        │ │        │ │        │ │  _base   │ │               │
└────────┘ └────────┘ └───┬────┘ └──────────┘ └───────┬───────┘
                          │                           │
                          ▼                           ▼
                   ┌─────────────────┐        ┌─────────────┐
                   │agent_config_    │        │chat_messages│
                   │    history      │        │             │
                   └─────────────────┘        └─────────────┘
```

### Tablas Principales

| Tabla | Descripcion | Campos Clave |
|-------|-------------|--------------|
| `organizations` | Multi-tenancy | id, name, slug |
| `profiles` | Usuarios + roles | id, role (admin/user), organization_id |
| `stores` | Tiendas/marcas | id, name, slug, color |
| `agents` | Agentes configurables | id, name, ai_model, temperature, system_prompt, capabilities |
| `knowledge_base` | Documentos + embeddings | content, embedding (vector 1536), metadata |
| `chat_sessions` | Conversaciones | user_id, agent_id, store_id |
| `chat_messages` | Mensajes | role, content, metadata |
| `agent_config_history` | Auditoria de cambios | changes (JSONB), previous_config |
| `ai_models` | Modelos disponibles | id, provider, max_tokens, cost |

### Configuracion de Agentes (tabla `agents`)

```sql
agents (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    role TEXT NOT NULL,              -- "Copywriting Specialist"
    description TEXT,
    icon TEXT DEFAULT '🤖',

    -- AI Configuration
    ai_model TEXT DEFAULT 'gpt-4o-mini',    -- Modelo a usar
    temperature FLOAT DEFAULT 0.7,           -- 0.0 - 2.0
    max_tokens INTEGER DEFAULT 2048,         -- Limite de tokens
    system_prompt TEXT,                      -- Prompt del sistema
    welcome_message TEXT,                    -- Mensaje inicial

    -- Capabilities
    capabilities JSONB DEFAULT '{
        "rag_enabled": true,
        "web_search": false,
        "code_execution": false,
        "image_generation": false
    }',

    -- Metadata
    is_active BOOLEAN DEFAULT true,
    category TEXT DEFAULT 'general',
    version INTEGER DEFAULT 1,
    modified_by UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
```

### Modelos AI Disponibles (tabla `ai_models`)

| ID | Provider | Descripcion |
|----|----------|-------------|
| gpt-4o-mini | OpenAI | Rapido y economico |
| gpt-4o | OpenAI | Mas capaz |
| gpt-4-turbo | OpenAI | Balance rendimiento/costo |
| claude-3-opus | Anthropic | Mas potente |
| claude-3-sonnet | Anthropic | Balanceado |
| claude-3-haiku | Anthropic | Rapido y asequible |

### Row Level Security (RLS)

| Tabla | Admin | User |
|-------|-------|------|
| `agents` | CRUD completo | Solo lectura (org) |
| `knowledge_base` | CRUD completo | Solo lectura (org) |
| `chat_sessions` | Ver todas (org) | Solo propias |
| `agent_config_history` | Ver todo (org) | Ver (org) |
| `ai_models` | Lectura | Lectura |

---

## 4. Arquitectura de Agentes

### Patron Supervisor-Worker

```
                    ┌─────────────┐
                    │    USER     │
                    │   REQUEST   │
                    └──────┬──────┘
                           │
                           ▼
                    ┌─────────────┐
                    │ SUPERVISOR  │ ◄── Lee config de DB
                    │ (Router)    │     (model, temp, prompt)
                    └──────┬──────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │ AGENT COPY  │ │ AGENT ADS   │ │ AGENT       │
    │ (Marketing) │ │ (Publicidad)│ │ APELACIONES │
    └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
           │               │               │
           │      ┌────────┴────────┐      │
           │      ▼                 ▼      │
           │ ┌─────────┐     ┌──────────┐  │
           │ │   RAG   │     │ Web      │  │
           │ │ Search  │     │ Search   │  │
           │ └─────────┘     └──────────┘  │
           │                               │
           └───────────────┬───────────────┘
                           ▼
                    ┌─────────────┐
                    │  RESPONSE   │
                    │  + Stream   │
                    └─────────────┘
```

### Agentes Actuales

| Agente | Rol | Activo | Modelo | Capabilities |
|--------|-----|--------|--------|--------------|
| Agent Copy | Copywriting Specialist | Si | gpt-4o-mini | RAG |
| Agent ADS | Advertising Specialist | No | gpt-4o | RAG + Web |
| Agent Apelaciones | Appeals Specialist | No | gpt-4o | RAG + Web |

---

## 5. Estructura del Proyecto

```
MultiAgent/
├── backend/
│   ├── app/
│   │   ├── agents/
│   │   │   ├── supervisor.py      # Orquestador principal
│   │   │   └── workers/           # Sub-agentes
│   │   ├── api/
│   │   │   ├── agents.py          # CRUD agentes + config
│   │   │   ├── chat.py            # Endpoints de chat
│   │   │   ├── stores.py          # CRUD tiendas
│   │   │   └── knowledge.py       # RAG endpoints
│   │   ├── core/
│   │   │   ├── config.py          # Variables de entorno
│   │   │   └── supabase.py        # Cliente Supabase
│   │   ├── models/
│   │   │   ├── agent.py           # Pydantic: Agent, AgentUpdate
│   │   │   └── chat.py            # Pydantic: Message, Thread
│   │   ├── services/
│   │   │   └── embeddings.py      # OpenAI embeddings
│   │   └── main.py                # FastAPI app
│   ├── requirements.txt
│   └── .env
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── login/             # Pagina de login
│   │   │   ├── register/          # Pagina de registro
│   │   │   └── tienda/[storeId]/  # Dashboard principal
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── AdminDashboard.tsx    # Panel admin
│   │   │   │   ├── AdminAgentCard.tsx    # Card de agente (admin)
│   │   │   │   └── AgentConfigPanel.tsx  # Configurador completo
│   │   │   ├── dashboard/
│   │   │   │   ├── Sidebar.tsx           # Menu lateral
│   │   │   │   ├── AgentCard.tsx         # Card de agente (user)
│   │   │   │   ├── FullChatView.tsx      # Vista de chat
│   │   │   │   └── StoreHeader.tsx       # Header de tienda
│   │   │   └── ui/                       # Componentes base
│   │   ├── lib/
│   │   │   ├── api/
│   │   │   │   └── client.ts      # API client
│   │   │   └── supabase/
│   │   │       └── index.ts       # Supabase + Auth hooks
│   │   └── data/
│   │       └── mock.ts            # Datos mock (fallback)
│   ├── .env.local
│   └── package.json
│
├── supabase/
│   └── migrations/
│       └── FULL_SETUP.sql         # Script completo de DB
│
└── CLAUDE.md
```

---

## 6. API Endpoints

### Agentes (`/api/v1/agents`)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/` | Listar agentes (org) |
| GET | `/{id}` | Obtener agente |
| GET | `/slug/{slug}` | Obtener por slug |
| POST | `/` | Crear agente |
| PATCH | `/{id}` | Actualizar config |
| DELETE | `/{id}` | Eliminar agente |
| GET | `/{id}/history` | Historial de cambios |
| POST | `/{id}/duplicate` | Duplicar agente |
| GET | `/models/available` | Modelos AI disponibles |

### Chat (`/api/v1/chat`)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/threads` | Listar conversaciones |
| GET | `/threads/{id}` | Obtener con mensajes |
| POST | `/threads` | Crear conversacion |
| POST | `/threads/{id}/messages` | Enviar mensaje |
| POST | `/stream` | Chat con streaming |

### Stores (`/api/v1/stores`)

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| GET | `/` | Listar tiendas |
| GET | `/{id}` | Obtener tienda |
| GET | `/slug/{slug}` | Por slug |

---

## 7. Flujo de Usuario

### Admin

1. Login con `admin@2b.com` / `Admin123!`
2. Ve el **AdminDashboard** con grid de agentes
3. Click en agente -> **AgentConfigPanel**
4. Configura: modelo, temperatura, prompt, capabilities
5. Guarda -> Se registra en `agent_config_history`
6. Los cambios afectan inmediatamente al agente en produccion

### Usuario

1. Login con `user@2b.com` / `User123!`
2. Ve dashboard con agentes **activos** solamente
3. Click en agente -> **FullChatView**
4. Conversa con el agente (streaming)
5. El agente usa la config guardada por el Admin

---

## 8. Comandos de Desarrollo

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend
cd frontend
npm install
npm run dev

# Base de datos
# Ejecutar FULL_SETUP.sql en Supabase SQL Editor
```

### Variables de Entorno

**Backend (.env)**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

**Frontend (.env.local)**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 9. Estado Actual del Proyecto

### Completado

- [x] **Fase 1**: Monorepo setup (backend + frontend)
- [x] **Fase 2**: Base de datos Supabase (tablas + RLS + triggers)
- [x] **Fase 3**: LangGraph Supervisor basico
- [x] **Fase 4**: Agente de Copywriting
- [x] **Fase 5**: Chat UI con streaming
- [x] **Fase 6**: Sistema de autenticacion (login/register)
- [x] **Fase 7**: Panel Admin - Vista de agentes
- [x] **Fase 8**: Configurador de agentes (modelo, temp, prompt)
- [x] **Fase 9**: API de configuracion de agentes
- [x] **Fase 10**: Historial de cambios (audit trail)

### En Progreso

- [ ] **Conectar AdminDashboard con API real** (actualmente usa mock si falla)
- [ ] **AgentConfigPanel funcional al 100%** (guardar cambios a DB)

### Pendiente

- [ ] **Fase 11**: Knowledge Base UI (upload documentos)
- [ ] **Fase 12**: RAG en tiempo real (cuando Admin actualiza docs)
- [ ] **Fase 13**: Agent ADS funcional
- [ ] **Fase 14**: Agent Apelaciones funcional
- [ ] **Fase 15**: Dashboard de metricas
- [ ] **Fase 16**: Deploy a produccion (Vercel + Railway)

---

## 10. Usuarios de Prueba

| Email | Password | Rol | Permisos |
|-------|----------|-----|----------|
| admin@2b.com | Admin123! | admin | CRUD agentes, ver todo |
| user@2b.com | User123! | user | Chat con agentes activos |

---

## 11. Notas Tecnicas

### Trigger de Auditoria

Cada vez que se actualiza un agente con `modified_by`, se crea automaticamente un registro en `agent_config_history`:

```sql
-- Trigger automatico
BEFORE UPDATE ON agents:
  1. Captura config anterior
  2. Compara cambios (name, role, ai_model, temperature, etc.)
  3. Si hay cambios Y modified_by != NULL:
     INSERT INTO agent_config_history
  4. Incrementa version del agente
```

### Streaming de Chat

El chat usa Server-Sent Events (SSE) para streaming:

```
POST /api/v1/chat/stream
Content-Type: application/json

{
  "thread_id": "uuid",
  "agent_id": "uuid",
  "message": "Genera un hook para TikTok"
}

Response: text/event-stream
data: {"token": "Hola"}
data: {"token": ", "}
data: {"token": "aqui"}
...
data: [DONE]
```

---

## 12. Proximos Pasos Inmediatos

1. **Verificar que los paneles Admin y User muestren contenido diferente**
   - Admin: AgentConfigPanel con todas las opciones
   - User: Solo chat view

2. **Conectar el guardado de AgentConfigPanel a la API**
   - Llamar `PATCH /api/v1/agents/{id}` con los cambios

3. **Probar el flujo completo**:
   - Admin modifica temperatura de un agente
   - User chatea con el agente
   - El agente responde con la nueva temperatura

4. **Implementar Knowledge Base UI**
   - Upload de PDFs/docs
   - Chunking automatico
   - Generacion de embeddings
