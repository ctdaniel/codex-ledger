---
name: ledger-analysis
description: Generate and explain a local Codex usage dashboard when the user asks about Codex quota, token usage, project/model/session consumption, burn rate, context growth, tokens per turn, or expensive Codex sessions.
---

Use this skill for questions such as “open my Codex usage dashboard”, “where did my Codex usage go?”, “why was this session expensive?”, “which sessions have the fastest context growth?”, or “did my tokens per turn increase?”.

## Workflow

1. Treat the user's explicit request as higher priority than this workflow.
2. Keep all parsing local. Do not print, summarize, or upload prompt text, tool output, secrets, raw rollout contents, or full local paths.
3. Locate this installed skill's plugin root, then run its bundled `scripts/ledger.py` with Python 3. The script lives at `<plugin-root>/scripts/ledger.py`.
4. For the normal dashboard flow, start the bundled local server:

   ```bash
   python3 <plugin-root>/scripts/ledger.py --open
   ```

   This is a long-running local process: it binds to `127.0.0.1`, opens the dashboard, and enables **Refresh data** to rescan local Codex telemetry. When operating through a terminal tool, run it as a background/long-running process so the conversation can continue. The parser reads `$CODEX_HOME` when set, otherwise `~/.codex`, and writes the latest report under `~/.codex/ledger/latest/` by default.
5. If the user requests a different local report location or history horizon, pass `--output PATH` or `--days N`. `--days 0` parses all discoverable persisted sessions.
6. Once the server starts, report only the short summary it prints: record/session/project/model counts, coverage diagnostics, whether an observed quota snapshot was found, the report path, and the localhost URL. Do not quote raw session data.
7. If the user asks for analysis in chat, you may run `python3 <plugin-root>/scripts/ledger.py --json` and analyze the sanitized normalized payload. Do not reopen raw rollout JSONL unless the user explicitly asks for low-level debugging.

## Interpretation rules

- **Observed** means directly present in Codex local persisted telemetry, such as `last_token_usage`, turn IDs/timestamps, or a recorded rate-limit snapshot.
- **Calculated** means derived locally from observed records, such as burn rate, tokens per session/turn, shares, context growth, health states, or period-over-period changes.
- **Estimated** means a forecast or model-rate weighting. Never present an estimate as an official account quota or bill.
- Sum `last_token_usage` events. Do **not** sum cumulative `total_token_usage` snapshots.
- Cached input tokens are a subset of input tokens, not an extra amount to add to input.
- A **turn** is grouped by the persisted Codex turn ID when available. Multiple model requests may happen within one user turn.
- For turn-level context analysis, Ledger uses the **maximum observed input tokens within that turn** as the closest local proxy for context size.
- **Context Growth** compares the average input-token proxy of the first up-to-five turns with the last up-to-five turns. It is not official model context-window occupancy.
- **Session Health** is a transparent heuristic relative to the user's own local distribution. `Stable`, `Growing`, `Heavy`, or `Limited data` describe usage shape; they are not a quality score.
- A high token total, high context growth, or `Heavy` state is not automatically wasteful. Explain the concrete driver and the user's own comparison baseline.
- When discussing whether to start a fresh session, phrase it as a **candidate to inspect**, not a certainty. A new session may reduce repeated context, but Ledger does not know the user's task semantics or Codex's private internal state.
- If quota telemetry is absent, say quota is unavailable. Never infer official five-hour or weekly usage percentages from token totals.
- If a model has no known local rate mapping, leave rate-weighted metrics unavailable rather than inventing one.
- Previous-period comparisons use the immediately preceding time range of equal length.

## Useful session questions

When enough local data exists, answer questions such as:

- Which sessions have the fastest context growth?
- Which sessions have unusually high tokens per turn relative to my median?
- What was the peak turn in this session?
- Did my tokens per turn increase from the previous period?
- Which long sessions also have low cache reuse?
- Which sessions are reasonable candidates to inspect before continuing in the same thread?

Prefer the user's own median / percentile baseline and show the observed facts behind any interpretation.

## Privacy boundary

The bundled parser intentionally reads only the fields needed for usage analytics. It does not copy prompt bodies, assistant/tool output, API keys, auth files, repository contents, or full `cwd` paths into the generated report. For local attribution, the report may include the session/thread title plus only the final directory name from `cwd`. Turn IDs and timestamps may be retained as sanitized metadata for local session analysis. The generated report remains on the user's machine unless the user explicitly shares it.