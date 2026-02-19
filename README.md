# LocalBolt

**[localbolt.site](https://localbolt.site)** — use it now, no install needed.

Encrypted peer-to-peer file transfer. Files go directly between devices — never stored on any server.

- **End-to-end encrypted** — NaCl/Curve25519 (same crypto as Signal and WireGuard)
- **Direct transfer** — files never touch a server
- **No accounts** — no sign-up, no cloud, no trace
- **No file size limits** — limited only by your device storage
- **Cross-platform** — works in any modern browser

## Quick Start

```bash
git clone https://github.com/the9ines/localbolt.git
cd localbolt
./start.sh
```

That's it. The script installs any missing dependencies (Rust, Node.js), builds the signaling server, and starts everything.

Open `http://localhost:8080` on two devices on the same network, click **Devices**, select the other device, and start transferring.

**Windows:**

```
start.bat
```

> If Rust or Node.js aren't installed, the script will tell you where to get them.

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

## How It Works

1. **Open** LocalBolt on two devices connected to the same network
2. **Select** the other device from the device list — it appears automatically
3. **Transfer** files by drag-and-drop — encrypted, peer-to-peer, no size limits

The signaling server only helps devices find each other. Once connected, all data flows directly between devices over an encrypted channel. The signaling server never sees your files.

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

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Web UI | Vanilla TypeScript, Tailwind CSS |
| Encryption | TweetNaCl (NaCl box: Curve25519 + XSalsa20-Poly1305) |
| Transfer | WebRTC data channels, 16KB chunks |
| Signaling | Rust (Tokio + Tungstenite WebSocket) |
| Discovery | IP-based peer grouping on signaling server |

## License

MIT — built by [the9ines](https://the9ines.com)
