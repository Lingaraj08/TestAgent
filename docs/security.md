# Security

Provider credentials are AES-256-GCM encrypted at rest and never returned to clients. Supabase RLS scopes user records, including storage, memory, approvals, tasks, logs, and files. API routes re-check authentication and ownership. Uploads have MIME and 20 MB limits; downloads authorize against the file record, not user-supplied paths. Lightweight per-instance rate limiting prevents accidental bursts. Do not log secrets or raw credentials.
