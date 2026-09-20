# Contributing to Ledger

Thanks for helping make Codex usage easier to understand.

## Principles

- Keep Ledger free, open source, and local-first.
- Never add telemetry or upload local Codex data by default.
- Do not include raw private rollout logs in issues, fixtures, screenshots, or PRs.
- Prefer small, reviewable changes over broad rewrites.
- Keep English and Simplified Chinese user-facing docs in sync when applicable.

## Development

Ledger intentionally has no application dependencies or build step.

```bash
python3 -m unittest discover -s tests -v
node --check app.js
python3 -m json.tool plugin.json >/dev/null
python3 -m json.tool .codex-plugin/plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```

To generate a local report from your own Codex data:

```bash
python3 scripts/ledger.py --open
```

Do not commit the generated report.

## Parser changes

When the Codex local telemetry schema changes:

1. Add a **synthetic, sanitized** fixture or inline test record.
2. Update the parser without copying prompt bodies or full paths into output.
3. Verify that per-request `last_token_usage` is counted, not cumulative totals.
4. Document any coverage limitation.

## Documentation

If a PR changes installation, features, privacy behavior, Plugin packaging, or the public architecture, update both `README.md` and `README.zh-CN.md` when applicable.

## Pull requests

Keep each PR focused. Include what changed, why, how it was tested, and whether the change affects privacy or the local data contract.
