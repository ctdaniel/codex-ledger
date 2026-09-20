<p align="center">
  <img src="./assets/hero.svg" alt="Ledger — local-first usage analytics for Codex" width="100%" />
</p>

<p align="center">
  <strong>English</strong> · <a href="./README.zh-CN.md"><strong>简体中文</strong></a>
</p>

<p align="center">
  <a href="./LICENSE"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-111827.svg"></a>
  <img alt="Open source" src="https://img.shields.io/badge/open%20source-free%20forever-111827.svg">
  <img alt="Local first" src="https://img.shields.io/badge/local--first-yes-0F766E.svg">
  <img alt="Telemetry" src="https://img.shields.io/badge/telemetry-none-0F766E.svg">
  <img alt="Codex Plugin" src="https://img.shields.io/badge/Codex-Plugin-111827.svg">
  <img alt="Version" src="https://img.shields.io/badge/version-0.1.1-111827.svg">
</p>

# Know where your Codex usage goes.

**Ledger** is an open-source, local-first usage analytics dashboard for Codex. It turns the usage telemetry already persisted on your machine into a clear view of **tokens, projects, models, tasks, trends, cache efficiency, and observed quota windows**.

No Ledger account. No cloud backend. No telemetry.

> **Recommended:** install **Ledger for Codex** as a Plugin and ask Codex to open or analyze your local usage. Prefer a plain script? Clone the repo and run one Python command.

---

## See it in 30 seconds

| Question | Ledger shows you |
|---|---|
| How much have I used? | Total observable tokens + period comparison |
| Am I consuming too fast? | Burn rate + observed quota-window pacing |
| Where did it go? | Project, model, and model × project breakdowns |
| Which tasks are expensive? | Top tasks, tokens / turn, cache hit, task drivers |
| What changed? | Previous-period deltas + rule-based usage insights |
| Is the data leaving my machine? | No. Parsing and reports are local by default |

<p align="center">
  <img src="./assets/dashboard.jpg" alt="Ledger dashboard with synthetic demo data" width="100%" />
</p>

<sub>The screenshot uses synthetic demo data. Ledger does not ship anyone's real usage history.</sub>

---

## Why Ledger?

Codex can do a lot of work, but the raw usage trail is hard to reason about at a glance.

| Without Ledger | With Ledger |
|---|---|
| “Where did my usage go?” | Project and model attribution |
| “Why was this session so large?” | Task-level token composition and drivers |
| “Is today unusual?” | Burn rate, outliers, and previous-period comparison |
| “Did cache help?” | Cache hit and cached / uncached input breakdown |
| “How much quota is left?” | Observed 5-hour / weekly snapshots when Codex persisted them |

Ledger does **not** invent an account quota from token totals. If Codex did not persist a rate-limit snapshot, the quota cards say it is unavailable.

---

## What Ledger shows you

<table>
<tr>
<td width="50%" valign="top">

### Understand your usage

- observable token totals
- burn rate
- tokens per task
- cache hit rate
- previous-period comparison

</td>
<td width="50%" valign="top">

### See where it goes

- project breakdown
- model breakdown
- model × project matrix
- token timeline
- token composition

</td>
</tr>
<tr>
<td width="50%" valign="top">

### Find expensive tasks

- top expensive tasks
- task efficiency map
- tokens / turn
- task detail drawer
- transparent consumption drivers

</td>
<td width="50%" valign="top">

### Spot changes

- rule-based usage insights
- period-over-period deltas
- task outliers
- observed quota pacing when available

</td>
</tr>
</table>

---

## Install as a Codex Plugin · recommended

Ledger is packaged as a portable Agent Plugin with a bundled `ledger-analysis` Skill. No MCP server or external account is required in v0.1.

### 1. Add the GitHub marketplace

```bash
codex plugin marketplace add ctdaniel/codex-ledger
```

### 2. Install **Ledger for Codex**

Open the Plugin directory in **ChatGPT desktop** or **Codex CLI**, choose the **Ledger for Codex** marketplace, and install **Ledger for Codex**. In Codex CLI, use `/plugins` to open the plugin browser.

Start a new session after installation if the new Skill does not appear immediately. The Codex IDE extension does not currently provide the plugin browser, so use ChatGPT desktop or Codex CLI for installation.

### 3. Ask Codex

```text
Open my Codex usage dashboard.
```

```text
Analyze my Codex usage for the last 7 days.
```

```text
Show me my 5 most expensive Codex tasks.
```

The bundled Skill runs the local parser, starts the private local dashboard, and can analyze the **sanitized normalized payload** without dumping raw rollout logs into the conversation.

