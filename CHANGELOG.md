# Changelog

All notable changes to Ledger are documented here.

## 0.1.1 — Live refresh fix

### Fixed

- `python3 scripts/ledger.py --open` now starts a local-only live server instead of opening a frozen file snapshot.
- **Refresh data** now rescans current local Codex telemetry and rewrites the local report before reloading the dashboard.
- Live Today / 7-day / 30-day ranges anchor to the current local date.
- Demo and static-snapshot refresh states now explain their limitations instead of pretending to refresh local logs.

### Added

- `--serve`, `--host`, and `--port` options for the dependency-free local server.
- No-cache headers for live Ledger assets and refresh responses.

## 0.1.0 — Initial public release

### Added

- Local, dependency-free Codex session parser.
- Token totals, burn rate, cache analytics, and period comparison.
- Project, model, and task attribution.
- Top expensive tasks, task detail, outlier analysis, and rule-based usage insights.
- Observed 5-hour / weekly rate-limit snapshots when present in local persisted telemetry.
- English / Chinese dashboard UI.
- Portable Agent Plugin manifest and Codex compatibility manifest.
- `ledger-analysis` Skill for local dashboard generation and usage analysis.
- GitHub Plugin Marketplace metadata.
- English and Simplified Chinese open-source documentation.
