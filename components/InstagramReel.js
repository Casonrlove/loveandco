'use client';

import { useEffect, useState } from 'react';
import { X } from 'react-bootstrap-icons';
import Link from 'next/link';
import { INSTAGRAM_PROFILE, INSTAGRAM_USERNAME } from '@/lib/instagram-profile';
import { useScrollLock } from '@/lib/scroll-lock';

function formatPosted(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function InstagramReel({ posts }) {
  const [openId, setOpenId] = useState('');
  const open = posts.find((post) => post.id === openId);
  useScrollLock(Boolean(open));

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setOpenId(''); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <p className="eyebrow">Instagram</p>
          <h2>@{INSTAGRAM_USERNAME}</h2>
        </div>
      {posts.length > 0 ? (
        <div className="reel">
          {posts.map((post) => (
            <button type="button" className="reel-item" key={post.id} onClick={() => setOpenId(post.id)} aria-label={post.caption ? post.caption.slice(0, 80) : 'Open Instagram post'}>
              {post.type === 'VIDEO' ? (
                <video src={post.url} muted playsInline preload="metadata" />
              ) : (
                <img src={post.url} alt="" />
              )}
            </button>
          ))}
        </div>
      ) : (
        <p className="helper">
          See the latest on <a href={INSTAGRAM_PROFILE} target="_blank" rel="noopener noreferrer">@{INSTAGRAM_USERNAME}</a>.
        </p>
      )}
      </div>

      {open && (
        <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="instagram-post-title">
          <button type="button" className="scrim" aria-label="Close post" onClick={() => setOpenId('')} />
          <article className="instagram-post">
            <button type="button" className="drawer-close" onClick={() => setOpenId('')} aria-label="Close"><X aria-hidden="true" /></button>
            {open.type === 'VIDEO' ? (
              <video src={open.url} controls playsInline />
            ) : (
              <img src={open.url} alt="" />
            )}
            {open.children?.length > 1 && (
              <div className="instagram-thumbs">
                {open.children.map((child) => (
                  child.type === 'VIDEO'
                    ? <video key={child.id} src={child.url} muted playsInline />
                    : <img key={child.id} src={child.url} alt="" />
                ))}
              </div>
            )}
            <div className="instagram-copy">
              <p className="eyebrow" id="instagram-post-title">@{open.username}</p>
              {open.postedAt && <p className="helper">{formatPosted(open.postedAt)}</p>}
              <p>{open.caption || 'A Love & Co. piece from Instagram.'}</p>
              <div className="inline-actions">
                <a className="btn btn--primary" href={open.permalink} target="_blank" rel="noopener noreferrer">View on Instagram</a>
                <Link className="btn btn--secondary" href="/custom">Ask about this piece</Link>
              </div>
            </div>
          </article>
        </div>
      )}
    </section>
  );
}
