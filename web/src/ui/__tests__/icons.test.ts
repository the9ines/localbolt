import { describe, it, expect } from 'vitest';
import { icons } from '../icons';

describe('icons', () => {
  it('returns valid SVG strings', () => {
    const svg = icons.zap();
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('applies custom class', () => {
    const svg = icons.shield('w-5 h-5 text-neon');
    expect(svg).toContain('class="w-5 h-5 text-neon"');
  });

  it('uses empty class by default', () => {
    const svg = icons.lock();
    expect(svg).toContain('class=""');
  });

  it('has stroke-based rendering for regular icons', () => {
    const svg = icons.wifi('test');
    expect(svg).toContain('stroke="currentColor"');
    expect(svg).toContain('fill="none"');
  });

  it('has fill-based rendering for filled icons', () => {
    const svg = icons.shieldFilled('test');
    expect(svg).toContain('fill="currentColor"');
  });

  it('exports all expected icon names', () => {
    const expectedIcons = [
      'zap', 'shield', 'shieldFilled', 'wifi', 'laptop', 'server',
      'lock', 'globe', 'clock', 'arrowDown', 'share2', 'smartphone',
      'tablet', 'monitor', 'upload', 'file', 'pause', 'play', 'x',
      'copy', 'check', 'eye', 'eyeOff', 'radio', 'messageCircle', 'userX',
    ];
    for (const name of expectedIcons) {
      expect(icons).toHaveProperty(name);
      expect(typeof (icons as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('uses viewBox 0 0 24 24', () => {
    const svg = icons.globe();
    expect(svg).toContain('viewBox="0 0 24 24"');
  });
});
