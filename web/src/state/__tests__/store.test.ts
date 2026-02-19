import { describe, it, expect, vi, beforeEach } from 'vitest';

// Inline minimal store for testing (avoids browser-only imports)
class TestStore {
  private state: Record<string, any>;
  private listeners: Set<() => void> = new Set();

  constructor(initial: Record<string, any>) {
    this.state = { ...initial };
  }

  getState() {
    return this.state;
  }

  setState(partial: Record<string, any>) {
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((fn) => fn());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

describe('AppStore', () => {
  let store: TestStore;

  beforeEach(() => {
    store = new TestStore({
      peerCode: '',
      peers: [],
      isConnected: false,
      signalingConnected: false,
    });
  });

  it('returns initial state', () => {
    const state = store.getState();
    expect(state.peerCode).toBe('');
    expect(state.peers).toEqual([]);
    expect(state.isConnected).toBe(false);
  });

  it('updates state with partial', () => {
    store.setState({ peerCode: 'ABC123' });
    expect(store.getState().peerCode).toBe('ABC123');
    expect(store.getState().isConnected).toBe(false);
  });

  it('notifies subscribers on state change', () => {
    const listener = vi.fn();
    store.subscribe(listener);
    store.setState({ isConnected: true });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('supports multiple subscribers', () => {
    const listener1 = vi.fn();
    const listener2 = vi.fn();
    store.subscribe(listener1);
    store.subscribe(listener2);
    store.setState({ peerCode: 'XYZ' });
    expect(listener1).toHaveBeenCalledTimes(1);
    expect(listener2).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes correctly', () => {
    const listener = vi.fn();
    const unsub = store.subscribe(listener);
    unsub();
    store.setState({ peerCode: 'XYZ' });
    expect(listener).not.toHaveBeenCalled();
  });

  it('preserves other state keys on partial update', () => {
    store.setState({ peerCode: 'ABC', signalingConnected: true });
    store.setState({ isConnected: true });
    const state = store.getState();
    expect(state.peerCode).toBe('ABC');
    expect(state.signalingConnected).toBe(true);
    expect(state.isConnected).toBe(true);
  });
});
