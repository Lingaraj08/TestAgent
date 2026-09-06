# Automation

Tasks are user-owned scheduled prompts managed on `/tasks`. Run-now creates a normal supervisor run. For production scheduling, invoke due enabled tasks through a protected Vercel Cron or Supabase Edge Function; disabled tasks must be excluded by that worker.
