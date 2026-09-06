# Architecture Overview - Nexus AI Workspace

Nexus is a personal multi-provider AI workspace designed for flexibility, clean separation of concerns, and full user data isolation.

## System Topology

```
┌─────────────────────────────────────────────────────────────────┐
│                           Client UI                             │
│  - App Router (/chat, /models, /files, /tasks, /settings)       │
│  - ThemeProvider (Dark / Light / System)                        │
│  - ChatComposer (ModelSelector, Attachments, Streaming reader)  │
│  - Left Sidebar (Chat history grouped by date, nav, auth)       │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP / JSON / SSE Data Stream
┌───────────────────────────────▼─────────────────────────────────┐
│                      Next.js API Layer                          │
│  - /api/chat                  - /api/providers                  │
│  - /api/models                - /api/conversations              │
│  - /api/files/upload          - /api/auth/callback              │
└───────┬───────────────────────────────┬─────────────────────────┘
        │                               │
┌───────▼──────────────────┐    ┌───────▼─────────────────────────┐
│   AI Provider Layer      │    │     Supabase Backend            │
│  - ProviderRegistry      │    │  - Auth (Cookie sessions, RLS)  │
│  - ProviderAdapter base  │    │  - Postgres with RLS policies   │
│  - OpenAICompatibleAdapter│   │  - Supabase Storage (user-files)│
│  - AES-256-GCM decrypt   │    │  - Full tenant isolation        │
│  - Vercel AI SDK stream  │    └─────────────────────────────────┘
└───────┬──────────────────┘
        │
┌───────▼─────────────────────────────────────────────────────────┐
│                      External AI APIs                           │
│  - OpenAI, OpenRouter, Groq, Together AI, Ollama, etc.          │
└─────────────────────────────────────────────────────────────────┘
```

## Security Architecture

1. **Zero Client-Side Key Exposure**: AI provider API keys are submitted via HTTPS POST, encrypted server-side with AES-256-GCM using `ENCRYPTION_KEY`, and stored in the `providers` table. They are never returned to client JavaScript (GET endpoints omit keys).
2. **Row Level Security (RLS)**: Every user-owned table has explicit Postgres RLS policies checking `auth.uid() = user_id`. User A cannot read or write User B's data under any condition.
3. **Session Verification**: Middleware and server clients use `@supabase/ssr` to validate JWT cookies on every request. Unauthenticated visitors to `/chat`, `/settings`, etc. are automatically redirected to `/login`.
