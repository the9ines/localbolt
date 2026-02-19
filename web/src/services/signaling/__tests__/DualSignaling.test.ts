import { describe, it, expect, vi } from 'vitest';
import type { SignalingProvider, SignalMessage, DiscoveredDevice } from '../SignalingProvider';

// Mock signaling provider for testing DualSignaling logic
class MockSignaling implements SignalingProvider {
  readonly name: string;
  connected = false;
  shouldFail = false;
  peers: DiscoveredDevice[] = [];

  private signalCbs: Array<(signal: SignalMessage) => void> = [];
  private peerDiscoveredCb: ((peer: DiscoveredDevice) => void) | null = null;
  private peerLostCb: ((code: string) => void) | null = null;

  constructor(name: string) {
    this.name = name;
  }

  async connect(): Promise<void> {
    if (this.shouldFail) throw new Error(`${this.name} connect failed`);
    this.connected = true;
  }

  onSignal(cb: (signal: SignalMessage) => void) { this.signalCbs.push(cb); }
  onPeerDiscovered(cb: (peer: DiscoveredDevice) => void) { this.peerDiscoveredCb = cb; }
  onPeerLost(cb: (code: string) => void) { this.peerLostCb = cb; }

  async sendSignal(_type: SignalMessage['type'], _data: any, _to: string): Promise<void> {
    if (!this.connected) throw new Error('Not connected');
  }

  getPeers(): DiscoveredDevice[] { return this.peers; }

  disconnect() {
    this.connected = false;
    this.signalCbs = [];
    this.peerDiscoveredCb = null;
    this.peerLostCb = null;
  }

  // Test helpers to simulate events
  simulatePeerDiscovered(peer: DiscoveredDevice) { this.peerDiscoveredCb?.(peer); }
  simulatePeerLost(code: string) { this.peerLostCb?.(code); }
  simulateSignal(signal: SignalMessage) { this.signalCbs.forEach(cb => cb(signal)); }
}

describe('DualSignaling logic', () => {
  const peer1: DiscoveredDevice = { peerCode: 'PEER1', deviceName: 'Mac', deviceType: 'laptop' };
  const peer2: DiscoveredDevice = { peerCode: 'PEER2', deviceName: 'iPhone', deviceType: 'phone' };

  it('merges peers from both sources without duplicates', () => {
    const allPeers = new Map<string, DiscoveredDevice>();
    const peerSource = new Map<string, string>();

    function addPeer(peer: DiscoveredDevice, source: string) {
      if (allPeers.has(peer.peerCode)) return;
      allPeers.set(peer.peerCode, peer);
      peerSource.set(peer.peerCode, source);
    }

    addPeer(peer1, 'local');
    addPeer(peer1, 'cloud'); // duplicate
    addPeer(peer2, 'cloud');

    expect(allPeers.size).toBe(2);
    expect(peerSource.get('PEER1')).toBe('local');
    expect(peerSource.get('PEER2')).toBe('cloud');
  });

  it('removes peer only from originating source', () => {
    const allPeers = new Map<string, DiscoveredDevice>();
    const peerSource = new Map<string, string>();

    allPeers.set(peer1.peerCode, peer1);
    peerSource.set(peer1.peerCode, 'local');

    // Cloud tries to remove a local peer -- should not happen
    function removePeer(code: string, source: string) {
      if (peerSource.get(code) !== source) return false;
      allPeers.delete(code);
      peerSource.delete(code);
      return true;
    }

    expect(removePeer('PEER1', 'cloud')).toBe(false);
    expect(allPeers.has('PEER1')).toBe(true);

    expect(removePeer('PEER1', 'local')).toBe(true);
    expect(allPeers.has('PEER1')).toBe(false);
  });

  it('routes signal to correct source', async () => {
    const local = new MockSignaling('local');
    const cloud = new MockSignaling('cloud');
    local.connected = true;
    cloud.connected = true;

    const peerSource = new Map<string, string>();
    peerSource.set('PEER1', 'local');
    peerSource.set('PEER2', 'cloud');

    const localSend = vi.spyOn(local, 'sendSignal');
    const cloudSend = vi.spyOn(cloud, 'sendSignal');

    // Route to local peer
    const source1 = peerSource.get('PEER1');
    if (source1 === 'local') await local.sendSignal('offer', {}, 'PEER1');
    expect(localSend).toHaveBeenCalledWith('offer', {}, 'PEER1');

    // Route to cloud peer
    const source2 = peerSource.get('PEER2');
    if (source2 === 'cloud') await cloud.sendSignal('offer', {}, 'PEER2');
    expect(cloudSend).toHaveBeenCalledWith('offer', {}, 'PEER2');
  });

  it('succeeds when one server fails to connect', async () => {
    const local = new MockSignaling('local');
    const cloud = new MockSignaling('cloud');
    local.shouldFail = true;

    const results = await Promise.allSettled([
      local.connect('CODE', 'Mac', 'laptop'),
      cloud.connect('CODE', 'Mac', 'laptop'),
    ]);

    const anyConnected = results.some(r => r.status === 'fulfilled');
    expect(anyConnected).toBe(true);
    expect(local.connected).toBe(false);
    expect(cloud.connected).toBe(true);
  });

  it('fails when both servers fail to connect', async () => {
    const local = new MockSignaling('local');
    const cloud = new MockSignaling('cloud');
    local.shouldFail = true;
    cloud.shouldFail = true;

    const results = await Promise.allSettled([
      local.connect('CODE', 'Mac', 'laptop'),
      cloud.connect('CODE', 'Mac', 'laptop'),
    ]);

    const anyConnected = results.some(r => r.status === 'fulfilled');
    expect(anyConnected).toBe(false);
  });

  it('deduplicates signals received from both sources', () => {
    const received: SignalMessage[] = [];
    const seen = new Set<string>();

    const signal: SignalMessage = { type: 'offer', data: {}, from: 'PEER1', to: 'ME' };

    function handleSignal(s: SignalMessage) {
      const key = `${s.type}:${s.from}:${JSON.stringify(s.data)}`;
      if (seen.has(key)) return;
      seen.add(key);
      received.push(s);
    }

    handleSignal(signal); // from local
    handleSignal(signal); // same signal from cloud

    expect(received.length).toBe(1);
  });
});
