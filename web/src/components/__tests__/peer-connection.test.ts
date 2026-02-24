// @vitest-environment jsdom
import { describe, it, expect, vi, beforeAll } from 'vitest';

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

// ── Mock @the9ines/bolt-core ────────────────────────────────────────────
vi.mock('@the9ines/bolt-core', () => ({
  generateSecurePeerCode: () => 'TEST-CODE',
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
    constructor(_sig: any, _code: any, fileReceive: any, errorFn: any, progressFn: any) {
      captured.fileReceive = fileReceive;
      captured.connectionError = errorFn;
      captured.receiveProgress = progressFn;
    }
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
    container = createPeerConnection();
    await flush(); // resolve DualSignaling.connect().then()
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
    mockStore.state.peers = [{ peerCode: 'PEER-B' }];
    mockStore.state.connectingTo = 'PEER-B';
    mockStore.state.incomingRequest = null;
    captured.peerLost!('PEER-B');
    expect(mockStore.state.connectingTo).toBeNull();
    expect(mockShowToast).toHaveBeenCalled();
  });

  it('onPeerLost cleans up incomingRequest if lost peer had pending request', () => {
    mockStore.state.peers = [{ peerCode: 'PEER-C' }];
    mockStore.state.connectingTo = null;
    mockStore.state.incomingRequest = { peerCode: 'PEER-C' };
    captured.peerLost!('PEER-C');
    expect(mockStore.state.incomingRequest).toBeNull();
  });

  // ── Connection approval protocol ────────────────────────────────────

  it('connection_request sets incomingRequest', () => {
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
  });

  it('connection_request auto-declines when busy', () => {
    mockStore.state.isConnected = true;
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
    mockStore.state.isConnected = false;
  });

  it('connection_accepted triggers rtcService.connect', () => {
    mockStore.state.connectingTo = 'PEER-X';
    mockRtcConnect.mockClear();
    captured.signalHandler!({
      type: 'connection_accepted',
      from: 'PEER-X',
      data: {},
    });
    expect(mockRtcConnect).toHaveBeenCalledWith('PEER-X');
  });

  it('connection_accepted ignores stale signal', () => {
    mockStore.state.connectingTo = 'OTHER';
    mockRtcConnect.mockClear();
    captured.signalHandler!({
      type: 'connection_accepted',
      from: 'PEER-X',
      data: {},
    });
    expect(mockRtcConnect).not.toHaveBeenCalled();
  });

  it('connection_declined clears connectingTo', () => {
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
    mockStore.state.peers = [{ peerCode: 'REMOTE-CODE' }];
    mockSetWebrtcRef.mockClear();
    captured.rtcStateChange!('connected');
    expect(mockStore.state.isConnected).toBe(true);
    expect(mockSetWebrtcRef).toHaveBeenCalled();
  });

  it('handleConnectionStateChange — disconnected', () => {
    captured.rtcStateChange!('disconnected');
    expect(mockStore.state.isConnected).toBe(false);
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

  it('handleConnectionError calls showToast', () => {
    mockShowToast.mockClear();
    const err = new Error('fail');
    err.name = 'ConnectionError';
    captured.connectionError!(err);
    expect(mockShowToast).toHaveBeenCalled();
    expect(mockStore.state.isConnected).toBe(false);
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

  it('selectPeer sends connection request', () => {
    mockStore.state.isConnected = false;
    mockSendSignal.mockClear();
    const selectPeer = captured.discoveryArgs![0];
    selectPeer('TARGET-PEER');
    expect(mockStore.state.connectingTo).toBe('TARGET-PEER');
    expect(mockSendSignal).toHaveBeenCalled();
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
  });

  it('acceptRequest sends acceptance signal', () => {
    mockStore.state.incomingRequest = { peerCode: 'REQ-PEER', deviceName: 'D', deviceType: 'desktop' };
    mockSendSignal.mockClear();
    const acceptFn = captured.discoveryArgs![2];
    acceptFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_accepted', {}, 'REQ-PEER');
    expect(mockStore.state.incomingRequest).toBeNull();
  });

  it('declineRequest sends decline signal', () => {
    mockStore.state.incomingRequest = { peerCode: 'REQ-PEER', deviceName: 'D', deviceType: 'desktop' };
    mockSendSignal.mockClear();
    const declineFn = captured.discoveryArgs![3];
    declineFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_declined', { reason: 'user_declined' }, 'REQ-PEER');
    expect(mockStore.state.incomingRequest).toBeNull();
  });

  it('cancelRequest sends cancel signal', () => {
    mockStore.state.connectingTo = 'TARGET-PEER';
    mockSendSignal.mockClear();
    const cancelFn = captured.discoveryArgs![4];
    cancelFn();
    expect(mockSendSignal).toHaveBeenCalledWith('connection_declined', { reason: 'cancelled' }, 'TARGET-PEER');
    expect(mockStore.state.connectingTo).toBeNull();
  });
});
