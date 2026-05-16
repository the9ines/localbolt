# LocalBolt

[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/9968/badge)](https://www.bestpractices.dev/projects/9968)
[![Mozilla Observatory](https://img.shields.io/mozilla-observatory/grade/localbolt.app?label=observatory)](https://developer.mozilla.org/en-US/observatory/analyze?host=localbolt.app)
[![Coverage Status](https://coveralls.io/repos/github/the9ines/localbolt/badge.svg?branch=main)](https://coveralls.io/github/the9ines/localbolt?branch=main)

**[localbolt.app](https://localbolt.app)** - use it now, no install needed.

Encrypted peer-to-peer file transfer. Files go directly between devices, never stored on any server.

- **End-to-end encrypted** with NaCl/Curve25519 (same crypto as Signal and WireGuard)
- **Direct transfer** - files never touch a server
- **No accounts** - no sign-up, no cloud, no trace
- **No file size limits** - limited only by your device storage
- **Cross-platform** - works in any modern browser
- **LAN discovery** - discovers nearby devices on your local network
- **Works offline** - self-host on your local network with no internet required

## Quick Start

```bash
git clone https://github.com/the9ines/localbolt.git
cd localbolt
./start.sh
```

That's it. The script installs any missing dependencies (Rust, Node.js), builds the signaling server, and starts everything.

Open `http://localhost:8080` on two devices. Devices discover each other automatically. Select one and start transferring.

**Windows:**

```
start.bat
```

> If Rust or Node.js aren't installed, the script will tell you where to get them.

## How It Works

1. **Open** LocalBolt on two devices on the same local network
2. **Select** the other device from the device list (it appears automatically)
3. **Transfer** files by drag-and-drop, encrypted, peer-to-peer, no size limits

The signaling server only helps devices find each other. Once connected, all data flows directly between devices over an encrypted WebRTC channel. The signaling server never sees your files.

### Local Discovery

LocalBolt is LAN-only. Its signaling server helps nearby devices on your local
network find each other. It does not provide cross-internet discovery or
remote-network transfer.

- **Same network**: Devices on your LAN discover each other automatically
- **Offline mode**: If there's no internet, LAN discovery still works

## Architecture

```
┌─────────┐     WebSocket      ┌──────────────────┐     WebSocket      ┌─────────┐
│ Device A │◄──────────────────►│  Signal Server   │◄──────────────────►│ Device B │
│ (browser)│   (discovery +     │  (Rust, port     │   (discovery +     │ (browser)│
│          │    connection       │   3001)          │    connection      │          │
│          │    setup only)      └──────────────────┘    setup only)     │          │
│          │                                                            │          │
│          │◄══════════════════════════════════════════════════════════►│          │
│          │              WebRTC Data Channel (direct)                  │          │
│          │           NaCl encrypted file transfer                     │          │
└─────────┘                                                            └─────────┘
```

## Manual Setup

If you prefer to run the components separately:

**Signaling server:**

```bash
cd signal
cargo run --release
```

**Web app:**

```bash
cd web
npm install
npm run dev
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Web UI | Vanilla TypeScript, Tailwind CSS |
| Encryption | TweetNaCl (NaCl box: Curve25519 + XSalsa20-Poly1305) |
| Transfer | WebRTC data channels, 16KB chunks |
| Signaling | Rust (Tokio + Tungstenite WebSocket) |
| Discovery | LAN/local-network signaling, IP-based peer grouping |

## Ecosystem

LocalBolt is part of the [Bolt Protocol](https://github.com/the9ines/bolt-protocol) ecosystem. See [PRD.md](PRD.md) and [ROADMAP.md](ROADMAP.md) in this repo for product requirements and roadmap.

| Relationship | Repository |
|-------------|-----------|
| Ecosystem governance (mirror) | [bolt-ecosystem](https://github.com/the9ines/bolt-ecosystem) |
| Protocol spec | [bolt-protocol](https://github.com/the9ines/bolt-protocol) |
| SDK dependency | [bolt-core-sdk](https://github.com/the9ines/bolt-core-sdk) |
| Bundles (subtree) | [bolt-rendezvous](https://github.com/the9ines/bolt-rendezvous) |
| Native/mobile app shells | [localbolt-app](https://github.com/the9ines/localbolt-app) |
| Production web app | [localbolt-v3](https://github.com/the9ines/localbolt-v3) |

This is an **open-source** project. Free to use, self-host, and modify.

## Related

- **[localbolt.app](https://localbolt.app)** — use it in the browser, no install
- **[LocalBolt App](https://github.com/the9ines/localbolt-app)** — native/mobile shells over the shared Rust core

## License

MIT — built by [the9ines](https://the9ines.com)
