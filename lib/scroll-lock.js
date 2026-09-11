'use client';

import { useEffect } from 'react';

/**
 * Freezes page scroll while an overlay is open.
 *
 * `overflow: hidden` on the document is not honoured by iOS Safari, so the
 * body is pinned with `position: fixed` and offset by the current scroll
 * position instead — the page stays visually put and is restored on release.
 *
 * Locks are counted, so a modal opened on top of the cart drawer does not
 * release the page when only one of them closes.
 */
let locks = 0;
let savedY = 0;

export function lockScroll() {
  if (typeof document === 'undefined') return;
  locks += 1;
  if (locks > 1) return;
  savedY = window.scrollY;
  const { style } = document.body;
  style.position = 'fixed';
  style.top = `-${savedY}px`;
  style.left = '0';
  style.right = '0';
  style.width = '100%';
}

export function unlockScroll() {
  if (typeof document === 'undefined' || locks === 0) return;
  locks -= 1;
  if (locks > 0) return;
  const { style } = document.body;
  style.position = '';
  style.top = '';
  style.left = '';
  style.right = '';
  style.width = '';
  window.scrollTo(0, savedY);
}

export function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined;
    lockScroll();
    return unlockScroll;
  }, [active]);
}
