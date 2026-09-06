# AI Agent Project State

## Current phase:
PROJECT STATUS: COMPLETE V1

## Implemented:
- **Core Stack**: Next.js 16 (Turbopack, App Router), React 19, TypeScript 5, Tailwind CSS 4.
- **Authentication**: Supabase Auth with cookie-based SSR (`@supabase/ssr`), route-protecting middleware, login and signup flows, profile auto-creation trigger.
- **ChatGPT-style Layout**: Collapsible left sidebar with New Chat, date-grouped conversation history, navigation (Files, Tasks, Models, Settings), and profile/logout controls.
- **Chat Experience**: Streaming responses via Vercel AI SDK (`streamText`), conversation persistence, auto-titling from first message, stop generation support, and message history restore.
- **Supervisor-Style Agent Architecture (`agents/`)**:
  - **Supervisor Loop**: Implements the full autonomous lifecycle: `USER REQUEST -> UNDERSTAND -> PLAN -> SELECT MODEL -> SELECT TOOLS -> EXECUTE -> INSPECT -> RECOVER / RETRY -> VERIFY -> FINAL RESPONSE`.
  - **Supervisor Coordinator** (`agents/supervisor/agent-supervisor.ts`): Orchestrates execution state, coordinates SSE events, records agent runs in Supabase `agent_runs`, and compiles final synthesized responses.
  - **Agent Planner** (`agents/planner/planner.ts`): Formulates goal plans, decomposes tasks into typed tool steps, and handles attachments, search, code, and document goals.
  - **Tool Execution Engine** (`agents/executor/tool-executor.ts`): Executes tools with automatic retry, input heuristic repair, DB persistence in `tool_executions`, and error handling.
  - **Model Router** (`agents/router/model-router.ts`): Deterministically scores models based on tool support, vision, reasoning capabilities, and context window requirements.
  - **Output & Task Verifier** (`agents/verifier/verifier.ts`): Validates tool execution outputs, ensures generated artifacts are non-empty and well-formed, and checks search citations.
- **Tool System (`tools/`)**:
  - **Tool Registry** (`tools/registry.ts`): Centralized, extensible registry with Zod input schema validation, metadata reflection, and execution contexts.
  - **Web Search Tool** (`tools/web-search.ts`): Safe internet queries with live DuckDuckGo HTML parsing and SearXNG fallback support.
  - **Python Execution & Sandbox** (`sandbox/python-runner.ts`, `tools/code-execution.ts`): Secure, isolated Python runner executing scripts in sanitized scratch directories with time-outs, memory limits, and secret stripping.
  - **Document Generator** (`tools/document-generator.ts`): Automated generation of styled Excel spreadsheets (.xlsx via openpyxl/pandas), Word documents (.docx via python-docx), PDF documents (.pdf via reportlab), and PowerPoint decks (.pptx via python-pptx).
  - **File & Workspace Tools** (`tools/file-tools.ts`): Tools for `read_file`, `create_file`, `list_files`, `file_metadata`, and `delete_file` with Supabase Storage integration and multi-format text parsing.
- **Interactive UI & Real-Time Feedback**:
  - **Activity Panel** (`components/chat/activity-panel.tsx`): Real-time collapsible execution drawer displaying live agent steps, tool calls, retry counters, and log output.
  - **Artifact Cards** (`components/chat/artifact-card.tsx`): Rich preview cards for generated files with type icons, size badges, and instant download actions.
  - **Approval Dialog** (`components/chat/approval-dialog.tsx`): Modal dialog to prompt user approval for sensitive/destructive operations.
  - **SSE Streaming API** (`app/api/agent/run/route.ts`): Server-Sent Events endpoint streaming operational events, artifacts, and final responses in real-time.
- **Provider & Model Infrastructure**:
  - Decoupled `ProviderAdapter` architecture with `OpenAICompatibleAdapter` supporting OpenAI, OpenRouter, Groq, Together AI, Mistral, and local Ollama.
  - Dynamic model discovery with credential testing and capability extraction.
- **Security & Privacy**: Client-side never touches credentials; API keys are encrypted at rest with AES-256-GCM; Postgres Row Level Security (RLS) ensures tenant isolation.
- **Testing & Verification**:
  - 28 unit tests passing across 7 test suites in Vitest (`tests/*.test.ts`).
