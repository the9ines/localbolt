# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-02-18

### Added
- Dual signaling: connects to both LAN and cloud signal servers simultaneously
- Cross-network file transfer via cloud signaling server
- Apple touch icon for iOS home screen
- One-command install scripts for Mac, Linux, and Windows (`start.sh`, `start.bat`)
- Header hover state matching website design

### Architecture
- Rust WebSocket signaling server with IP-based peer grouping
- TweetNaCl end-to-end encryption (Curve25519 + XSalsa20-Poly1305)
- WebRTC data channels for direct peer-to-peer file transfer
- 16KB chunked transfer with backpressure handling

### Security
- End-to-end encryption with per-chunk random nonces
- Session-only key pairs (never stored)
- No file data passes through any server
- Same-network policy enforcement for local connections
