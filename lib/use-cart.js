'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { CART_EVENT, CART_KEY } from './catalog';
import { loadCart, parseCart, persistCart } from './cart';

function subscribe(onChange) {
  window.addEventListener('storage', onChange);
  window.addEventListener(CART_EVENT, onChange);
  return () => {
    window.removeEventListener('storage', onChange);
    window.removeEventListener(CART_EVENT, onChange);
  };
}

function snapshot() {
  try { return window.localStorage.getItem(CART_KEY) || ''; } catch { return ''; }
}

function setCart(update) {
  persistCart(typeof update === 'function' ? update(loadCart()) : update);
}

export function useCart() {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const cart = useMemo(() => parseCart(raw), [raw]);
  return [cart, setCart, raw !== null];
}