- Next.js production build verified with 0 errors (`next build`).

## PART 3 completed functionality:
- **Deep research**: multi-query workflow searches, opens accessible sources, extracts source text, classifies source quality, returns source URLs/citations, and reports failure rather than fabricating browsing results.
- **Persistent memory**: per-user durable memory service and Memory page/API support store, relevant retrieval, update, delete/forget, and explicit inspection. Only durable preference/knowledge signals are automatically retained.
- **Images**: provider-capability based generation/edit tools route through an image-capable configured model and save output as private `user-files` artifacts.
- **Browser discovery and job safety**: safe page inspection extracts links/forms and logs browser activity. Form preparation requires server-side approval; the tool never uploads or submits applications.
- **Approvals**: approval requests are persisted server-side with an expiry and UI confirmation. A final submission uses a distinct critical approval flow when introduced by a provider integration.
- **Scheduled tasks**: task CRUD, enable/disable, run-now API, and Tasks page. Each run uses the main supervisor and is user-scoped.
- **Security**: added RLS for approvals and browser activity; all memory, task, image, file and approval queries are scoped to authenticated user IDs. External content is explicitly treated as untrusted.

## Database:
- Migration files: `supabase/migrations/001_initial_schema.sql`, `supabase/migrations/002_agent_tables.sql`
- Active tables: `profiles`, `providers`, `models`, `conversations`, `messages`, `files`, `usage_events`, `agent_runs`, `tool_executions`, `artifacts`
- Pre-provisioned tables for upcoming phases: `memories`, `scheduled_tasks`
- Storage bucket: `user-files` (private, user-partitioned RLS)
- Triggers: `on_auth_user_created` (auto-creates profile), `update_updated_at` on mutable tables

## Providers:
- Dynamic OpenAI-compatible adapter (`lib/providers/openai-compatible.ts`)
- Provider registry factory (`lib/providers/registry.ts`)
- Model registry and selector (`lib/models/registry.ts`, `lib/models/selector.ts`)
- Presets supported: OpenAI, OpenRouter, Groq, Together AI, Mistral, Ollama

## V1 hardening (PART 4):
- Migrated authentication interception to Next.js 16 `proxy.ts`.
- Added bounded per-user request/tool/research/code limits, authenticated conversation ownership checks, payload limits, safe provider-error sanitization, and private file-record authorization for downloads.
- Added upload MIME/size validation and storage cleanup on failed metadata inserts.
- Hardened the Python subprocess environment so it does not inherit application secrets, capped timeouts, and blocked network/process-control code patterns.
- Added static-shell PWA/degraded-offline support, draft retention, an offline indicator, usage summary, and missing operational documentation.
- Added an owner-provided server-side Excel/Word quality policy. It activates only for document requests in direct chat and supervisor synthesis; it is not exposed as a client-side editable system prompt.

## Environment variables:
- `NEXT_PUBLIC_SUPABASE_URL`: Supabase project API URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase project public anon key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role secret key
- `ENCRYPTION_KEY`: 32-byte hex string (64 characters) used for AES-256-GCM credential encryption
- `NEXT_PUBLIC_APP_URL`: Base application URL (default: `http://localhost:3000`)

## Deployment:
- Apply migrations 001, 002, and 003 in order; configure the documented environment variables in Vercel; set Supabase Auth redirect URLs; then deploy a successful production build.

## Known limitations / future improvements:
- The built-in rate limiter is in-memory and per instance; use a managed shared store when horizontally scaling.
- Scheduled task due-time execution requires a deployed Vercel Cron or Supabase worker.
- Browser discovery is read-only; authenticated browsing, uploads, and final submissions require an isolated browser worker.
- Python protections are defense in depth; execute untrusted workloads in an OS/container sandbox for production multi-tenant use.

## Known limitations / PART 4 candidates:
- A production scheduler/cron trigger must invoke due `scheduled_tasks`; this repository exposes the secure run-now path but does not deploy a platform scheduler.
- pgvector schema is enabled, while embedding generation is deliberately provider-agnostic and should be connected to a configured embedding model for semantic ranking.
- Browser discovery fetches public pages; real authenticated browser automation and final submission integrations require an isolated browser worker plus a separate critical approval action.
