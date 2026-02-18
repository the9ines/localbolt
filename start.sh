#!/bin/bash
# LocalBolt — Start signaling server + web app
set -e

echo "Starting LocalBolt..."
echo ""

# Check prerequisites
if ! command -v cargo &> /dev/null; then
  echo "Error: Rust is not installed. Install it from https://rustup.rs"
  exit 1
fi

if ! command -v npm &> /dev/null; then
  echo "Error: Node.js is not installed. Install it from https://nodejs.org"
  exit 1
fi

# Install web dependencies if needed
if [ ! -d "web/node_modules" ]; then
  echo "Installing web dependencies..."
  cd web && npm install && cd ..
  echo ""
fi

# Start signaling server in background
echo "Starting signaling server on port 3001..."
cd signal && cargo run --release &
SIGNAL_PID=$!
cd ..

# Wait for signal server to be ready
sleep 2

# Start web dev server
echo "Starting web app on port 8080..."
echo ""
echo "  Open http://localhost:8080 in your browser"
echo "  Open on another device: http://$(ipconfig getifaddr en0 2>/dev/null || hostname -I 2>/dev/null | awk '{print $1}'):8080"
echo ""
cd web && npm run dev

# Cleanup
kill $SIGNAL_PID 2>/dev/null
