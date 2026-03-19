// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// ── Mock @the9ines/bolt-core ────────────────────────────────────────────
vi.mock('@the9ines/bolt-core', () => ({
  generateSecurePeerCode: () => 'APP-TEST-CODE',
}));

// ── Mock @/services/identity ─────────────────────────────────────────
vi.mock('@/services/identity', () => ({
  initIdentity: vi.fn(() => Promise.resolve({
    publicKey: new Uint8Array(32),
    secretKey: new Uint8Array(32),
  })),
}));

// ── Mock @the9ines/localbolt-core ───────────────────────────────────────
vi.mock('@the9ines/localbolt-core', () => ({
  setVerificationState: vi.fn(),
  getPhase: () => 'idle',
  getGeneration: () => 0,
  isCurrentGeneration: () => true,
  beginRequest: () => true,
  receiveRequest: () => true,
  beginConnecting: () => true,
  markConnected: () => true,
  resetSession: () => 1,
  getVerificationState: () => ({ state: 'legacy', sasCode: null }),
  onVerificationStateChange: () => () => {},
  isTransferAllowed: (state: string, connected: boolean) => connected && (state === 'verified' || state === 'legacy'),
}));

// ── Mock @the9ines/bolt-transport-web ───────────────────────────────────
vi.mock('@the9ines/bolt-transport-web', () => {
  const state: Record<string, unknown> = {
    signalingConnected: false,
    isConnected: false,
    peerCode: null,
    peers: [],
    connectingTo: null,
    connectedDevice: null,
    incomingRequest: null,
    showDeviceList: false,
    transferProgress: null,
  };
  const subs: Array<() => void> = [];
  const iconFn = (cls?: string) => `<svg class="${cls ?? ''}"></svg>`;

  return {
    store: {
      getState: () => ({ ...state }),
      setState: (partial: Record<string, unknown>) => {
        Object.assign(state, partial);
        subs.forEach((fn) => fn());
      },
      subscribe: (fn: () => void) => { subs.push(fn); },
    },
    icons: new Proxy({}, { get: () => iconFn }),
    showToast: vi.fn(),
    createFileUpload: () => document.createElement('div'),
    createConnectionStatus: () => document.createElement('div'),
    createVerificationStatus: vi.fn(() => ({
      element: document.createElement('div'),
      update: vi.fn(),
    })),
    IndexedDBPinStore: class {
      getPin = vi.fn().mockResolvedValue(null);
      setPin = vi.fn().mockResolvedValue(undefined);
      removePin = vi.fn().mockResolvedValue(undefined);
      markVerified = vi.fn().mockResolvedValue(undefined);
    },
    createDeviceDiscovery: () => document.createElement('div'),
    setWebrtcRef: vi.fn(),
    detectDeviceType: () => 'desktop',
    getDeviceName: () => 'Test Device',
    detectDevice: () => ({ isLinux: false, isWindows: false, isMobile: false }),
    DualSignaling: class {
      connect() { return Promise.resolve(); }
      setConnectionStateHandler() {}
      onPeerDiscovered() {}
      onPeerLost() {}
      onSignal() {}
      sendSignal() { return Promise.resolve(); }
      isConnected() { return false; }
    },
    WebRTCService: class {
      setConnectionStateHandler() {}
      getRemotePeerCode() { return ''; }
      connect() { return Promise.resolve(); }
      disconnect() {}
      markPeerVerified = vi.fn();
    },
    WebRTCError: class extends Error { details?: string; },
    SignalingError: class extends Error {},
    initPolicyAdapter: () => Promise.resolve({ name: 'ts-fallback' }),
    initProtocolWasm: () => Promise.resolve(false),
    getProtocolAuthorityMode: () => 'not-initialized',
  };
});

// ── Tests ───────────────────────────────────────────────────────────────
import { createApp } from '../app';

describe('createApp', () => {
  it('renders without throwing', () => {
    const root = document.createElement('div');
    expect(() => createApp(root)).not.toThrow();
  });

  it('populates the root element with content', () => {
    const root = document.createElement('div');
    createApp(root);
    expect(root.children.length).toBeGreaterThan(0);
  });
});

describe('main.ts entry point', () => {
  it('executes without throwing and populates #root', async () => {
    const root = document.createElement('div');
    root.id = 'root';
    document.body.appendChild(root);

    await import('../main');
    // BR5: main.ts now uses async initProtocolWasm().then(() => createApp(...)).
    // Wait for the promise chain to settle (WASM init fails in test env → fallback → createApp runs).
    await new Promise((r) => setTimeout(r, 50));

    expect(root.children.length).toBeGreaterThan(0);
    document.body.removeChild(root);
  });
});
