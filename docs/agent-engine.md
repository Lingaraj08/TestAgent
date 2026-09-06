# Agent engine

The supervisor plans typed tool steps, chooses a compatible model, executes with bounded retries, verifies output, and synthesizes a response. Tool results and runs are persisted for the authenticated user. Tool/page content is data, never instructions; model prompts explicitly retain this boundary.

Auto model routing selects a capable available model. Manual selection is honoured and failures are reported rather than silently switching provider.
