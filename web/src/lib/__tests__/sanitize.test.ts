import { describe, it, expect } from 'vitest';
import { escapeHTML } from '@the9ines/bolt-transport-web';

describe('escapeHTML', () => {
  it('escapes ampersands', () => {
    expect(escapeHTML('a&b')).toBe('a&amp;b');
  });

  it('escapes less-than', () => {
    expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
  });

  it('escapes greater-than', () => {
    expect(escapeHTML('a>b')).toBe('a&gt;b');
  });

  it('escapes double quotes', () => {
    expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHTML("it's")).toBe("it&#039;s");
  });

  it('escapes all special characters together', () => {
    expect(escapeHTML('<img src="x" onerror=\'alert(1)\'>&')).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#039;alert(1)&#039;&gt;&amp;'
    );
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHTML('hello world 123')).toBe('hello world 123');
  });

  it('handles empty string', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('handles multiple consecutive special chars', () => {
    expect(escapeHTML('<<>>')).toBe('&lt;&lt;&gt;&gt;');
  });
});
