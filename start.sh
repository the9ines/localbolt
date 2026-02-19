#!/bin/bash
# LocalBolt — One-command setup + start
set -e

echo ""
echo "  ⚡ LocalBolt — Encrypted P2P File Transfer"
echo ""

# ── Install Rust if missing ──────────────────────────────────────────────
if ! command -v cargo &> /dev/null; then
  echo "  Rust not found. Installing..."
  if [[ "$OSTYPE" == "darwin"* ]]; then
    if command -v brew &> /dev/null; then
      brew install rust
    else
      curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
      source "$HOME/.cargo/env"
    fi
  else
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
  fi
  echo ""
fi

# ── Install Node.js if missing ───────────────────────────────────────────
if ! command -v npm &> /dev/null; then
  echo "  Node.js not found."
  if [[ "$OSTYPE" == "darwin"* ]] && command -v brew &> /dev/null; then
    echo "  Installing via Homebrew..."
    brew install node
  else
    echo "  Please install Node.js from https://nodejs.org and re-run this script."
    exit 1
  fi
  echo ""
fi

# ── Install web dependencies ─────────────────────────────────────────────
if [ ! -d "web/node_modules" ]; then
  echo "  Installing web dependencies..."
  (cd web && npm install --silent)
  echo ""
fi

# ── Build signal server (first run only) ─────────────────────────────────
if [ ! -f "signal/target/release/localbolt-signal" ]; then
  echo "  Building signaling server (first run, takes ~10s)..."
  (cd signal && cargo build --release 2>&1 | tail -1)
  echo ""
fi

# ── Start signaling server ───────────────────────────────────────────────
echo "  Starting signaling server on port 3001..."
(cd signal && cargo run --release 2>/dev/null) &
SIGNAL_PID=$!

# Wait for it to be ready
sleep 2

# Verify it started
if ! kill -0 $SIGNAL_PID 2>/dev/null; then
  echo "  Error: Signal server failed to start."
  exit 1
fi

# ── Get local IP ─────────────────────────────────────────────────────────
LOCAL_IP=$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}' || echo "your-ip")

# ── Start web app ────────────────────────────────────────────────────────
echo "  Starting web app on port 8080..."
echo ""
echo "  ┌─────────────────────────────────────────┐"
echo "  │                                         │"
echo "  │   This device:  http://localhost:8080    │"
echo "  │   Other device: http://${LOCAL_IP}:8080  │"
echo "  │                                         │"
echo "  │   Open on two devices, click Devices,   │"
echo "  │   and start transferring files.          │"
echo "  │                                         │"
echo "  └─────────────────────────────────────────┘"
echo ""

# Trap to clean up signal server on exit
trap "kill $SIGNAL_PID 2>/dev/null" EXIT INT TERM

cd web && npx vite --host --port 8080
