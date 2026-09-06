# Troubleshooting

- **No model available:** add a provider, test its connection, and ensure it is enabled.
- **Provider error:** verify endpoint/model availability and key; 401, 404, timeout, and rate-limit errors are shown without exposing secrets.
- **File unavailable:** verify the storage migration and that the file belongs to the signed-in user.
- **Task does not run on schedule:** deploy a Vercel Cron or Supabase worker; Run now remains available in the UI.
- **Offline:** shell assets and drafts are available, but AI, cloud files, and provider actions require a connection.
