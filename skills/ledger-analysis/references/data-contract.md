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
      "date": "YYYY-MM-DD",
      "time": "HH:MM",
      "taskId": "session-id",
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
