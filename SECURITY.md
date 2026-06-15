# Security Policy

## Supported Versions

We currently provide security updates for the latest stable release.

| Version | Supported          |
| ------- | ------------------ |
| 0.2.x   | ✅ Supported       |
| < 0.2   | ❌ Not supported   |

## Reporting a Vulnerability

OpenScrabble is a local-first browser game with no server component, no accounts, and no data transmission. However, if you discover a security vulnerability:

1. **Do not** open a public issue.
2. Email the maintainer directly or open a [security advisory](https://github.com/sparshsam/openscrabble/security/advisories/new).
3. Include a description of the vulnerability and steps to reproduce.

You should receive a response within 48 hours. If the vulnerability is confirmed, we will:

- Work on a fix
- Release a patched version
- Acknowledge your contribution (with your consent)

## Scope

Since OpenScrabble runs entirely in the browser with no backend, the primary security concerns are:

- **Supply chain** — dependencies from npm. We keep them minimal and updated.
- **XSS** — the app renders no user-generated content.
- **Local storage** — game state is stored locally; no sensitive data is involved.
