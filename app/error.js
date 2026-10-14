'use client';

export default function Error({ retry }) {
  return (
    <main className="auth-page">
      <div className="auth-card" role="alert">
        <p className="eyebrow">SOMETHING WENT WRONG</p>
        <h1>That didn’t load.</h1>
        <p>Please try again. If it keeps happening, email loveandcoembroidery@gmail.com.</p>
        <button className="studio-primary" type="button" onClick={() => retry()}>Try again</button>
      </div>
    </main>
  );
}
