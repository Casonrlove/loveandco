'use client';
import { useEffect, useState } from 'react';
export default function CustomerProof({ id }) {
  const [proof, setProof] = useState(null); const [token, setToken] = useState(''); const [response, setResponse] = useState(''); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); const secret = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    if (!secret) return;
    fetch(`/api/proofs/${id}`, { headers: { Authorization: `Bearer ${secret}` }, signal: controller.signal }).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setProof(data.proof); setToken(secret); }).catch((e) => { if (e.name !== 'AbortError') setMessage(e.message); });
    return () => controller.abort();
  }, [id]);
  const respond = async (decision) => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/proofs/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision, response }) }); const data = await res.json(); if (!res.ok) throw new Error(data.error); setProof(data.proof); setMessage('Your response is saved.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <main className="proof-page studio-panel"><p className="eyebrow">BEFORE WE STITCH</p><h1>Make sure it’s yours.</h1><p>Check every name, initial, color, and placement. Approval applies to this version of your personalization.</p>
    {message && <p role="status">{message}</p>}
    {!proof ? <p>Open the complete proof link from the shop to load your design details.</p> : <><pre className="proof-copy">{proof.proof_text}</pre><p>Status: {proof.status.replaceAll('_', ' ')}</p>
      {proof.status === 'pending' ? <><label className="check-row"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />I have checked the spelling and personalization details.</label><label>Changes or comments<textarea maxLength={3000} rows={4} value={response} onChange={(e) => setResponse(e.target.value)} /></label><div className="order-actions"><button className="soft-button" type="button" disabled={busy || !checked} onClick={() => respond('approved')}>Approve this proof</button><button className="soft-button" type="button" disabled={busy || !response.trim()} onClick={() => respond('changes_requested')}>Request changes</button></div></> : <p>{proof.status === 'superseded' ? 'The shop has replaced this version. Please use the latest link.' : 'Thank you. The shop has your response.'}</p>}
    </>}
  </main>;
}
