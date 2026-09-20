# Security Policy

Ledger reads local Codex telemetry, so local-data safety is part of the product design.

## Report a vulnerability

Please avoid posting secrets, raw Codex rollout files, prompt contents, authentication files, or other private user data in a public issue.

For a security-sensitive report, contact the maintainer through the security reporting channel available on the GitHub repository. Include the smallest possible reproduction and use synthetic data whenever possible.

## Data handling expectations

Ledger v0.1 is designed to:

- process Codex telemetry locally;
- avoid a Ledger account or cloud backend;
- send no Ledger telemetry;
- exclude prompt bodies, assistant/tool output, secrets, repository contents, and full local paths from generated report payloads;
- retain only the local metadata needed for useful attribution, including session titles and project-folder basenames.

A generated report remains a local file unless the user explicitly shares it.
