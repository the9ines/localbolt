# LocalBolt — Roadmap

**Date:** 2026-02-20

---

## Stability Work

### S1. Merge subtree formalization (PR #10)
- Merge the subtree-formalize branch
- Confirm signal/ tracks bolt-rendezvous upstream
- **Status:** PR open, awaiting merge

### S2. Maintain test coverage
- Enforce 90% minimum in CI
- Add integration test for dual signaling (local + cloud)
- Add test for transfer pause/resume/cancel flow

### S3. SDK migration
- Replace inline TweetNaCl with @the9ines/bolt-core
- Validate with conformance test vectors
- **Depends on:** bolt-core-sdk npm publish

---

## Infrastructure Work

### I1. Docker deployment
- Create Dockerfile (multi-stage: build signal + build web + serve)
- Create docker-compose.yml (signal + web)
- Document in README
- One-command: `docker compose up`

### I2. Subtree update procedure
- Document `git subtree pull --prefix=signal bolt-rendezvous main --squash`
- Add to CONTRIBUTING.md
- Verify after each bolt-rendezvous release

---

## Feature Work

### F1. Directory transfer
- Recursive directory read via File System API
- Flatten to file list with relative paths
- Reconstruct directory structure on receiver
- **Depends on:** S3 (SDK migration)

### F2. Transfer resilience
- Exponential backoff on WebRTC reconnection
- Chunk-level checkpoint for partial resume
- **Depends on:** S2 (test coverage for validation)

### F3. Compression
- Optional gzip before encryption
- Capability negotiation in HELLO
- Skip for already-compressed formats (zip, jpg, mp4)

---

## Execution Order

```
S1 (subtree merge)
  │
  ▼
S2 (test coverage) ──► F2 (transfer resilience)
  │
  ▼
S3 (SDK migration) ──► F1 (directory transfer)
  │                         │
  ▼                         ▼
I1 (Docker)            F3 (compression)
  │
  ▼
I2 (subtree docs)
```

---

## Critical Path

S1 → S2 → S3 → F1

All feature work is blocked by SDK migration (S3).
SDK migration is blocked by bolt-core-sdk publish.
