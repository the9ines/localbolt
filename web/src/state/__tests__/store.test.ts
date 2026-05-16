import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppStore } from '@the9ines/localbolt-browser';

describe('AppStore', () => {
  let store: InstanceType<typeof AppStore>;

  beforeEach(() => {
    store = new AppStore();
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
