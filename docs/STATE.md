# State — localbolt

> Current project state. Maintained by docs-keeper agent.

---

## Latest Release

- **Tag:** localbolt-v1.0.38-impl1-multi-transport
- **Commit:** a6b88c2
- **Branch:** main
- **Date:** 2026-04-08
- **Tests:** 329 pass

## Product Role

`localbolt` is the lightweight self-hosted web version. `localbolt-v3` owns the
production web app at localbolt.app. `localbolt-app` owns native/mobile shells.
This repo should stay thin and self-hostable while consuming shared ecosystem
packages and contracts instead of forking protocol, transport security, or
session-state authority.

## Transport Architecture

| Transport | Class | Origin Requirement | Fallback |
|-----------|-------|--------------------|----------|
| Direct WS | BrowserAppTransport | HTTP / localhost | — |
| Secure Direct | WtDataTransport | HTTPS (WebTransport + cert-hash) | WebRTC |
| WebRTC | WebRTCService (via createFreshRtcService) | Any | — |

Selection order: Direct WS > Secure Direct > WebRTC fallback.

## Dependencies

| Package | Version | Registry |
|---------|---------|----------|
| @the9ines/bolt-core | 0.5.1 | npmjs.org |
| @the9ines/bolt-transport-web | 0.6.4 | npmjs.org |
| @the9ines/localbolt-core | 0.1.2 | npmjs.org |
| tweetnacl | ^1.0.3 |
| tweetnacl-util | ^0.15.1 |

## Guard Scripts — C6 + D5

| Script | Purpose |
|--------|---------|
| scripts/check-core-version-pin.sh | Verify localbolt-core version pin |
| scripts/check-core-single-install.sh | Verify single install in tree |
| scripts/check-core-drift.sh | Detect ad-hoc orchestration drift |
| scripts/upgrade-localbolt-core.sh | Upgrade tooling (check + upgrade modes) |
| scripts/check-registry-mapping.sh | Verify registry mapping consistency |
| scripts/check-lockfile-registry.sh | Verify lockfile registry entries |

## Dev Dependencies (notable)

| Package | Version |
|---------|---------|
| vitest | ^4.0.18 |
| @vitest/coverage-v8 | ^4.0.18 |
| jsdom | ^28.1.0 |

## Coverage Thresholds

| Metric | Threshold |
|--------|-----------|
| Lines | 80% |
| Functions | 80% |
| Branches | 70% |
| Statements | 80% |

## Stack

- TypeScript + Vite
- Tailwind CSS
- Vitest + jsdom (testing)
