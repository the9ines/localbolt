// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// ── Mock @the9ines/bolt-core ────────────────────────────────────────────
vi.mock('@the9ines/bolt-core', () => ({
  generateSecurePeerCode: () => 'APP-TEST-CODE',
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
    },
    WebRTCError: class extends Error { details?: string; },
    SignalingError: class extends Error {},
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

    expect(root.children.length).toBeGreaterThan(0);
    document.body.removeChild(root);
  });
});
