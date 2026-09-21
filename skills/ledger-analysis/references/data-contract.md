# Ledger normalized data contract

The dashboard consumes `window.__LEDGER_DATA__` with this shape:

```json
{
  "meta": {
    "generatedAt": "ISO-8601 timestamp",
    "observedAt": "ISO-8601 timestamp",
    "source": "codex-local-session-jsonl",
    "coverage": {}
  },
  "quota": {
    "observedAt": "ISO-8601 timestamp",
    "five": {"used": 42, "resetsAt": "ISO-8601 timestamp", "source": "live"},
    "week": {"used": 18, "resetsAt": "ISO-8601 timestamp", "source": "live"}
  },
  "records": [
    {
      "id": "stable-local-id",
      "timestamp": "ISO-8601 timestamp",
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "taskId": "session-id",
      "turnId": "persisted-turn-id-or-local-fallback",
      "task": "local thread title or anonymized fallback",
      "project": "cwd basename only",
      "model": "model identifier",
      "input": 0,
      "cached": 0,
      "output": 0,
      "reasoning": 0,
      "total": 0,
      "durationSeconds": 0,
      "speedOutput": 0
    }
  ]
}
```

`quota` is nullable. Missing quota must remain unavailable rather than being inferred from local token totals.

## v0.2 session semantics

- `taskId` is the local Codex session/thread identifier used by Ledger for session aggregation.
- `turnId` groups model requests that belong to the same persisted user turn when Codex provides that identifier.
- A turn may contain multiple model requests. Ledger sums total usage across those requests, but uses the maximum observed `input` value in that turn as the local proxy for context size.
- Context Growth is calculated from first/last turn input-token averages; it is not an official context-window measurement.
- No prompt bodies, assistant/tool output, repository contents, or full local paths belong in this contract.