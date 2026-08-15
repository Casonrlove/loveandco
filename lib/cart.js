import { CART_EVENT, CART_KEY } from './catalog.js';

export function loadCart() {
  try {
    return JSON.parse(window.localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

export function persistCart(cart) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event(CART_EVENT));
}

export function lineProductId(item) {
  if (item.productId) return item.productId;
  const id = String(item.id || '');
  return id.includes('::') ? id.split('::')[0] : id;
}

function emptyDesign(item, quantity, createId) {
  return {
    ...item,
    id: `${lineProductId(item)}::${createId()}`,
    productId: lineProductId(item),
    quantity,
    designName: '',
    bundleTheme: '',
    napkinColor: '',
    towelLetter: '',
    monogram: '',
    monogramFirst: '',
    monogramMiddle: '',
    monogramLast: '',
    threadColor: '',
    placement: '',
    extraNotes: '',
    bundleAddons: { outfit: 0, burp: 0, bib: 0, paci: 0 },
    nameVerified: false,
    nameVerifiedAt: '',
    nameVerifiedValue: '',
  };
}

export function splitCartLine(cart, id, count = 1, { createId = () => crypto.randomUUID() } = {}) {
  const index = cart.findIndex((item) => item.id === id);
  if (index === -1) return cart;
  const item = cart[index];
  const qty = Number(item.quantity) || 1;
  const take = Math.min(Math.max(Math.trunc(Number(count) || 1), 1), qty - 1);
  if (qty < 2 || take < 1) return cart;
  const next = cart.map((row, rowIndex) => (
    rowIndex === index
      ? { ...row, quantity: qty - take, productId: lineProductId(row) }
      : row
  ));
  next.splice(index + 1, 0, emptyDesign(item, take, createId));
  return next;
}

export function splitCartLineAll(cart, id, options) {
  const item = cart.find((row) => row.id === id);
  if (!item || (Number(item.quantity) || 1) < 2) return cart;
  let next = cart;
  let remaining = Number(item.quantity) || 1;
  while (remaining > 1) {
    next = splitCartLine(next, id, 1, options);
    remaining -= 1;
  }
  return next;
}
