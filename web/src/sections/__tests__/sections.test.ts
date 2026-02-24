// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';

// ── Mock @the9ines/bolt-transport-web ───────────────────────────────────
const subscribers: Array<() => void> = [];
const storeState: Record<string, unknown> = { signalingConnected: false };

vi.mock('@the9ines/bolt-transport-web', () => {
  const iconFn = (cls?: string) => `<svg class="${cls ?? ''}"></svg>`;
  return {
    store: {
      getState: () => ({ ...storeState }),
      setState: (partial: Record<string, unknown>) => Object.assign(storeState, partial),
      subscribe: (fn: () => void) => { subscribers.push(fn); },
    },
    icons: new Proxy({}, { get: () => iconFn }),
  };
});

// ── Tests ───────────────────────────────────────────────────────────────
import { createHeader } from '../header';
import { createFooter } from '../footer';

describe('createHeader', () => {
  it('returns a <header> element', () => {
    const el = createHeader();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName).toBe('HEADER');
  });

  it('store.subscribe callback runs without throwing', () => {
    createHeader();
    // Trigger all captured subscribers — should not throw
    storeState.signalingConnected = true;
    expect(() => subscribers.forEach((fn) => fn())).not.toThrow();

    storeState.signalingConnected = false;
    expect(() => subscribers.forEach((fn) => fn())).not.toThrow();
  });
});

describe('createFooter', () => {
  it('returns a <footer> element', () => {
    const el = createFooter();
    expect(el).toBeInstanceOf(HTMLElement);
    expect(el.tagName).toBe('FOOTER');
  });

  it('contains a <dialog> element', () => {
    const el = createFooter();
    expect(el.querySelector('dialog')).not.toBeNull();
  });

  it('dialog close button and backdrop click do not throw', () => {
    const el = createFooter();
    const dialog = el.querySelector('dialog')!;
    // Stub showModal/close since jsdom may not implement them
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();

    // Close button (has aria-label="Close")
    const closeBtn = dialog.querySelector('[aria-label="Close"]')!;
    expect(() => closeBtn.dispatchEvent(new Event('click', { bubbles: true }))).not.toThrow();
    expect(dialog.close).toHaveBeenCalled();

    // Backdrop click (event target is the dialog itself)
    const backdropEvt = new Event('click', { bubbles: true });
    Object.defineProperty(backdropEvt, 'target', { value: dialog });
    expect(() => dialog.dispatchEvent(backdropEvt)).not.toThrow();
  });

  it('privacy button click does not throw', () => {
    const el = createFooter();
    const dialog = el.querySelector('dialog')!;
    dialog.showModal = vi.fn();
    dialog.close = vi.fn();

    // Privacy button is in the footer, not in the dialog
    const buttons = el.querySelectorAll('button');
    const privacyBtn = Array.from(buttons).find(
      (b) => b.textContent?.trim() === 'Privacy',
    );
    expect(privacyBtn).toBeTruthy();
    expect(() => privacyBtn!.dispatchEvent(new Event('click', { bubbles: true }))).not.toThrow();
    expect(dialog.showModal).toHaveBeenCalled();
  });
});
