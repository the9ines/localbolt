# Changelog — localbolt

All notable changes to this project are documented here. Newest first.

---

## localbolt-v1.0.27-s-stream-r1-r1.4-security-test-lift — 2026-03-06

**Commit:** fc360c5

R1-4 security-focused product test lift — 19 security-session-integrity tests
covering stale callback rejection, trust transition isolation, transfer gating
under reconnect edges, and no-downgrade guarantees. Baseline 300 → 319 tests.

**Files changed:**
- web/src/components/__tests__/security-session-integrity.test.ts (new, 378 lines)

---

## localbolt-v1.0.26-d5-registry-guards — 2026-03-06

**Commit:** 76ae224

D5: registry/auth regression guards and CI cleanup removing GitHub Packages
auth. Two new guard scripts verify registry mapping and lockfile registry
consistency. CI workflow cleaned of GitHub Packages auth (registry-url,
NODE_AUTH_TOKEN, packages:read permission).

**Files changed:**
- scripts/check-registry-mapping.sh (new)
- scripts/check-lockfile-registry.sh (new)
- .github/workflows/ci.yml

---

## localbolt-v1.0.25-d4-npmjs-cutover — 2026-03-05

**Commit:** 9bb3c38

D4: switch consumer resolution from GitHub Packages to npmjs.org.
PAT no longer required for public package installs.
`.npmrc` updated, deps bumped (bolt-core 0.5.1, transport-web 0.6.4,
localbolt-core 0.1.2), lockfile regenerated from registry.npmjs.org.
300 tests pass, build succeeds.

**Files changed:**
- web/.npmrc
- web/package-lock.json
- web/package.json

---

## localbolt-v1.0.24-c6-hardening — 2026-03-05

**Commit:** c88ec5b

Add localbolt-core upgrade tooling (C6 hardening). upgrade-localbolt-core.sh
with check mode (validates pin, lockfile, single install) and upgrade mode
(bumps pin, reinstalls, runs build+test gates). Completes C6 deferred scope.

**Files changed:**
- scripts/upgrade-localbolt-core.sh (new)

---

## localbolt-v1.0.23-c7-tofu-wiring — 2026-03-05

**Commit:** 1bcb7b8

Wire identity and TOFU verification flow (Batch 4A) and enforce core
guard scripts in CI (Batch 4B).

**4A — Identity/TOFU wiring (aa22a46):**
- Identity keypair persistence via IndexedDBIdentityStore + initIdentity()
- TOFU pinning wired through localbolt-core onVerificationState callback
- Generation-guarded stale callback rejection across disconnect/reconnect
- Mismatch fail-closed with security toast
- Verification states (unverified, verified) now reachable from UI
- 27 new TOFU tests (tofu-verification.test.ts): identity persistence,
  verification state bus, transfer gating, accept/reject, mismatch,
  legacy peers, generation guard race hardening
- 300 tests pass. Clean build.

**4B — CI guard wiring (1bcb7b8):**
- Core version pin guard (before npm ci)
- Core single-install guard (after npm ci)
- Core drift guard (after build)
- Mirrors transport guard placement in CI workflow

No SDK or subtree edits.

**Files changed:**
- web/src/services/identity.ts (new)
- web/src/components/peer-connection.ts
- web/src/components/__tests__/tofu-verification.test.ts (new)
- web/src/components/__tests__/peer-connection.test.ts
- web/src/__tests__/app.test.ts
- web/vite.config.ts
- .github/workflows/ci.yml

---

## localbolt-v1.0.22-c6-core-guards — 2026-03-05

**Commit:** ed2d671

Add C6 enforcement guards for @the9ines/localbolt-core (version pin,
single-install, drift). Three shell scripts verify the pinned version,
single instance in tree, and no ad-hoc orchestration drift.

**Files changed:**
- scripts/check-core-version-pin.sh
- scripts/check-core-single-install.sh
- scripts/check-core-drift.sh

---

## localbolt-v1.0.21-c4-localbolt-core — 2026-03-05

**Commit:** ca46049

Migrate to @the9ines/localbolt-core orchestration (C4). Replace ad-hoc store
transitions with session phase guards, generation-guarded callbacks, canonical
resetSession(), and isTransferAllowed() policy. Deps: bolt-core 0.5.0,
bolt-transport-web 0.6.2, localbolt-core 0.1.0. Identity wiring not connected
(legacy mode). 273 tests pass.

**Files changed:**
- web/package.json
- web/package-lock.json
- web/src/components/peer-connection.ts
- web/src/sections/transfer.ts
- web/src/components/__tests__/peer-connection.test.ts
- web/src/__tests__/app.test.ts

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
