# Nexus - Personal AI Workspace (V1)

Nexus is a private, multi-provider AI workspace for chat, agent tools, document creation, research, memory, image workflows, and safe browser discovery.

## Quick start

1. Copy `.env.local.example` to `.env.local` and configure Supabase plus a 32-byte encryption key.
2. Apply migrations in order: `001_initial_schema.sql`, `002_agent_tools.sql`, then `003_part3_research_memory_automation.sql`.
3. Run `npm run dev`, sign up, add a provider on **Models**, and test its connection.

For Vercel/Supabase deployment and operational limitations, see [docs/deployment.md](docs/deployment.md) and [docs/troubleshooting.md](docs/troubleshooting.md).

## Environment Variables

Copy `.env.local.example` to `.env.local` and fill in your values:

```bash
cp .env.local.example .env.local
```

### Required Variables

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Your Supabase service role key |
| `ENCRYPTION_KEY` | 32-byte hex string for encrypting API keys at rest |

### Generate Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## Development

```bash
npm run dev
```

## Database Setup

Run the migration SQL in your Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql`
- `supabase/migrations/002_agent_tools.sql`
- `supabase/migrations/003_part3_research_memory_automation.sql`

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Supabase (Auth, Database, Storage)
- Vercel AI SDK

## Validation

```bash
npm run lint
npm run test
npm run build
```
