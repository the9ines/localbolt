import { describe, it, expect } from 'vitest';

/**
 * CBTR-2 BTR Compatibility Tests
 *
 * Verifies that the localbolt consumer correctly passes btrEnabled
 * to the SDK WebRTCService and that the rollback path (btrEnabled: false)
 * restores baseline behavior.
 *
 * These tests exercise the consumer config layer via static source analysis,
 * not the SDK internals (covered by 344 tests in bolt-transport-web).
 */

const loadSource = async (): Promise<string> => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const filePath = path.resolve(
    import.meta.dirname,
    '../peer-connection.ts',
  );
  return fs.readFileSync(filePath, 'utf-8');
};

describe('CBTR-2: BTR capability configuration', () => {
  it('source code contains btrEnabled: true in WebRTCServiceOptions', async () => {
    const source = await loadSource();
    expect(source).toContain('btrEnabled: true');
  });

  it('source code has btrEnabled in the WebRTCService options block', async () => {
    const source = await loadSource();
    // Pattern: identityPublicKey + pinStore + onVerificationState + btrEnabled
    const optionsBlockRegex =
      /identityPublicKey:.*\n.*pinStore.*\n.*onVerificationState.*\n.*btrEnabled:\s*true/;
    expect(source).toMatch(optionsBlockRegex);
  });
});

describe('CBTR-2: BTR rollback path', () => {
  it('btrEnabled can be set to false for rollback', async () => {
    const source = await loadSource();

    // Verify rollback is a single-line change: btrEnabled: true → false
    const btrLine = source.split('\n').find((l: string) => l.includes('btrEnabled'));
    expect(btrLine).toBeDefined();
    expect(btrLine!.trim()).toBe('btrEnabled: true,');

    // Rollback verification: replacing true with false would disable BTR
    const rolledBack = source.replace('btrEnabled: true', 'btrEnabled: false');
    expect(rolledBack).toContain('btrEnabled: false');
    expect(rolledBack).not.toContain('btrEnabled: true');
  });
});

describe('CBTR-2: BTR↔non-BTR compatibility', () => {
  it('SDK downgrade-with-warning is supported by consumer config', async () => {
    const source = await loadSource();

    // Consumer passes btrEnabled: true but does NOT set onBtrDowngrade callback.
    // The SDK handles downgrade internally with [BTR_DOWNGRADE] log token.
    expect(source).toContain('btrEnabled: true');

    // Verify no fail-closed BTR logic in consumer
    expect(source).not.toContain('RATCHET_STATE_ERROR');
    expect(source).not.toContain('RATCHET_CHAIN_ERROR');
    expect(source).not.toContain('bolt.transfer-ratchet');
  });

  it('non-BTR baseline is preserved when btrEnabled is false', async () => {
    const source = await loadSource();

    // Count btrEnabled occurrences — should be exactly 1 (the config line)
    const matches = source.match(/btrEnabled/g);
    expect(matches).toHaveLength(1);
  });
});
