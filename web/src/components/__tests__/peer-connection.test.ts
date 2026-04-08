// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';

// ── Shared state for callback capture ───────────────────────────────────
const captured = vi.hoisted(() => ({
  connectionStateHandler: null as ((...a: any[]) => void) | null,
  peerDiscovered: null as ((...a: any[]) => void) | null,
  peerLost: null as ((...a: any[]) => void) | null,
  signalHandler: null as ((...a: any[]) => void) | null,
  discoveryArgs: null as ((...a: any[]) => void)[] | null,
  fileReceive: null as ((...a: any[]) => void) | null,
  connectionError: null as ((...a: any[]) => void) | null,
  receiveProgress: null as ((...a: any[]) => void) | null,
  rtcStateChange: null as ((...a: any[]) => void) | null,
}));

const mockStore = vi.hoisted(() => {
  const state: Record<string, unknown> = {
    signalingConnected: false,
    isConnected: false,
    peerCode: null,
    peers: [] as any[],
    connectingTo: null,
    connectedDevice: null,
    incomingRequest: null,
    showDeviceList: false,
    transferProgress: null,
  };
  return {
    state,
    getState: () => ({ ...state }),
    setState: (partial: Record<string, unknown>) => Object.assign(state, partial),
    subscribe: vi.fn(),
  };
});

const mockShowToast = vi.hoisted(() => vi.fn());
const mockSetWebrtcRef = vi.hoisted(() => vi.fn());
const mockSendSignal = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockRtcConnect = vi.hoisted(() => vi.fn(() => Promise.resolve()));
const mockRtcDisconnect = vi.hoisted(() => vi.fn());

// ── Mock session phase machine (localbolt-core) ─────────────────────────
const mockSession = vi.hoisted(() => {
  let phase = 'idle';
  let generation = 0;
  return {
    get phase() { return phase; },
    set phase(v: string) { phase = v; },
    get generation() { return generation; },
    set generation(v: number) { generation = v; },
    reset() { phase = 'idle'; generation = 0; },
  };
});

// ── Mock @the9ines/bolt-core ────────────────────────────────────────────
vi.mock('@the9ines/bolt-core', () => ({
  generateSecurePeerCode: () => 'TEST-CODE',
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
  getPhase: () => mockSession.phase,
  getGeneration: () => mockSession.generation,
  isCurrentGeneration: (gen: number) => gen === mockSession.generation,
  beginRequest: (peerCode: string) => {
    if (mockSession.phase !== 'idle') return false;
    mockSession.phase = 'requesting';
    return true;
  },
  receiveRequest: (peerCode: string) => {
    if (mockSession.phase !== 'idle') return false;
    mockSession.phase = 'incoming_request';
    return true;
  },
  beginConnecting: (peerCode: string) => {
    if (mockSession.phase !== 'requesting' && mockSession.phase !== 'incoming_request') return false;
    mockSession.phase = 'connecting';
    return true;
  },
  markConnected: () => {
    if (mockSession.phase !== 'connecting') return false;
    mockSession.phase = 'connected';
    return true;
  },
  resetSession: () => {
    mockSession.generation++;
    mockSession.phase = 'idle';
    // Mirror canonical reset — clears SDK store
    Object.assign(mockStore.state, {
      isConnected: false,
      connectedDevice: null,
      connectingTo: null,
      incomingRequest: null,
      transferProgress: null,
      showDeviceList: false,
    });
    return mockSession.generation;
  },
}));

// ── Mock @the9ines/bolt-transport-web ───────────────────────────────────
vi.mock('@the9ines/bolt-transport-web', () => ({
  store: mockStore,
  showToast: mockShowToast,
  setWebrtcRef: mockSetWebrtcRef,
  detectDeviceType: () => 'desktop',
  getDeviceName: () => 'Test Device',
  detectDevice: () => ({ isLinux: false, isWindows: false, isMobile: false }),
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
  createDeviceDiscovery: (...args: any[]) => {
    captured.discoveryArgs = args;
    return document.createElement('div');
  },
  DualSignaling: class {
    connect() { return Promise.resolve(); }
    setConnectionStateHandler(fn: any) { captured.connectionStateHandler = fn; }
    onPeerDiscovered(fn: any) { captured.peerDiscovered = fn; }
    onPeerLost(fn: any) { captured.peerLost = fn; }
    onSignal(fn: any) { captured.signalHandler = fn; }
    sendSignal(...args: any[]) { return mockSendSignal(...args); }
    isConnected() { return false; }
  },
  WebRTCService: class {
    constructor(_sig: any, _code: any, fileReceive: any, errorFn: any, progressFn: any, _opts?: any) {
      captured.fileReceive = fileReceive;
      captured.connectionError = errorFn;
      captured.receiveProgress = progressFn;
    }
    markPeerVerified = vi.fn();
    setConnectionStateHandler(fn: any) { captured.rtcStateChange = fn; }
    getRemotePeerCode() { return 'REMOTE-CODE'; }
    connect(...args: any[]) { return mockRtcConnect(...args); }
    disconnect() { mockRtcDisconnect(); }
  },
  WebRTCError: class extends Error { details?: string; },
  SignalingError: class extends Error {},
}));

