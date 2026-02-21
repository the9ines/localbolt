import { describe, it, expect } from 'vitest';
import { WebRTCError, ConnectionError, SignalingError, TransferError, EncryptionError } from '../webrtc-errors';

describe('WebRTC error hierarchy', () => {
  it('WebRTCError extends Error', () => {
    const err = new WebRTCError('test');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WebRTCError);
    expect(err.name).toBe('BoltError');
    expect(err.message).toBe('test');
  });

  it('ConnectionError extends WebRTCError', () => {
    const err = new ConnectionError('conn failed');
    expect(err).toBeInstanceOf(WebRTCError);
    expect(err).toBeInstanceOf(ConnectionError);
    expect(err.name).toBe('ConnectionError');
  });

  it('SignalingError extends WebRTCError', () => {
    const err = new SignalingError('signal failed');
    expect(err).toBeInstanceOf(WebRTCError);
    expect(err.name).toBe('SignalingError');
  });

  it('TransferError extends WebRTCError', () => {
    const err = new TransferError('transfer failed');
    expect(err).toBeInstanceOf(WebRTCError);
    expect(err.name).toBe('TransferError');
  });

  it('EncryptionError extends WebRTCError', () => {
    const err = new EncryptionError('encrypt failed');
    expect(err).toBeInstanceOf(WebRTCError);
    expect(err.name).toBe('EncryptionError');
  });

  it('preserves details', () => {
    const details = { code: 42, reason: 'timeout' };
    const err = new ConnectionError('failed', details);
    expect(err.details).toEqual(details);
  });
});
