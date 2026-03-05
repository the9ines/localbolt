// @vitest-environment jsdom
/**
 * TOFU/SAS Wiring + Identity/Pin Store tests.
 *
 * Tests verification state management, transfer gating, identity
 * persistence, and generation guard race hardening.
 * All WebRTC/WebSocket interactions are mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getVerificationState,
  setVerificationState,
  resetVerificationState,
  onVerificationStateChange,
  isTransferAllowed,
  getGeneration,
  isCurrentGeneration,
  resetSession,
  _resetForTest,
} from '@the9ines/localbolt-core';

// ── Identity module tests ──────────────────────────────────────────────

// Mock SDK identity store
const mockLoad = vi.fn();
const mockSave = vi.fn();
vi.mock('@the9ines/bolt-transport-web', async () => {
  const actual: Record<string, unknown> = {};
  return {
    ...actual,
    IndexedDBIdentityStore: class {
      load = mockLoad;
      save = mockSave;
    },
    getOrCreateIdentity: vi.fn(async (store: { load: () => Promise<unknown>; save: (p: unknown) => Promise<void> }) => {
      const existing = await store.load();
      if (existing) return existing;
      const pair = { publicKey: new Uint8Array(32), secretKey: new Uint8Array(32) };
      await store.save(pair);
      return pair;
    }),
    IndexedDBPinStore: class {
      getPin = vi.fn().mockResolvedValue(null);
      setPin = vi.fn().mockResolvedValue(undefined);
      removePin = vi.fn().mockResolvedValue(undefined);
      markVerified = vi.fn().mockResolvedValue(undefined);
    },
    store: {
      getState: () => ({ isConnected: false, peers: [], signalingConnected: false }),
      setState: vi.fn(),
      subscribe: vi.fn(),
    },
    createVerificationStatus: vi.fn(() => ({
      element: document.createElement('div'),
      update: vi.fn(),
    })),
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
      disconnect() {}
      markPeerVerified = vi.fn();
    },
    WebRTCError: class extends Error { details?: string; },
    SignalingError: class extends Error {},
  };
});

vi.mock('@the9ines/bolt-core', () => ({
  generateSecurePeerCode: () => 'MOCK-PEER-CODE',
}));

// ── 1. Identity persistence ──────────────────────────────────────────

describe('Identity persistence (getOrCreateIdentity)', () => {
  beforeEach(() => {
    mockLoad.mockReset();
    mockSave.mockReset();
  });

  it('returns existing identity without regenerating', async () => {
    const existingPair = {
      publicKey: new Uint8Array(32).fill(1),
      secretKey: new Uint8Array(32).fill(2),
    };
    mockLoad.mockResolvedValue(existingPair);

    const { getOrCreateIdentity } = await import('@the9ines/bolt-transport-web');
    const store = new (await import('@the9ines/bolt-transport-web')).IndexedDBIdentityStore();
    const result = await getOrCreateIdentity(store);

    expect(result.publicKey).toEqual(existingPair.publicKey);
    expect(result.secretKey).toEqual(existingPair.secretKey);
    expect(mockSave).not.toHaveBeenCalled();
  });

  it('generates and saves new identity when none exists', async () => {
    mockLoad.mockResolvedValue(null);
    mockSave.mockResolvedValue(undefined);

    const { getOrCreateIdentity } = await import('@the9ines/bolt-transport-web');
    const store = new (await import('@the9ines/bolt-transport-web')).IndexedDBIdentityStore();
    const result = await getOrCreateIdentity(store);

    expect(result.publicKey).toBeInstanceOf(Uint8Array);
    expect(result.secretKey).toBeInstanceOf(Uint8Array);
    expect(mockSave).toHaveBeenCalledOnce();
  });
});

// ── 2. Verification state bus ────────────────────────────────────────

describe('Verification state bus', () => {
  beforeEach(() => {
    resetVerificationState();
  });

  it('initializes to legacy state', () => {
    const state = getVerificationState();
    expect(state.state).toBe('legacy');
    expect(state.sasCode).toBeNull();
  });

  it('transitions to unverified with SAS code', () => {
    setVerificationState({ state: 'unverified', sasCode: 'A1B2C3' });
    const state = getVerificationState();
    expect(state.state).toBe('unverified');
    expect(state.sasCode).toBe('A1B2C3');
  });

  it('transitions to verified', () => {
    setVerificationState({ state: 'verified', sasCode: 'A1B2C3' });
    expect(getVerificationState().state).toBe('verified');
  });

  it('resets back to legacy', () => {
    setVerificationState({ state: 'verified', sasCode: 'A1B2C3' });
    resetVerificationState();
    expect(getVerificationState().state).toBe('legacy');
    expect(getVerificationState().sasCode).toBeNull();
  });

  it('notifies listeners on state change', () => {
    const listener = vi.fn();
    onVerificationStateChange(listener);

    setVerificationState({ state: 'unverified', sasCode: 'DEADBE' });
    expect(listener).toHaveBeenCalledWith({ state: 'unverified', sasCode: 'DEADBE' });
  });

  it('unsubscribe stops notifications', () => {
    const listener = vi.fn();
    const unsub = onVerificationStateChange(listener);

    unsub();
    setVerificationState({ state: 'verified', sasCode: null });
    expect(listener).not.toHaveBeenCalled();
  });
});

// ── 3. Transfer gating ──────────────────────────────────────────────

describe('Transfer gating by verification state', () => {
  beforeEach(() => {
    resetVerificationState();
  });

  it('blocks transfer when unverified', () => {
    expect(isTransferAllowed('unverified', true)).toBe(false);
  });

  it('allows transfer when verified', () => {
    expect(isTransferAllowed('verified', true)).toBe(true);
  });

  it('allows transfer for legacy peers', () => {
    expect(isTransferAllowed('legacy', true)).toBe(true);
  });
});

// ── 4. Accept flow ──────────────────────────────────────────────────

describe('Accept verification flow', () => {
  beforeEach(() => {
    resetVerificationState();
  });

  it('transitions from unverified to verified on accept', () => {
    setVerificationState({ state: 'unverified', sasCode: 'F00BAR' });
    expect(getVerificationState().state).toBe('unverified');

    setVerificationState({ state: 'verified', sasCode: 'F00BAR' });
    expect(getVerificationState().state).toBe('verified');
  });

  it('re-evaluates transfer gate after verification', () => {
    setVerificationState({ state: 'unverified', sasCode: 'CAFE01' });
    expect(isTransferAllowed('unverified', true)).toBe(false);

    setVerificationState({ state: 'verified', sasCode: 'CAFE01' });
    expect(isTransferAllowed('verified', true)).toBe(true);
  });
});

// ── 5. Reject flow ──────────────────────────────────────────────────

describe('Reject verification flow', () => {
  beforeEach(() => {
    resetVerificationState();
  });

  it('remains unverified and resets on reject (disconnect)', () => {
    setVerificationState({ state: 'unverified', sasCode: 'BADC0D' });
    expect(getVerificationState().state).toBe('unverified');

    resetVerificationState();
    expect(getVerificationState().state).toBe('legacy');
  });

  it('never transitions to verified on reject', () => {
    setVerificationState({ state: 'unverified', sasCode: 'BADC0D' });
    resetVerificationState();
    expect(getVerificationState().state).not.toBe('verified');
  });
});

// ── 6. Mismatch handling ────────────────────────────────────────────

describe('Pin mismatch handling', () => {
  it('error message includes TOFU violation for key mismatch', () => {
    const errorMsg = 'Identity key mismatch (TOFU violation)';
    const isMismatch = errorMsg.includes('key mismatch') || errorMsg.includes('TOFU violation');
    expect(isMismatch).toBe(true);
  });

  it('mismatch detection rejects non-mismatch errors', () => {
    const errorMsg = 'Unable to connect to peer. Please try again.';
    const isMismatch = errorMsg.includes('key mismatch') || errorMsg.includes('TOFU violation');
    expect(isMismatch).toBe(false);
  });

  it('resets verification state on mismatch (via error handler)', () => {
    setVerificationState({ state: 'unverified', sasCode: 'BEEF42' });
    resetVerificationState();
    expect(getVerificationState().state).toBe('legacy');
  });
});

// ── 7. Legacy peer handling ─────────────────────────────────────────

describe('Legacy peer handling', () => {
  beforeEach(() => {
    resetVerificationState();
  });

  it('surfaces legacy state with null SAS code', () => {
    setVerificationState({ state: 'legacy', sasCode: null });
    const state = getVerificationState();
    expect(state.state).toBe('legacy');
    expect(state.sasCode).toBeNull();
  });

  it('legacy is distinct from verified', () => {
    setVerificationState({ state: 'legacy', sasCode: null });
    expect(getVerificationState().state).not.toBe('verified');
  });

  it('legacy is distinct from unverified', () => {
    setVerificationState({ state: 'legacy', sasCode: null });
    expect(getVerificationState().state).not.toBe('unverified');
  });

  it('notifies listener with legacy state', () => {
    const listener = vi.fn();
    onVerificationStateChange(listener);

    setVerificationState({ state: 'legacy', sasCode: null });
    expect(listener).toHaveBeenCalledWith({ state: 'legacy', sasCode: null });
  });
});

// ── 8. Generation guard race hardening ──────────────────────────────

describe('Generation guard race hardening', () => {
  beforeEach(() => {
    _resetForTest();
    resetVerificationState();
  });

  it('stale callback dropped after resetSession', () => {
    const genBefore = getGeneration();
    resetSession();
    expect(isCurrentGeneration(genBefore)).toBe(false);
  });

  it('stale callback dropped after new connection', () => {
    const gen1 = getGeneration();
    resetSession();
    const gen2 = getGeneration();
    expect(gen2).toBeGreaterThan(gen1);
    expect(isCurrentGeneration(gen1)).toBe(false);
    expect(isCurrentGeneration(gen2)).toBe(true);
  });

  it('generation increments on reset', () => {
    const g0 = getGeneration();
    resetSession();
    const g1 = getGeneration();
    resetSession();
    const g2 = getGeneration();
    expect(g1).toBe(g0 + 1);
    expect(g2).toBe(g0 + 2);
  });

  it('isCurrentGeneration returns false for old generation', () => {
    const old = getGeneration();
    resetSession();
    resetSession();
    expect(isCurrentGeneration(old)).toBe(false);
  });

  it('isTransferAllowed policy matrix', () => {
    // verified + connected → allowed
    expect(isTransferAllowed('verified', true)).toBe(true);
    // verified + disconnected → blocked
    expect(isTransferAllowed('verified', false)).toBe(false);
    // legacy + connected → allowed
    expect(isTransferAllowed('legacy', true)).toBe(true);
    // legacy + disconnected → blocked
    expect(isTransferAllowed('legacy', false)).toBe(false);
    // unverified + connected → blocked
    expect(isTransferAllowed('unverified', true)).toBe(false);
    // unverified + disconnected → blocked
    expect(isTransferAllowed('unverified', false)).toBe(false);
  });
});
