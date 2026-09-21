# Changelog

All notable changes to Ledger are documented here.

## 0.2.0 — Session & Context Intelligence

### Added

- Per-session **Tokens / Turn** as a first-class metric, based on unique persisted Codex turn IDs when available.
- **Context Growth** analysis using observed per-turn input tokens as a transparent proxy: first-five-turn average vs last-five-turn average.
- Session health states — **Stable**, **Growing**, **Heavy**, and **Limited data** — derived from the user's own local distribution rather than an external benchmark.
- **Peak Turn** detection and a session context-growth chart in the detail drawer.
- Session Health summary plus a Context Growth watchlist for quickly finding sessions worth inspecting.
- Session-oriented insights for context growth and period-over-period Tokens / Turn changes.

### Improved

- Task details are now session-aware, with first/last input averages, observed span, context growth, peak turn, and transparent driver explanations.
- Consumption drivers now cover long sessions, high context growth, high tokens / turn, low cache reuse, output-heavy sessions, and unusually expensive turns.
- The local parser preserves sanitized `turnId` and `timestamp` metadata needed for turn-level analysis without copying prompt bodies or full local paths.
- Plugin prompts and Skill guidance now support questions such as “Why was this session expensive?” and “Which sessions have the fastest context growth?”.

### Notes

- Context Growth is **calculated from observed input-token history**. It is not the model's official context-window occupancy.
- Session health is a transparent local heuristic relative to the user's own usage; it is not a quality score or an instruction to restart a session.

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