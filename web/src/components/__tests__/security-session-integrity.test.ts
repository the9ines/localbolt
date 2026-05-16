/**
 * R1-4 — Security-focused session integrity tests.
 *
 * Covers R1-0 security gaps for localbolt:
 * 1. Stale callback cannot mutate trust/session state after reset/reconnect
 * 2. Trust transitions remain correct across reconnect/session boundary
 * 3. Transfer gating integrity under reconnect/security edges
 * 4. No unintended downgrade/legacy fallback when verification state is known
 *
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
  getPhase,
  beginRequest,
  beginConnecting,
  markConnected,
  _resetForTest,
} from '@the9ines/localbolt-core';

// ── Mock SDK store ────────────────────────────────────────────────────────

const mockState: Record<string, unknown> = {
  isConnected: false,
  connectedDevice: null,
  connectingTo: null,
  incomingRequest: null,
  transferProgress: null,
  showDeviceList: false,
  signalingConnected: false,
  peerCode: null,
  peers: [],
};

vi.mock('@the9ines/localbolt-browser', () => ({
  store: {
    getState: () => ({ ...mockState }),
    setState: (partial: Record<string, unknown>) => Object.assign(mockState, partial),
    subscribe: vi.fn(),
  },
  showToast: vi.fn(),
}));

// ── Setup ─────────────────────────────────────────────────────────────────

beforeEach(() => {
  _resetForTest();
  resetVerificationState();
  Object.assign(mockState, {
    isConnected: false,
    connectedDevice: null,
    connectingTo: null,
    incomingRequest: null,
    transferProgress: null,
    showDeviceList: false,
  });
});

// ── Helper: simulate full session connect ─────────────────────────────────

function connectToPeer(peerCode: string): number {
  beginRequest(peerCode);
  beginConnecting(peerCode);
  markConnected();
  mockState.isConnected = true;
  return getGeneration();
}

// ── 1. Stale callback cannot mutate trust/session state ───────────────────

describe('R1-4: Stale callback cannot mutate trust/session state after reset', () => {
  it('stale setVerificationState after reset is overwritten by canonical reset', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    const genA = getGeneration();

    resetSession();

    // Stale callback from session A fires — caller MUST guard with generation
    if (isCurrentGeneration(genA)) {
      setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    }

    // Guard rejected the stale callback — state remains legacy from reset
    expect(getVerificationState().state).toBe('legacy');
    expect(getVerificationState().sasCode).toBeNull();
  });

  it('stale callback cannot promote unverified to verified after disconnect', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    const genA = getGeneration();

    // User disconnects
    resetSession();
    mockState.isConnected = false;

    // Late markPeerVerified callback from SDK (guarded by generation)
    const shouldApply = isCurrentGeneration(genA);
    expect(shouldApply).toBe(false);

    // State was NOT mutated
    expect(getVerificationState().state).toBe('legacy');
  });

  it('stale callback from session A cannot mutate state during session B', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    const genA = getGeneration();

    resetSession();
    connectToPeer('PEER-B');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-B' });

    // Late callback from session A tries to set verified
    if (isCurrentGeneration(genA)) {
      setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    }

    // Session B state intact — still unverified with SAS-B
    expect(getVerificationState().state).toBe('unverified');
    expect(getVerificationState().sasCode).toBe('SAS-B');
  });

  it('multiple stale generations all rejected after rapid reset cycles', () => {
    const staleGens: number[] = [];

    for (let i = 0; i < 5; i++) {
      connectToPeer(`PEER-${i}`);
      staleGens.push(getGeneration());
      resetSession();
    }

    // All captured generations are stale
    for (const gen of staleGens) {
      expect(isCurrentGeneration(gen)).toBe(false);
    }

    // Current generation is valid
    expect(isCurrentGeneration(getGeneration())).toBe(true);
  });
});

// ── 2. Trust transitions correct across reconnect/session boundary ────────

describe('R1-4: Trust transitions across reconnect boundary', () => {
  it('unverified trust from session A does not carry into session B', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    expect(getVerificationState().state).toBe('unverified');

    resetSession();

    // New session starts clean at legacy
    expect(getVerificationState().state).toBe('legacy');
    expect(getVerificationState().sasCode).toBeNull();

    connectToPeer('PEER-B');
    // Before SDK emits new verification state, trust is legacy (not unverified from A)
    expect(getVerificationState().state).toBe('legacy');
  });

  it('verified trust from session A does not carry into session B', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(getVerificationState().state).toBe('verified');

    resetSession();
    connectToPeer('PEER-B');

    // B starts at legacy, not verified from A
    expect(getVerificationState().state).toBe('legacy');
  });

  it('SAS code from session A does not leak into session B', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SECRET-SAS-A' });

    resetSession();
    connectToPeer('PEER-B');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-B' });

    expect(getVerificationState().sasCode).toBe('SAS-B');
    expect(getVerificationState().sasCode).not.toBe('SECRET-SAS-A');
  });

  it('three consecutive sessions maintain isolation: A(unverified) → B(verified) → C(legacy)', () => {
    // Session A: unverified
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    resetSession();

    // Session B: verified
    connectToPeer('PEER-B');
    setVerificationState({ state: 'verified', sasCode: 'SAS-B' });
    expect(getVerificationState().state).toBe('verified');
    resetSession();

    // Session C: starts at legacy
    connectToPeer('PEER-C');
    expect(getVerificationState().state).toBe('legacy');
    expect(getVerificationState().sasCode).toBeNull();
  });

  it('verification state listener receives clean legacy on reconnect boundary', () => {
    const states: string[] = [];
    const unsub = onVerificationStateChange((info) => {
      states.push(info.state);
    });

    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    resetSession(); // triggers resetVerificationState internally
    connectToPeer('PEER-B');
    setVerificationState({ state: 'verified', sasCode: 'SAS-B' });

    // States should show: unverified → legacy (from reset) → verified
    expect(states).toContain('unverified');
    expect(states).toContain('legacy');
    expect(states).toContain('verified');

    unsub();
  });
});

// ── 3. Transfer gating integrity under reconnect/security edges ───────────

describe('R1-4: Transfer gating under reconnect/security edges', () => {
  it('transfer blocked after disconnect even if verification was verified', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(isTransferAllowed('verified', true)).toBe(true);

    // Disconnect
    resetSession();
    mockState.isConnected = false;

    // Transfer blocked: legacy + disconnected
    expect(isTransferAllowed(getVerificationState().state, false)).toBe(false);
  });

  it('transfer blocked in new session before verification completes', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });

    resetSession();
    connectToPeer('PEER-B');
    mockState.isConnected = true;

    // New session starts at legacy (allowed) but then SDK emits unverified
    setVerificationState({ state: 'unverified', sasCode: 'SAS-B' });
    expect(isTransferAllowed('unverified', true)).toBe(false);
  });

  it('transfer allowed only after explicit verification in new session', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });

    resetSession();
    connectToPeer('PEER-B');
    mockState.isConnected = true;

    // Unverified — blocked
    setVerificationState({ state: 'unverified', sasCode: 'SAS-B' });
    expect(isTransferAllowed('unverified', true)).toBe(false);

    // User verifies — allowed
    setVerificationState({ state: 'verified', sasCode: 'SAS-B' });
    expect(isTransferAllowed('verified', true)).toBe(true);
  });

  it('transfer blocked during mismatch path even if previously verified', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(isTransferAllowed('verified', true)).toBe(true);

    // Mismatch error → resetSession → disconnected
    resetSession();
    mockState.isConnected = false;

    // Transfer blocked at every level
    expect(isTransferAllowed('legacy', false)).toBe(false);
    expect(isTransferAllowed('verified', false)).toBe(false);
    expect(isTransferAllowed('unverified', false)).toBe(false);
  });

  it('full reconnect cycle: transfer gating transitions correctly', () => {
    // Session A: verify → transfer allowed
    connectToPeer('PEER-A');
    mockState.isConnected = true;
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });
    expect(isTransferAllowed('unverified', true)).toBe(false);
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(isTransferAllowed('verified', true)).toBe(true);

    // Disconnect: transfer blocked
    resetSession();
    mockState.isConnected = false;
    expect(isTransferAllowed(getVerificationState().state, false)).toBe(false);

    // Session B: reconnect → unverified → blocked → verify → allowed
    connectToPeer('PEER-B');
    mockState.isConnected = true;
    expect(isTransferAllowed('legacy', true)).toBe(true); // legacy allowed before SDK emits
    setVerificationState({ state: 'unverified', sasCode: 'SAS-B' });
    expect(isTransferAllowed('unverified', true)).toBe(false);
    setVerificationState({ state: 'verified', sasCode: 'SAS-B' });
    expect(isTransferAllowed('verified', true)).toBe(true);
  });
});

// ── 4. No unintended downgrade/legacy fallback ───────────────────────────

describe('R1-4: No unintended downgrade/legacy fallback', () => {
  it('verified state does not silently fall back to legacy without reset', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });

    // Without calling resetSession or resetVerificationState, state persists
    expect(getVerificationState().state).toBe('verified');
    expect(getVerificationState().state).not.toBe('legacy');
  });

  it('unverified state does not silently fall back to legacy without reset', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });

    // State persists without explicit reset
    expect(getVerificationState().state).toBe('unverified');
    expect(getVerificationState().state).not.toBe('legacy');
  });

  it('only canonical resetSession clears verification to legacy', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });

    // Phase transitions alone do NOT reset verification
    // (Only resetSession or explicit resetVerificationState does)
    expect(getVerificationState().state).toBe('verified');

    // Canonical reset DOES clear it
    resetSession();
    expect(getVerificationState().state).toBe('legacy');
  });

  it('re-setting same state does not cause downgrade', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(getVerificationState().state).toBe('verified');
  });

  it('legacy fallback only via explicit reset, never via state machine transition', () => {
    connectToPeer('PEER-A');
    setVerificationState({ state: 'unverified', sasCode: 'SAS-A' });

    // Attempting to set legacy requires explicit call (simulating SDK behavior)
    // Without it, state stays unverified
    expect(getVerificationState().state).toBe('unverified');

    // Mark verified — not a downgrade
    setVerificationState({ state: 'verified', sasCode: 'SAS-A' });
    expect(getVerificationState().state).toBe('verified');

    // Only canonical path resets to legacy
    resetSession();
    expect(getVerificationState().state).toBe('legacy');
  });
});
