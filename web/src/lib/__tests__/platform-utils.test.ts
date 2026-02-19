import { describe, it, expect } from 'vitest';
import { isPrivateIP, getLocalOnlyRTCConfig, getPlatformICEServers } from '../platform-utils';

describe('isPrivateIP', () => {
  it('detects 10.x.x.x as private', () => {
    expect(isPrivateIP('10.0.0.1')).toBe(true);
    expect(isPrivateIP('10.255.255.255')).toBe(true);
  });

  it('detects 172.16-31.x.x as private', () => {
    expect(isPrivateIP('172.16.0.1')).toBe(true);
    expect(isPrivateIP('172.31.255.255')).toBe(true);
  });

  it('rejects 172.15.x.x and 172.32.x.x as non-private', () => {
    expect(isPrivateIP('172.15.0.1')).toBe(false);
    expect(isPrivateIP('172.32.0.1')).toBe(false);
  });

  it('detects 192.168.x.x as private', () => {
    expect(isPrivateIP('192.168.1.1')).toBe(true);
    expect(isPrivateIP('192.168.0.100')).toBe(true);
  });

  it('detects 169.254.x.x (link-local) as private', () => {
    expect(isPrivateIP('169.254.1.1')).toBe(true);
  });

  it('detects IPv6 ULA as private', () => {
    expect(isPrivateIP('fc00::1')).toBe(true);
    expect(isPrivateIP('fd12::1')).toBe(true);
  });

  it('detects IPv6 link-local as private', () => {
    expect(isPrivateIP('fe80::1')).toBe(true);
  });

  it('rejects public IPs', () => {
    expect(isPrivateIP('8.8.8.8')).toBe(false);
    expect(isPrivateIP('1.1.1.1')).toBe(false);
    expect(isPrivateIP('203.0.113.1')).toBe(false);
  });

  it('handles empty and invalid input', () => {
    expect(isPrivateIP('')).toBe(false);
    expect(isPrivateIP('not-an-ip')).toBe(false);
  });
});

describe('getLocalOnlyRTCConfig', () => {
  it('returns a valid RTCConfiguration', () => {
    const config = getLocalOnlyRTCConfig();
    expect(config).toBeDefined();
    expect(config.iceServers).toBeDefined();
    expect(config.iceTransportPolicy).toBe('all');
    expect(config.bundlePolicy).toBe('max-bundle');
    expect(config.rtcpMuxPolicy).toBe('require');
  });

  it('includes STUN servers', () => {
    const config = getLocalOnlyRTCConfig();
    expect(config.iceServers!.length).toBeGreaterThan(0);
    const urls = config.iceServers!.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('stun:'))).toBe(true);
  });

  it('does not include TURN servers', () => {
    const servers = getPlatformICEServers();
    const urls = servers.flatMap(s => Array.isArray(s.urls) ? s.urls : [s.urls]);
    expect(urls.some(u => u.startsWith('turn:'))).toBe(false);
  });
});
