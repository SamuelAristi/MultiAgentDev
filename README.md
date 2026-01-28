# Multi-Agent Marketing Platform

Enterprise SaaS platform with hierarchical AI agents for e-commerce marketing automation.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│                    Next.js 15 + TypeScript                       │
├───────────────────────────┬─────────────────────────────────────┤
│       ADMIN PANEL         │           USER PANEL                │
│  - Configure agents       │  - Chat with active agents          │
│  - Manage AI models       │  - View conversation history        │
│  - Knowledge base CRUD    │  - Streaming responses              │
└───────────────────────────┴─────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│                    FastAPI + LangGraph                           │
├─────────────────────────────────────────────────────────────────┤
│  Supervisor (Router) ──► Worker Agents ──► Tools (RAG, Web)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATABASE                                  │
│              Supabase (PostgreSQL + pgvector)                    │
│         Auth + RLS + Embeddings + Real-time                      │
└─────────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, Vercel AI SDK |
| Backend | FastAPI, LangGraph, Python 3.11+ |
| Database | Supabase (PostgreSQL), pgvector |
| AI | OpenAI API, Anthropic Claude |
| Auth | Supabase Auth + Row Level Security |

## Features

- **Multi-tenant architecture** - Organization-based data isolation
- **Configurable AI agents** - Model, temperature, prompts, capabilities
- **RAG system** - Knowledge base with vector embeddings
- **Real-time chat** - Server-sent events streaming
- **RBAC** - Admin/User role separation
- **Audit trail** - Agent configuration history

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Supabase account

### Backend Setup

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your credentials

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your credentials

# Run dev server
npm run dev
```

### Database Setup

1. Create a Supabase project
2. Run the migration in `supabase/migrations/FULL_SETUP.sql`
3. Enable Row Level Security

## Environment Variables

### Backend (.env)

```env
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
OPENAI_API_KEY=sk-...
```

### Frontend (.env.local)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Project Structure

```
MultiAgent/
├── backend/
│   ├── app/
│   │   ├── agents/          # LangGraph supervisor + workers
│   │   ├── api/             # FastAPI routes
│   │   ├── core/            # Config, Supabase client
│   │   ├── models/          # Pydantic schemas
│   │   └── services/        # Business logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js pages
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom hooks
│   │   └── lib/             # Utilities, API client
│   └── package.json
└── supabase/
    └── migrations/          # SQL migrations
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/agents` | List agents |
| PATCH | `/api/v1/agents/{id}` | Update agent config |
| POST | `/api/v1/chat/stream` | Chat with streaming |
| GET | `/api/v1/stores` | List stores |
| POST | `/api/v1/knowledge` | Add to knowledge base |

## Test Users

| Email | Password | Role |
|-------|----------|------|
| admin@2b.com | Admin123! | Admin |
| user@2b.com | User123! | User |

## License

MIT
