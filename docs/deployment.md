# Deployment

Deploy the Next.js app to Vercel and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `ENCRYPTION_KEY`, and `NEXT_PUBLIC_APP_URL` in Vercel’s encrypted environment variables. Apply all SQL migrations in Supabase before deployment. Configure Supabase Auth redirect URLs for the production domain. Never commit `.env.local`.

Run `npm run build` before deploying. The PWA service worker caches only static shell assets; AI and authenticated API calls require connectivity.