> Plugin installation behavior can vary by supported client. The marketplace command and package format follow the current [OpenAI Plugin documentation](https://developers.openai.com/plugins/build/plugins). The direct local method below remains available even when a client does not expose Plugins.

---

## Run locally

Ledger has **no npm dependencies and no build step**. Python 3 parses your local Codex session telemetry and serves the dashboard on `127.0.0.1`. With `--open`, the **Refresh data** button rescans `~/.codex` immediately — no model call and no Codex quota is used for the refresh itself.

```bash
git clone https://github.com/ctdaniel/codex-ledger.git
cd codex-ledger
python3 scripts/ledger.py --open
```

With `--open`, Ledger:

1. reads `$CODEX_HOME` or `~/.codex`,
2. scans the most recent 90 days of persisted sessions,
3. keeps only normalized usage metadata,
4. writes the report to `~/.codex/ledger/latest/`,
5. starts a local-only HTTP server on `127.0.0.1`,
6. opens the dashboard in your browser,
7. rescans local Codex telemetry whenever you click **Refresh data**.

Keep the terminal process running while you use live refresh. Press `Ctrl+C` to stop it. If you open the generated `index.html` directly with `file://`, it is a static snapshot and cannot rescan local files from the browser sandbox.

Useful options:

```bash
# Parse all discoverable persisted sessions
python3 scripts/ledger.py --days 0 --open

# Write to a different local directory
python3 scripts/ledger.py --output ./ledger-report --open

# Serve without opening a browser
python3 scripts/ledger.py --serve

# Print the sanitized normalized payload instead of generating a report
python3 scripts/ledger.py --json
```

Want to inspect the interface without reading Codex data? Open the repository's `index.html`; it uses deterministic synthetic demo fixtures.

---

## Using Ledger

### Dashboard

Use **Today / Last 7 days / Last 30 days / Custom** and filter by project, task, or model. All derived cards, charts, insights, rankings, and task details recalculate from the same filtered dataset.

Ledger distinguishes three kinds of information:

- **Observed** — directly present in locally persisted Codex telemetry.
- **Calculated** — derived locally from observed records.
- **Estimated** — a forecast or rate-weighted heuristic; never presented as official billing or quota data.

### From Codex

With the Plugin installed, try:

```text
Which project consumed the most in the last 30 days?
```

```text
Which tasks had unusually high tokens per turn?
```

```text
Did my cache hit rate improve versus the previous period?
```

```text
Do I have an observed quota snapshot right now?
```

---

## How it works

<p align="center">
  <img src="./assets/how-it-works.svg" alt="Codex local data flows through the Ledger parser into normalized local analytics and the dashboard / plugin" width="96%" />
</p>

The parser currently reads Codex's persisted local rollout JSONL on a **best-effort** basis. It uses per-request `last_token_usage` events; it deliberately does **not** sum cumulative `total_token_usage` snapshots, which would overcount the same usage repeatedly.

For project attribution, Ledger keeps only the final directory name from `cwd`. The local report may also include the persisted session/thread title so you can identify tasks.

---

## Privacy

### Your usage data should stay yours.

Ledger is local-first by design.

- ✅ no Ledger account
- ✅ no cloud backend required
- ✅ no telemetry
- ✅ no prompt-body upload
- ✅ no assistant/tool-output upload
- ✅ no code or repository-content upload
- ✅ no API key or auth-file collection
- ✅ full local paths are stripped from the generated report

The generated local dashboard **can contain session titles and project-folder basenames** because those are needed for useful attribution. They remain on your machine unless you explicitly share the generated report or a screenshot.

The repository's demo data is synthetic. Files matching local report / snapshot patterns are ignored by Git.

---

## Data coverage & limitations

Ledger v0.1.1 intentionally avoids pretending that local telemetry is a formal billing API.

- Codex's persisted local session format can evolve; the parser is best-effort and covered by fixtures/tests.
- Sessions without persisted `last_token_usage` events cannot contribute token records.
- Quota cards are shown only when a persisted `rate_limits` snapshot is observed.
- Ledger never converts token totals into an invented 5-hour or weekly quota percentage.
- Generation speed appears only when usable duration telemetry is present.
- Model rate-weighted intensity appears only for models with a known built-in mapping; otherwise it is left unavailable.

If Codex changes its local telemetry format, please open an issue with a **sanitized schema sample**, never a raw session containing private content.

---

## Plugin package

Ledger's repository root is also its portable Agent Plugin package:

```text
codex-ledger/
├── plugin.json                       # Agent Plugins 1.0 portable manifest
├── .codex-plugin/plugin.json         # Codex compatibility fallback
├── skills/
│   └── ledger-analysis/
│       ├── SKILL.md
│       └── references/
├── scripts/
│   └── ledger.py                     # local, dependency-free parser
├── .agents/plugins/marketplace.json  # GitHub marketplace catalog
├── index.html
├── app.css
├── app.js
└── assets/
```

The Plugin is intentionally Skill-first in v0.1.1. A local MCP server is **not required** just to read files already available on your machine and render the dashboard.

---

## Development

Run the checks:

```bash
python3 -m unittest discover -s tests -v
node --check app.js
python3 -m json.tool plugin.json >/dev/null
python3 -m json.tool .agents/plugins/marketplace.json >/dev/null
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines and [docs/DESIGN.md](./docs/DESIGN.md) for the current interface notes.

---

## Roadmap

### Available in v0.1.1

- [x] local Codex token parser
- [x] project / model / task attribution
- [x] burn rate, cache and period comparison
- [x] top expensive tasks + task drivers
- [x] observed quota snapshots when persisted locally
- [x] bilingual dashboard
- [x] Codex Plugin + Ledger Analysis Skill
- [x] GitHub marketplace packaging
- [x] live local refresh from the dashboard (`--open` / `--serve`)

### Planned

- [ ] deeper session / context health
- [ ] richer parser coverage diagnostics
- [ ] exportable privacy-safe reports
- [ ] optional local MCP interface if it materially improves the workflow
- [ ] additional AI coding-agent adapters
- [ ] stronger anomaly detection

No dates promised — contributions are welcome.

---

## Why open source?

**Usage visibility should not be a paid feature.**

Ledger is free and open so anyone can inspect exactly what is parsed, how metrics are calculated, and what stays local. If the underlying Codex format changes, the community can fix the adapter without waiting for a black box service.

---

## License

MIT © 2026 Daniel Chen and contributors.

If Ledger makes your Codex usage easier to understand, a ⭐ helps more people find it.
