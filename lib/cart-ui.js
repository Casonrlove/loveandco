'use client';

/** Fired to open the global bag drawer from anywhere in the app. */
export const CART_OPEN_EVENT = 'love-and-co-cart-open';

export function openCart() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(CART_OPEN_EVENT));
}
