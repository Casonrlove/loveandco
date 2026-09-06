'use client';

import { useEffect, useRef } from 'react';

export function useModalFocus(open, onClose) {
  const root = useRef(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    const dialog = root.current;
    if (!open || !dialog) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    const inert = [];
    // Isolate every branch outside this dialog, including header and footer.
    for (let branch = dialog; branch?.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && !sibling.inert) { sibling.inert = true; inert.push(sibling); }
      }
      if (branch.parentElement === document.body) break;
    }
    document.body.style.overflow = 'hidden';
    const focusable = () => [...dialog.querySelectorAll('a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]')]
      .filter((element) => element.getClientRects().length && !element.closest('[inert]'));
    (focusable()[0] || dialog).focus();
    const handleKey = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close.current?.(); }
      if (event.key !== 'Tab') return;
      const items = focusable();
      const first = items[0];
      const last = items.at(-1);
      if (!first) { event.preventDefault(); dialog.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    dialog.addEventListener('keydown', handleKey);
    return () => {
      dialog.removeEventListener('keydown', handleKey);
      inert.forEach((element) => { element.inert = false; });
      document.body.style.overflow = overflow;
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
  return root;
}
