# Memory

Memory is user-scoped by RLS and queried only for the current request. Durable preference/knowledge signals may be stored; arbitrary chat text is not automatically retained. Users can inspect and forget records on `/memory`. The schema is pgvector-ready; embedding generation is a future provider-independent enhancement.
