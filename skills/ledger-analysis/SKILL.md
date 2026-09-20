---
name: ledger-analysis
description: Generate and explain a local Codex usage dashboard when the user asks about Codex quota, token usage, project/model/task consumption, burn rate, or expensive Codex sessions.
---

Use this skill for questions such as “open my Codex usage dashboard”, “where did my Codex usage go?”, “which project/model/task used the most?”, or “analyze my recent Codex usage”.

## Workflow

1. Treat the user's explicit request as higher priority than this workflow.
2. Keep all parsing local. Do not print, summarize, or upload prompt text, tool output, secrets, raw rollout contents, or full local paths.
3. Locate this installed skill's plugin root, then run its bundled `scripts/ledger.py` with Python 3. The script lives at `<plugin-root>/scripts/ledger.py`.
4. For the normal dashboard flow, run:

   ```bash
   python3 <plugin-root>/scripts/ledger.py --open
   ```

   The parser reads `$CODEX_HOME` when set, otherwise `~/.codex`, and writes the latest report under `~/.codex/ledger/latest/` by default.
5. If the user requests a different local report location or history horizon, pass `--output PATH` or `--days N`. `--days 0` parses all discoverable persisted sessions.
6. After the script finishes, report only the short summary it prints: record/task/project/model counts, coverage diagnostics, whether an observed quota snapshot was found, and the report path. Do not quote raw session data.
7. If the user asks for analysis in chat, you may run `python3 <plugin-root>/scripts/ledger.py --json` and analyze the sanitized normalized payload. Do not reopen raw rollout JSONL unless the user explicitly asks for low-level debugging.

## Interpretation rules

- **Observed** means directly present in Codex local persisted telemetry, such as `last_token_usage` or a recorded rate-limit snapshot.
- **Calculated** means derived locally from observed records, such as burn rate, tokens per task, shares, or period-over-period changes.
- **Estimated** means a forecast or model-rate weighting. Never present an estimate as an official account quota or bill.
- Sum `last_token_usage` events. Do **not** sum cumulative `total_token_usage` snapshots.
- Cached input tokens are a subset of input tokens, not an extra amount to add to input.
- High token usage is not automatically wasteful or inefficient. Describe the concrete driver and comparison baseline.
- If quota telemetry is absent, say quota is unavailable. Never infer official five-hour or weekly usage percentages from token totals.
- If a model has no known local rate mapping, leave rate-weighted metrics unavailable rather than inventing one.
- Previous-period comparisons use the immediately preceding time range of equal length.

## Privacy boundary

The bundled parser intentionally reads only the fields needed for usage analytics. It does not copy prompt bodies, assistant/tool output, API keys, auth files, repository contents, or full `cwd` paths into the generated report. For local attribution, the report may include the session/thread title plus only the final directory name from `cwd`. The generated report remains on the user's machine unless the user explicitly shares it.
