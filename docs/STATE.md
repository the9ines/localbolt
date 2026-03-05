# State — localbolt

> Current project state. Maintained by docs-keeper agent.

---

## Latest Release

- **Tag:** localbolt-v1.0.22-c6-core-guards
- **Commit:** ed2d671
- **Branch:** main
- **Date:** 2026-03-05

## Dependencies

| Package | Version |
|---------|---------|
| @the9ines/bolt-core | 0.5.0 |
| @the9ines/bolt-transport-web | 0.6.2 |
| @the9ines/localbolt-core | 0.1.0 |
| tweetnacl | ^1.0.3 |
| tweetnacl-util | ^0.15.1 |

## C6 Guards

| Script | Purpose |
|--------|---------|
| scripts/check-core-version-pin.sh | Verify localbolt-core version pin |
| scripts/check-core-single-install.sh | Verify single install in tree |
| scripts/check-core-drift.sh | Detect ad-hoc orchestration drift |

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
