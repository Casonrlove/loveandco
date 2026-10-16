'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SECTIONS = '.feature-reel, .trust-strip, .shop-products, .split-story';

// Fades sections up as they scroll into view. Only sections below the fold are
// hidden, and only by this effect, so nothing stays hidden without JS, on late
// mounts, or for sections already on screen.
export default function Reveal() {
  const pathname = usePathname();
  useEffect(() => {
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('reveal-hidden');
      observer.unobserve(entry.target);
    }));
    document.querySelectorAll(SECTIONS).forEach((el) => {
      if (el.getBoundingClientRect().top < innerHeight) return;
      el.classList.add('reveal-hidden');
      observer.observe(el);
    });
    return () => {
      observer.disconnect();
      document.querySelectorAll('.reveal-hidden').forEach((el) => el.classList.remove('reveal-hidden'));
    };
  }, [pathname]);
  return null;
}
