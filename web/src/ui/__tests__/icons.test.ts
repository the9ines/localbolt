import { describe, it, expect } from 'vitest';
import { icons } from '@the9ines/bolt-transport-web';

const allIconNames = [
  'zap', 'shield', 'shieldFilled', 'wifi', 'laptop', 'server',
  'lock', 'globe', 'clock', 'arrowDown', 'share2', 'smartphone',
  'tablet', 'monitor', 'upload', 'file', 'pause', 'play', 'x',
  'copy', 'check', 'eye', 'eyeOff', 'radio', 'messageCircle', 'userX',
];

describe('icons', () => {
  it('exports all expected icon names', () => {
    for (const name of allIconNames) {
      expect(icons).toHaveProperty(name);
      expect(typeof (icons as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('does not export unexpected icons', () => {
    const actualKeys = Object.keys(icons);
    for (const key of actualKeys) {
      expect(allIconNames).toContain(key);
    }
  });
});

describe('each icon returns valid SVG', () => {
  for (const name of allIconNames) {
    it(`${name} returns valid SVG markup`, () => {
      const fn = (icons as Record<string, (cls?: string) => string>)[name];
      const svg = fn();
      expect(svg).toContain('<svg');
      expect(svg).toContain('</svg>');
      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
      expect(svg).toContain('viewBox="0 0 24 24"');
    });

    it(`${name} applies custom class`, () => {
      const fn = (icons as Record<string, (cls?: string) => string>)[name];
      const svg = fn('w-5 h-5 text-neon');
      expect(svg).toContain('class="w-5 h-5 text-neon"');
    });

    it(`${name} uses empty class by default`, () => {
      const fn = (icons as Record<string, (cls?: string) => string>)[name];
      const svg = fn();
      expect(svg).toContain('class=""');
    });
  }
});

describe('icon rendering modes', () => {
  const strokeIcons = allIconNames.filter(n => n !== 'shieldFilled');
  const filledIcons = ['shieldFilled'];

  for (const name of strokeIcons) {
    it(`${name} uses stroke-based rendering`, () => {
      const fn = (icons as Record<string, (cls?: string) => string>)[name];
      const svg = fn();
      expect(svg).toContain('stroke="currentColor"');
      expect(svg).toContain('fill="none"');
    });
  }

  for (const name of filledIcons) {
    it(`${name} uses fill-based rendering`, () => {
      const fn = (icons as Record<string, (cls?: string) => string>)[name];
      const svg = fn();
      expect(svg).toContain('fill="currentColor"');
    });
  }
});

describe('icon SVG content', () => {
  it('zap contains a polygon', () => {
    expect(icons.zap()).toContain('<polygon');
  });

  it('shield contains a path', () => {
    expect(icons.shield()).toContain('<path');
  });

  it('server contains rect elements', () => {
    expect(icons.server()).toContain('<rect');
  });

  it('globe contains a circle', () => {
    expect(icons.globe()).toContain('<circle');
  });

  it('check contains a path', () => {
    expect(icons.check()).toContain('<path');
  });

  it('x contains paths for the cross', () => {
    const svg = icons.x();
    expect(svg).toContain('<path');
    expect((svg.match(/<path/g) || []).length).toBe(2);
  });

  it('pause contains two rects', () => {
    const svg = icons.pause();
    expect((svg.match(/<rect/g) || []).length).toBe(2);
  });

  it('play contains a polygon', () => {
    expect(icons.play()).toContain('<polygon');
  });
});