// ── Import after mocks ─────────────────────────────────────────────────
import { createPeerConnection } from '../peer-connection';

// Helper: flush microtask queue so .then() callbacks run
const flush = () => new Promise((r) => setTimeout(r, 0));

describe('createPeerConnection', () => {
  let container: HTMLElement;

  beforeAll(async () => {
    // Reset store state
    Object.assign(mockStore.state, {
      signalingConnected: false,
      isConnected: false,
      peerCode: null,
      peers: [],
      connectingTo: null,
      connectedDevice: null,
      incomingRequest: null,
      showDeviceList: false,
      transferProgress: null,
    });
    mockSession.reset();
    container = createPeerConnection();
    await flush(); // resolve DualSignaling.connect().then()
  });

  // Reset session phase between tests to avoid cross-contamination
  beforeEach(() => {
    mockSession.phase = 'idle';
  });

  it('returns an HTMLElement without throwing', () => {
    expect(container).toBeInstanceOf(HTMLElement);
  });

  it('sets peerCode in store', () => {
    expect(mockStore.state.peerCode).toBe('TEST-CODE');
  });

  it('after connect resolves, signalingConnected is true and WebRTCService created', () => {
    expect(mockStore.state.signalingConnected).toBe(true);
    expect(mockSetWebrtcRef).toHaveBeenCalled();
    expect(captured.rtcStateChange).toBeTypeOf('function');
  });

  // ── Signaling event handlers ────────────────────────────────────────

  it('onPeerDiscovered adds peer to store', () => {
    mockStore.state.peers = [];
    captured.peerDiscovered!({ peerCode: 'PEER-A', deviceName: 'D', deviceType: 'desktop' });
    expect(mockStore.state.peers).toHaveLength(1);
  });

  it('onPeerDiscovered deduplicates', () => {
    mockStore.state.peers = [{ peerCode: 'PEER-A' }];
    captured.peerDiscovered!({ peerCode: 'PEER-A', deviceName: 'D', deviceType: 'desktop' });
    expect(mockStore.state.peers).toHaveLength(1);
  });

  it('onPeerLost removes peer from store', () => {
    mockStore.state.peers = [{ peerCode: 'PEER-A' }];
    mockStore.state.connectingTo = null;
    mockStore.state.incomingRequest = null;
    captured.peerLost!('PEER-A');
    expect(mockStore.state.peers).toHaveLength(0);
  });

  it('onPeerLost cleans up connectingTo if lost peer was target', () => {
    mockSession.phase = 'requesting';
    mockStore.state.peers = [{ peerCode: 'PEER-B' }];
    mockStore.state.connectingTo = 'PEER-B';
    mockStore.state.incomingRequest = null;
    captured.peerLost!('PEER-B');
    expect(mockStore.state.connectingTo).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('onPeerLost cleans up incomingRequest if lost peer had pending request', () => {
    mockSession.phase = 'incoming_request';
    mockStore.state.peers = [{ peerCode: 'PEER-C' }];
    mockStore.state.connectingTo = null;
    mockStore.state.incomingRequest = { peerCode: 'PEER-C' };
    captured.peerLost!('PEER-C');
    expect(mockStore.state.incomingRequest).toBeNull();
  });

  // ── Connection approval protocol ────────────────────────────────────

  it('connection_request sets incomingRequest', () => {
    mockSession.phase = 'idle';
    mockStore.state.isConnected = false;
    mockStore.state.connectingTo = null;
    captured.signalHandler!({
      type: 'connection_request',
      from: 'PEER-X',
      data: { deviceName: 'Phone', deviceType: 'mobile' },
    });
    expect(mockStore.state.incomingRequest).toEqual({
      peerCode: 'PEER-X',
      deviceName: 'Phone',
      deviceType: 'mobile',
    });
    expect(mockSession.phase).toBe('incoming_request');
  });

  it('connection_request auto-declines when busy', () => {
    mockSession.phase = 'connected';
    mockSendSignal.mockClear();
    captured.signalHandler!({
      type: 'connection_request',
      from: 'PEER-Y',
      data: { deviceName: 'Tab', deviceType: 'mobile' },
    });
    expect(mockSendSignal).toHaveBeenCalledWith(
      'connection_declined',
      { reason: 'busy' },
      'PEER-Y',
    );
  });

  it('connection_accepted triggers rtcService.connect', () => {
    mockSession.phase = 'requesting';
    mockStore.state.connectingTo = 'PEER-X';
    mockRtcConnect.mockClear();
    captured.signalHandler!({
      type: 'connection_accepted',
      from: 'PEER-X',
      data: {},
    });
    expect(mockRtcConnect).toHaveBeenCalledWith('PEER-X');
    expect(mockSession.phase).toBe('connecting');
  });

  it('connection_accepted ignores stale signal', () => {
    mockSession.phase = 'requesting';
    mockStore.state.connectingTo = 'OTHER';
    mockRtcConnect.mockClear();
    captured.signalHandler!({
      type: 'connection_accepted',
      from: 'PEER-X',
      data: {},
    });
    expect(mockRtcConnect).not.toHaveBeenCalled();
  });

  it('connection_declined clears connectingTo via resetSession', () => {
    mockStore.state.connectingTo = 'PEER-X';
    mockStore.state.incomingRequest = null;
    mockShowToast.mockClear();
    captured.signalHandler!({
      type: 'connection_declined',
      from: 'PEER-X',
      data: {},
    });
    expect(mockStore.state.connectingTo).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('connection_declined clears incomingRequest when peer cancels', () => {
    mockStore.state.connectingTo = null;
    mockStore.state.incomingRequest = { peerCode: 'PEER-X' };
    captured.signalHandler!({
      type: 'connection_declined',
      from: 'PEER-X',
      data: {},
    });
    expect(mockStore.state.incomingRequest).toBeNull();
  });

  // ── WebRTC state changes ────────────────────────────────────────────

  it('handleConnectionStateChange — connected', () => {
    mockSession.phase = 'connecting';
    mockStore.state.peers = [{ peerCode: 'REMOTE-CODE' }];
    mockSetWebrtcRef.mockClear();
    captured.rtcStateChange!('connected');
    expect(mockStore.state.isConnected).toBe(true);
    expect(mockSetWebrtcRef).toHaveBeenCalled();
    expect(mockSession.phase).toBe('connected');
  });

  it('handleConnectionStateChange — disconnected resets via resetSession', () => {
    captured.rtcStateChange!('disconnected');
    expect(mockStore.state.isConnected).toBe(false);
    expect(mockSession.phase).toBe('idle');
  });

  // ── File receive ────────────────────────────────────────────────────

  it('handleFileReceive triggers download', () => {
    const clickSpy = vi.fn();
    const origCreate = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = origCreate(tag);
      if (tag === 'a') el.click = clickSpy;
      return el;
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:test');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

    captured.fileReceive!(new Blob(['test']), 'file.txt');
    expect(clickSpy).toHaveBeenCalled();

    vi.restoreAllMocks();
  });

  // ── Connection error ────────────────────────────────────────────────

  it('handleConnectionError calls showToast and resets session', () => {
    mockShowToast.mockClear();
    const err = new Error('fail');
    err.name = 'ConnectionError';
    captured.connectionError!(err);
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockStore.state.isConnected).toBe(false);
    expect(mockSession.phase).toBe('idle');
  });

  it('handleConnectionError — TOFU violation shows security alert', () => {
    mockShowToast.mockClear();
    const err = new Error('key mismatch detected');
    err.name = 'ConnectionError';
    captured.connectionError!(err);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Security Alert: Identity Mismatch',
      expect.stringContaining('identity key has changed'),
      'destructive',
    );
  });

  it('handleConnectionError — TransferError shows transfer failed', () => {
    mockShowToast.mockClear();
    const err = new Error('chunk timeout');
    err.name = 'TransferError';
    captured.connectionError!(err);
    expect(mockShowToast).toHaveBeenCalledWith(
      'Transfer Failed',
      expect.stringContaining('transfer failed'),
      'destructive',
    );
  });

  // ── Receive progress ────────────────────────────────────────────────

  it('handleReceiveProgress — completed', () => {
    vi.useFakeTimers();
    mockShowToast.mockClear();
    captured.receiveProgress!({ status: 'completed', filename: 'a.txt' });
    expect(mockShowToast).toHaveBeenCalled();
    vi.advanceTimersByTime(2100);
    expect(mockStore.state.transferProgress).toBeNull();
    vi.useRealTimers();
  });

  it('handleReceiveProgress — canceled', () => {
    mockShowToast.mockClear();
    captured.receiveProgress!({ status: 'canceled_by_sender' });
    expect(mockStore.state.transferProgress).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('handleReceiveProgress — error', () => {
    mockShowToast.mockClear();
    captured.receiveProgress!({ status: 'error' });
    expect(mockStore.state.transferProgress).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  // ── Device discovery callbacks ──────────────────────────────────────

  it('selectPeer sends connection request via phase guard', () => {
    mockSession.phase = 'idle';
    mockStore.state.isConnected = false;
    mockSendSignal.mockClear();
    const selectPeer = captured.discoveryArgs![0];
    selectPeer('TARGET-PEER');
    expect(mockStore.state.connectingTo).toBe('TARGET-PEER');
    expect(mockSendSignal).toHaveBeenCalled();
    expect(mockSession.phase).toBe('requesting');
  });

  it('selectPeer is blocked when not idle', () => {
    mockSession.phase = 'connected';
    mockSendSignal.mockClear();
    const selectPeer = captured.discoveryArgs![0];
    selectPeer('TARGET-PEER-2');
    expect(mockSendSignal).not.toHaveBeenCalled();
  });

  it('disconnect resets state and calls showToast', () => {
    mockStore.state.isConnected = true;
    mockShowToast.mockClear();
    mockRtcDisconnect.mockClear();
    const disconnectFn = captured.discoveryArgs![1];
    disconnectFn();
    expect(mockStore.state.isConnected).toBe(false);
    expect(mockRtcDisconnect).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockSession.phase).toBe('idle');
  });

  it('acceptRequest sends acceptance signal and transitions to connecting', () => {
    mockSession.phase = 'incoming_request';
    mockStore.state.incomingRequest = { peerCode: 'REQ-PEER', deviceName: 'D', deviceType: 'desktop' };
    mockSendSignal.mockClear();
    const acceptFn = captured.discoveryArgs![2];
    acceptFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_accepted', {}, 'REQ-PEER');
    expect(mockStore.state.incomingRequest).toBeNull();
    expect(mockSession.phase).toBe('connecting');
  });

  it('declineRequest sends decline signal and resets session', () => {
    mockSession.phase = 'incoming_request';
    mockStore.state.incomingRequest = { peerCode: 'REQ-PEER', deviceName: 'D', deviceType: 'desktop' };
    mockSendSignal.mockClear();
    const declineFn = captured.discoveryArgs![3];
    declineFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_declined', { reason: 'user_declined' }, 'REQ-PEER');
    expect(mockStore.state.incomingRequest).toBeNull();
    expect(mockSession.phase).toBe('idle');
  });

  it('cancelRequest sends cancel signal and resets session', () => {
    mockStore.state.connectingTo = 'TARGET-PEER';
    mockSendSignal.mockClear();
    const cancelFn = captured.discoveryArgs![4];
    cancelFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_declined', { reason: 'cancelled' }, 'TARGET-PEER');
    expect(mockStore.state.connectingTo).toBeNull();
    expect(mockSession.phase).toBe('idle');
  });

  // ── Branch coverage: uncovered paths ─────────────────────────────────

  it('reject button click disconnects and shows peer-rejected toast', () => {
    mockShowToast.mockClear();
    mockRtcDisconnect.mockClear();
    // Find the Reject button in the container DOM
    const buttons = container.querySelectorAll('button');
    let rejectButton: HTMLButtonElement | null = null;
    buttons.forEach((btn) => {
      if (btn.textContent === 'Reject') rejectButton = btn as HTMLButtonElement;
    });
    expect(rejectButton).not.toBeNull();
    rejectButton!.click();
    expect(mockRtcDisconnect).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Peer Rejected',
      'Connection closed — peer identity was not verified',
    );
  });

  it('connectionStateHandler updates signalingConnected from signaling', () => {
    expect(captured.connectionStateHandler).toBeTypeOf('function');
    mockStore.state.signalingConnected = true;
    captured.connectionStateHandler!();
    // Mock DualSignaling.isConnected() returns false
    expect(mockStore.state.signalingConnected).toBe(false);
  });

  it('store subscription toggles verification row visibility', () => {
    // The store.subscribe callback shows/hides verification row based on isConnected
    const subscribeCalls = mockStore.subscribe.mock.calls;
    expect(subscribeCalls.length).toBeGreaterThan(0);
    const subscribeCallback = subscribeCalls[0][0];

    // When disconnected, verification row should be hidden
    mockStore.state.isConnected = false;
    subscribeCallback();
    const verificationRow = container.querySelectorAll('.flex.items-center.gap-3');
    const row = verificationRow[0] as HTMLElement;
    expect(row.hidden).toBe(true);

    // When connected, verification row should be visible
    mockStore.state.isConnected = true;
    subscribeCallback();
    expect(row.hidden).toBe(false);
  });
});
