# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in LocalBolt, please report it responsibly.

**Email:** security@the9ines.com

**What to include:**
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

**Response timeline:**
- Acknowledgment within 48 hours
- Initial assessment within 7 days
- Fix or mitigation within 14 days for critical issues

## Scope

This policy covers:
- The LocalBolt web application (`web/`)
- The Rust signaling server (`signal/`)
- Encryption and key exchange implementation
- WebRTC connection handling

## Encryption

LocalBolt uses TweetNaCl (NaCl box) for end-to-end encryption:
- Key exchange: Curve25519
- Encryption: XSalsa20-Poly1305
- Per-chunk random nonce (24 bytes)
- Keys are generated fresh per session and never stored

The signaling server only relays connection setup messages. File data flows directly between peers over encrypted WebRTC data channels and never passes through any server.

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest  | Yes       |

## Disclosure Policy

We follow coordinated disclosure. Please do not open public issues for security vulnerabilities. Use the email above instead.
