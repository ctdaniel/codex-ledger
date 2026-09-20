# Changelog

All notable changes to Ledger are documented here.

## 0.1.3 — Project distribution cleanup

### Fixed

- Project distribution now shows only projects with usage in the current filtered period, removing zero-token rows that made the card unnecessarily tall.
- Project count now matches the rows actually shown in the distribution.
- Positive project shares below 0.1% display as `<0.1%` instead of the misleading `0.0%`.

## 0.1.2 — Dense-data readability

### Fixed

- Model × project no longer uses a hard-coded four-column grid, which caused model labels and project rows to wrap into the wrong visual positions when more models were present.
- Long project, task, and model labels now truncate consistently without breaking dashboard layout.

### Improved

- Model × project defaults to the six highest-usage projects and five highest-usage models, with a **Show all** view for the complete scrollable matrix.
- Full matrix mode uses sticky project/model headers and quieter empty cells.
- Matrix cells now drill down to the selected project + model intersection.
- Task efficiency tooltips are more readable and outlier labels stay inside the chart.
- Top expensive tasks and task details handle long names more cleanly.
- Task table density is improved, showing up to eight rows per page with responsive secondary columns.

## 0.1.1 — Live refresh fix

### Fixed

- `python3 scripts/ledger.py --open` now starts a local-only live server instead of opening a frozen file snapshot.
- **Refresh data** now rescans current local Codex telemetry and returns fresh records/quota observations.
- Rolling Today / 7-day / 30-day ranges re-anchor after refresh, including new same-day usage.
- Project, model, and task filters rebuild when refreshed data changes.
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