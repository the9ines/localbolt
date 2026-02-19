# Contributing to LocalBolt

Thanks for your interest in contributing to LocalBolt.

## Getting Started

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR_USERNAME/localbolt.git
   cd localbolt
   ```
3. Start the development environment:
   ```bash
   ./start.sh
   ```

This installs dependencies, builds the signaling server, and starts both the signal server and web dev server.

## Development Setup (Manual)

**Signaling server (Rust):**

```bash
cd signal
cargo run
```

**Web app (TypeScript):**

```bash
cd web
npm install
npm run dev
```

**Run tests:**

```bash
# Rust tests
cd signal && cargo test

# Web tests
cd web && npm test

# Lint
cd web && npm run lint
```

## Project Structure

```
localbolt/
  signal/          Rust WebSocket signaling server
  web/             TypeScript frontend (Vite + Tailwind)
    src/
      components/  UI components
      services/    Signaling, WebRTC, encryption
      state/       Application state management
      types/       TypeScript type definitions
```

## Submitting Changes

1. Create a feature branch: `git checkout -b my-feature`
2. Make your changes
3. Run tests: `cargo test` (signal) and `npm test` (web)
4. Run the linter: `npm run lint` (web)
5. Commit with a clear message describing what changed and why
6. Push to your fork and open a pull request

## Pull Request Guidelines

- Keep PRs focused on a single change
- Include tests for new functionality
- Make sure all existing tests pass
- Describe what the PR does and why in the description

## Bug Reports

Open an issue on GitHub with:
- What you expected to happen
- What actually happened
- Steps to reproduce
- Browser/OS information

## Security Issues

Do not open public issues for security vulnerabilities. See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
