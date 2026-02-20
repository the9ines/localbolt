import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isPrivateIP, getLocalOnlyRTCConfig, getPlatformICEServers, getMaxChunkSize, detectDevice, getDeviceName, isLocalCandidate } from '../platform-utils';

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

  it('detects CGNAT/Tailscale range 100.64-127.x.x as private', () => {
    expect(isPrivateIP('100.64.0.1')).toBe(true);
    expect(isPrivateIP('100.100.1.5')).toBe(true);
    expect(isPrivateIP('100.127.255.255')).toBe(true);
  });

  it('rejects 100.x outside CGNAT range', () => {
    expect(isPrivateIP('100.63.0.1')).toBe(false);
    expect(isPrivateIP('100.128.0.1')).toBe(false);
    expect(isPrivateIP('100.0.0.1')).toBe(false);
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

  it('sets iceCandidatePoolSize', () => {
    const config = getLocalOnlyRTCConfig();
    expect(config.iceCandidatePoolSize).toBe(10);
  });
});

describe('getPlatformICEServers', () => {
  it('returns an array of ICE servers', () => {
    const servers = getPlatformICEServers();
    expect(Array.isArray(servers)).toBe(true);
    expect(servers.length).toBeGreaterThan(0);
  });

  it('every server has a urls property', () => {
    const servers = getPlatformICEServers();
    for (const s of servers) {
      expect(s.urls).toBeDefined();
    }
  });
});

describe('getMaxChunkSize (with window mock)', () => {
  const origWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel' }, document: {} };
    (globalThis as any).document = {};
  });

  afterEach(() => {
    if (origWindow) (globalThis as any).window = origWindow;
    else delete (globalThis as any).window;
  });

  it('returns a positive number', () => {
    const size = getMaxChunkSize();
    expect(size).toBeGreaterThan(0);
  });

  it('returns a power of 2', () => {
    const size = getMaxChunkSize();
    expect(Math.log2(size) % 1).toBe(0);
  });
});

describe('detectDevice (with window mock)', () => {
  const origWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', platform: 'MacIntel' } };
    (globalThis as any).document = {};
  });

  afterEach(() => {
    if (origWindow) (globalThis as any).window = origWindow;
    else delete (globalThis as any).window;
  });

  it('returns a DeviceInfo object with all required fields', () => {
    const info = detectDevice();
    expect(info).toHaveProperty('isWindows');
    expect(info).toHaveProperty('isMac');
    expect(info).toHaveProperty('isLinux');
    expect(info).toHaveProperty('isAndroid');
    expect(info).toHaveProperty('isIOS');
    expect(info).toHaveProperty('isSteamDeck');
    expect(info).toHaveProperty('isMobile');
    expect(info).toHaveProperty('platform');
    expect(info).toHaveProperty('deviceName');
  });

  it('returns boolean values for device flags', () => {
    const info = detectDevice();
    expect(typeof info.isWindows).toBe('boolean');
    expect(typeof info.isMac).toBe('boolean');
    expect(typeof info.isLinux).toBe('boolean');
    expect(typeof info.isAndroid).toBe('boolean');
    expect(typeof info.isIOS).toBe('boolean');
    expect(typeof info.isSteamDeck).toBe('boolean');
    expect(typeof info.isMobile).toBe('boolean');
  });

  it('returns a non-empty deviceName', () => {
    const info = detectDevice();
    expect(info.deviceName.length).toBeGreaterThan(0);
  });

  it('detects Mac from macOS user agent', () => {
    const info = detectDevice();
    expect(info.isMac).toBe(true);
    expect(info.deviceName).toBe('Mac');
  });

  it('detects Windows from Windows user agent', () => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', platform: 'Win32' } };
    const info = detectDevice();
    expect(info.isWindows).toBe(true);
    expect(info.deviceName).toBe('Windows PC');
  });

  it('detects Android from Android user agent', () => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (Linux; Android 14)', platform: 'Linux armv8l' } };
    const info = detectDevice();
    expect(info.isAndroid).toBe(true);
    expect(info.isMobile).toBe(true);
    expect(info.deviceName).toBe('Android');
  });

  it('detects iPhone from iOS user agent', () => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', platform: 'iPhone' } };
    const info = detectDevice();
    expect(info.isIOS).toBe(true);
    expect(info.isMobile).toBe(true);
    expect(info.deviceName).toBe('iPhone');
  });
});

describe('getDeviceName (with window mock)', () => {
  const origWindow = globalThis.window;

  beforeEach(() => {
    (globalThis as any).window = { navigator: { userAgent: 'Mozilla/5.0 (Macintosh)', platform: 'MacIntel' } };
    (globalThis as any).document = {};
  });

  afterEach(() => {
    if (origWindow) (globalThis as any).window = origWindow;
    else delete (globalThis as any).window;
  });

  it('returns a non-empty string', () => {
    const name = getDeviceName();
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });
});

describe('isLocalCandidate', () => {
  it('accepts host candidates', () => {
    const candidate = { candidate: 'candidate:1 1 udp 2122260223 192.168.1.1 54321 typ host', type: 'host' } as RTCIceCandidate;
    expect(isLocalCandidate(candidate)).toBe(true);
  });

  it('accepts srflx candidates', () => {
    const candidate = { candidate: 'candidate:1 1 udp 1686052607 1.2.3.4 54321 typ srflx raddr 192.168.1.1 rport 54321', type: 'srflx' } as RTCIceCandidate;
    expect(isLocalCandidate(candidate)).toBe(true);
  });

  it('rejects relay candidates', () => {
    const candidate = { candidate: 'candidate:1 1 udp 41885439 1.2.3.4 54321 typ relay raddr 192.168.1.1 rport 54321', type: 'relay' } as RTCIceCandidate;
    expect(isLocalCandidate(candidate)).toBe(false);
  });

  it('parses type from candidate string when type property is missing', () => {
    const candidate = { candidate: 'candidate:1 1 udp 2122260223 192.168.1.1 54321 typ host' } as RTCIceCandidate;
    expect(isLocalCandidate(candidate)).toBe(true);
  });

  it('rejects candidates with empty candidate string and no type', () => {
    const candidate = { candidate: '' } as RTCIceCandidate;
    expect(isLocalCandidate(candidate)).toBe(false);
  });
});
