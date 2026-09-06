'use client';
import { useEffect, useRef, useState } from 'react';
import StoreImage from './StoreImage';
export default function StudioPhotos({ photos, onChange }) {
  const [source, setSource] = useState(''); const [ratio, setRatio] = useState('1'); const [zoom, setZoom] = useState(1); const [x, setX] = useState(50); const [y, setY] = useState(50); const [busy, setBusy] = useState(false); const [message, setMessage] = useState(''); const canvas = useRef(null);
  useEffect(() => {
    if (!source) return;
    let active = true; const image = new Image();
    image.onload = () => {
      if (!active || !canvas.current) return;
      const aspect = ratio === 'original' ? image.width / image.height : Number(ratio);
      const width = Math.min(image.width, image.height * aspect) / zoom; const height = width / aspect;
      const target = canvas.current; target.width = Math.round(Math.min(1440, 1440 * aspect)); target.height = Math.round(target.width / aspect);
      target.getContext('2d').drawImage(image, (image.width - width) * x / 100, (image.height - height) * y / 100, width, height, 0, 0, target.width, target.height);
    };
    image.onerror = () => { if (active) setMessage('This photo cannot be read. Choose a JPEG, PNG, or WebP.'); };
    image.src = source;
    return () => { active = false; };
  }, [source, ratio, zoom, x, y]);
  useEffect(() => () => { if (source) URL.revokeObjectURL(source); }, [source]);
  const upload = async () => {
    setBusy(true); setMessage('');
    try {
      const blob = await new Promise((resolve) => canvas.current.toBlob(resolve, 'image/webp', .85));
      if (!blob) throw new Error('Choose a readable photo.');
      const res = await fetch('/api/studio/photos', { method: 'POST', headers: { 'Content-Type': 'image/webp' }, body: blob });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Upload failed.');
      onChange([...new Set([...photos, data.url])]); setSource(''); setMessage('Photo uploaded. Save the product to publish its photos.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  const move = (index, direction) => { const next = [...photos]; [next[index], next[index + direction]] = [next[index + direction], next[index]]; onChange(next); };
  return <fieldset className="studio-photos"><legend>Product photos</legend><p className="helper">The first photo is the cover. Upload up to 10 public product photos; keep customer documents and private proofs out of this library.</p>
    <div className="studio-photo-list">{photos.map((photo, index) => <article key={photo}><StoreImage src={photo} alt={`Product photo ${index + 1}`} width={144} height={144} /><div className="order-actions"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Move photo ${index + 1} earlier`}>Earlier</button><button type="button" disabled={index === photos.length - 1} onClick={() => move(index, 1)} aria-label={`Move photo ${index + 1} later`}>Later</button><button type="button" onClick={() => { if (window.confirm('Remove this photo from this product?')) onChange(photos.filter((_, i) => i !== index)); }}>Remove</button></div></article>)}</div>
    <label>Upload product photo<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy || photos.length >= 10} onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; if (file.size > 10 * 1024 * 1024) { setMessage('Choose a photo under 10 MB.'); return; } setSource(URL.createObjectURL(file)); setZoom(1); setX(50); setY(50); setMessage(''); }} /></label>
    {source && <div className="studio-crop"><canvas ref={canvas} role="img" aria-label="Cropped product photo preview" /><label>Crop shape<select value={ratio} onChange={(e) => setRatio(e.target.value)}><option value="1">Square</option><option value="0.75">Portrait</option><option value="1.5">Landscape</option><option value="original">Original proportions</option></select></label><label>Zoom<input type="range" min="1" max="3" step="0.1" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label><label>Horizontal position<input type="range" min="0" max="100" value={x} onChange={(e) => setX(Number(e.target.value))} /></label><label>Vertical position<input type="range" min="0" max="100" value={y} onChange={(e) => setY(Number(e.target.value))} /></label><button className="soft-button" type="button" disabled={busy || photos.length >= 10} onClick={upload}>{busy ? 'Uploading…' : 'Upload cropped photo'}</button></div>}
    {message && <p role="status">{message}</p>}
  </fieldset>;
}
