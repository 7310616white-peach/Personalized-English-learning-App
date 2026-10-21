# Engineering guide

This is a local-first personal Android English-learning app with a browser MVP.
Read README.md and docs/ARCHITECTURE.md before modifying behavior.

- Keep app composition, feature UI, pure domain rules, persistence, and platform adapters separate.
- Keep maintained source readable; use Prettier with a 100-column target.
- Use focused components and hooks. Avoid speculative frameworks, backend services, or AI calls.
- Database writes must preserve answer history and transaction boundaries.
- Never reset, rename, or delete the learning database as a routine fix.
- Validate imported files before any writes. Version schemas and preserve backup compatibility.
- Report storage failures honestly. Do not advance the exercise before successful commit.
- Use original/synthetic fixtures. Exclude personal data, backups, secrets, and signing keys from Git.
- Run relevant tests, build, and formatting checks. Distinguish browser checks from Android verification.
- Do not claim an APK exists until an actual build succeeds. Do not claim CI success without its result.
