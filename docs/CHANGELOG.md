# Changelog — localbolt

All notable changes to this project are documented here. Newest first.

---

## localbolt-v1.0.17 — 2026-02-24

**Commit:** cd00d32

Remove hardcoded `wss://localbolt-signal.fly.dev` fallback from
peer-connection.ts (SIG-3). Cloud signaling URL (`VITE_CLOUD_SIGNAL_URL`)
now required via explicit configuration — if unset, cloud signaling is
disabled with console warning and app operates in local-only mode. Local
signaling fallback (`ws://<hostname>:3001`) preserved. 272/272 tests pass.

- Files changed:
  - `web/src/components/peer-connection.ts`

## localbolt-v1.0.16 — 2026-02-24

**Commit:** 91a0f29

Bump @the9ines/bolt-core from 0.3.0 to 0.4.0 (A1 adoption). Dead constant
exports removed upstream; no behavior changes. transport-web remains 0.6.0.
272/272 tests pass. Build clean.

- Files changed:
  - `web/package.json`
  - `web/package-lock.json`

## localbolt-v1.0.15 — 2026-02-24

**Commit:** f9c6f09

SDK dependency upgrade. Bumped @the9ines/bolt-core from 0.2.0 to 0.3.0 and
@the9ines/bolt-transport-web from 0.3.0 to 0.6.0. Switched from file:
references to pinned registry versions on npm.pkg.github.com. 272/272 tests
pass. Build clean.

- Files changed:
  - `web/package.json`
  - `web/package-lock.json`

## localbolt-v1.0.14

- **Date:** 2026-02-23
- **Commit:** 9b28892
- **Summary:** Add app-level tests and enforce coverage thresholds (Phase 7C.2R). Introduces jsdom-based test suites for `createApp`, `main.ts`, `createPeerConnection`, `createHeader`, and `createFooter`. Covers signaling events, WebRTC state transitions, connection approval protocol, file receive, and UI interactions. Vitest coverage thresholds set to 80% lines/functions/statements and 70% branches. Bumps bolt-transport-web from 0.2.0 to 0.3.0.
- **Files changed:**
  - `web/package.json` — bump bolt-transport-web to 0.3.0, add jsdom devDependency
  - `web/package-lock.json` — lockfile regenerated
  - `web/vite.config.ts` — add coverage thresholds (lines 80, functions 80, branches 70, statements 80)
  - `web/src/__tests__/app.test.ts` — new: app + main entry point tests (90 lines)
  - `web/src/components/__tests__/peer-connection.test.ts` — new: peer-connection tests (362 lines)
  - `web/src/sections/__tests__/sections.test.ts` — new: header + footer section tests (87 lines)

---

## localbolt-v1.0.13

- **Date:** 2026-02-23
- **Commit:** dc7875a
- **Summary:** Bump bolt-core to 0.2.0 and bolt-transport-web to 0.2.0 (picks up encrypted HELLO + TOFU identity pinning from Phase 7A).
- **Files changed:** web/package.json
