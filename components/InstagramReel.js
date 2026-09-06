'use client';

import StoreImage from './StoreImage';

import { useModalFocus } from '@/lib/use-modal-focus';

import { useState } from 'react';
import Link from 'next/link';
import { INSTAGRAM_PROFILE, INSTAGRAM_USERNAME } from '@/lib/instagram-profile';

function formatPosted(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InstagramReel({ posts }) {
  const [openId, setOpenId] = useState('');
  const dialog = useModalFocus(Boolean(openId), () => setOpenId(''));
  const open = posts.find((post) => post.id === openId);

  return (
    <section className="feature-reel">
      <p className="eyebrow">INSTAGRAM</p>
      <h2>@{INSTAGRAM_USERNAME}</h2>
      {posts.length > 0 ? (
        <div className="reel">
          {posts.map((post) => (
            <button type="button" className="reel-item" key={post.id} onClick={() => setOpenId(post.id)} aria-label={post.caption ? post.caption.slice(0, 80) : 'Open Instagram post'}>
              {post.type === 'VIDEO' ? (
                <video src={post.url} aria-hidden="true" muted playsInline preload="none" />
              ) : (
                <StoreImage src={post.url} alt="" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="instagram-empty-copy">
          See the latest on <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">@{INSTAGRAM_USERNAME}</a>.
        </p>
      )}

      {open && (
        <div ref={dialog} tabIndex={-1} className="instagram-overlay" role="dialog" aria-modal="true" aria-labelledby="instagram-post-title">
          <button type="button" className="instagram-scrim" aria-label="Close post" onClick={() => setOpenId('')} />
          <article className="instagram-post">
            <button type="button" className="drawer-close" onClick={() => setOpenId('')} aria-label="Close">×</button>
            {open.type === 'VIDEO' ? (
              <video src={open.url} controls playsInline />
            ) : (
              <StoreImage src={open.url} alt="" />
            )}
            {open.children?.length > 1 && (
              <div className="instagram-thumbs">
                {open.children.map((child) => (
                  child.type === 'VIDEO'
                    ? <video key={child.id} src={child.url} aria-hidden="true" muted playsInline preload="none" />
                    : <StoreImage key={child.id} src={child.url} alt="" />
                ))}
              </div>
            )}
            <div className="instagram-copy">
              <p className="eyebrow" id="instagram-post-title">@{open.username}</p>
              {open.postedAt && <p className="helper">{formatPosted(open.postedAt)}</p>}
              <p>{open.caption || 'A Love & Co. piece from Instagram.'}</p>
              <div className="inline-actions">
                <a className="soft-button" href={open.permalink} target="_blank" rel="noopener noreferrer">View on Instagram</a>
                <Link className="ghost-button" href="/contact">Ask about this piece</Link>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
