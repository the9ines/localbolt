# LocalBolt — Product Requirements Document

**Version:** 1.0.0
**Date:** 2026-02-20

---

## 1. Current State Summary

**Version:** v1.0.0 (production, released 2026-02-18)
**Stack:** Vanilla TypeScript, Tailwind CSS, Vite, TweetNaCl, Rust signal server
**Test coverage:** 91% (web), signal protocol tests (Rust)
**Deployment:** Self-hosted (user runs `./start.sh`)

### Implemented and Working

- End-to-end encryption (NaCl box, per-chunk random nonce, SAS verification)
- WebRTC P2P file transfer (16KB chunks, backpressure, pause/resume/cancel)
- Dual signaling (LAN on port 3001 + cloud at localbolt-signal.fly.dev)
- IP-based peer discovery with CGNAT/Tailscale support
- Drag-and-drop file upload, progress tracking with speed/ETA
- Security hardening (CSP, XSS prevention, peer validation, relay blocking)
- CI/CD (GitHub Actions, pinned SHAs, Dependabot, OpenSSF Best Practices)
- Cross-platform startup scripts (start.sh, start.bat)
- 91% test coverage across 10 test files

### Partially Implemented

- Error handling: typed errors exist but limited retry/backoff logic
- Platform detection: device type heuristics work but are browser-only

### Missing

- File resume on interrupted transfer
- Directory transfer (single files only)
- Compression (files sent uncompressed)
- Bandwidth throttling
- Persistent identity keys (session-only by design)

### Legacy Debt

- None. Codebase is fresh, well-structured, post-v1.0.0.

### Production-Ready

- Core transfer pipeline
- Encryption
- Signaling
- CI/CD
- Documentation

---

## 2. Target State (12-Month Horizon)

LocalBolt becomes the reference self-hosted deployment for the Bolt ecosystem:

1. Consumes bolt-core-sdk instead of inline TweetNaCl
2. Signal server consumed via bolt-rendezvous subtree (formalized)
3. Directory transfer support
4. Improved transfer resilience (retry, partial resume)
5. Docker image for one-command deployment
6. Maintained at 90%+ test coverage

---

## 3. Gap Analysis

| Capability | Current | Target | Gap |
|-----------|---------|--------|-----|
| Encryption source | Inline TweetNaCl | bolt-core-sdk | SDK not yet published |
| Signal server | Subtree (formalized) | Subtree from bolt-rendezvous | PR #10 pending merge |
| Directory transfer | No | Yes | Feature implementation |
| Transfer resume | No | Partial (checkpoint) | Feature implementation |
| Docker deployment | No | Yes | Dockerfile + compose |
| Test coverage | 91% | 90%+ maintained | CI enforcement |

---

## 4. Non-Goals

1. **Not a hosted service.** LocalBolt is self-hosted. localbolt.site is localbolt-v3.
2. **No accounts or authentication.** Zero-knowledge, no user data.
3. **No relay/TURN support.** Local-only by design. Global is ByteBolt.
4. **No mobile app.** Native apps are localbolt-app.
5. **No analytics or telemetry.** Privacy-first.

---

## 5. Technical Constraints

- Must work fully offline (LAN only, no internet required)
- Must start with a single command (`./start.sh` or `start.bat`)
- Must not require Docker (though Docker is an optional deployment)
- Frontend must remain vanilla TypeScript (no framework)
- Signal server must remain Rust
- Must not add runtime dependencies beyond TweetNaCl (until SDK migration)

---

## 6. Dependency Requirements

| Dependency | Status | Required For |
|-----------|--------|-------------|
| bolt-core-sdk (TypeScript) | Not published | SDK migration |
| bolt-rendezvous | Subtree formalized | Signal server updates |
| bolt-daemon | Not applicable | — |
| bytebolt-relay | Not applicable | — |

---

## 7. Release Milestones

| Milestone | Version | Description |
|-----------|---------|-------------|
| Subtree merge | localbolt-v2.0.1 | Merge PR #10 (subtree formalization) |
| SDK migration | localbolt-v2.1.0 | Replace inline TweetNaCl with bolt-core-sdk |
| Docker image | localbolt-v2.2.0 | Add Dockerfile and docker-compose |
| Directory transfer | localbolt-v2.3.0 | Recursive directory send/receive |
| Transfer resilience | localbolt-v2.4.0 | Retry logic, partial resume |

---

## 8. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|:---:|:---:|-----------|
| SDK not published in time | Medium | High | Can ship without SDK; migrate later |
| Breaking subtree update | Low | Medium | Diff review before subtree pull |
| Test coverage regression | Low | Medium | CI coverage threshold enforcement |
| WebRTC API changes | Low | High | Pin browser compatibility targets |

---

## 9. Success Metrics

- Self-hosted deployment works in under 60 seconds on fresh machine
- Zero-configuration LAN discovery succeeds on first try
- Transfer speed reaches 80%+ of theoretical LAN bandwidth
- Test coverage stays above 90%
- Zero critical security vulnerabilities (OpenSSF badge maintained)
