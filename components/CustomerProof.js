'use client';
import { useEffect, useState } from 'react';
export default function CustomerProof({ id }) {
  const [proof, setProof] = useState(undefined); const [token, setToken] = useState(''); const [response, setResponse] = useState(''); const [checked, setChecked] = useState(false); const [busy, setBusy] = useState(false); const [message, setMessage] = useState('');
  useEffect(() => {
    const controller = new AbortController(); const secret = new URLSearchParams(window.location.hash.slice(1)).get('token') || '';
    (secret ? fetch(`/api/proofs/${id}`, { headers: { Authorization: `Bearer ${secret}` }, signal: controller.signal }) : Promise.reject(new Error(''))).then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); setProof(data.proof); setToken(secret); }).catch((e) => { if (e.name !== 'AbortError') { setProof(null); setMessage(e.message); } });
    return () => controller.abort();
  }, [id]);
  const respond = async (decision) => {
    setBusy(true); setMessage('');
    try {
      const res = await fetch(`/api/proofs/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ decision, response }) }); const data = await res.json();
      if (res.status === 409) { const latest = await fetch(`/api/proofs/${id}`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()).catch(() => ({})); if (latest.proof) setProof(latest.proof); }
      if (!res.ok) throw new Error(data.error); setProof(data.proof); setMessage('Your response is saved.');
    } catch (error) { setMessage(error.message); } finally { setBusy(false); }
  };
  return <main className="proof-page studio-panel"><p className="eyebrow">BEFORE I STITCH{proof?.order_id && ` · ORDER #${proof.order_id.slice(0, 8)}`}</p><h1>Make sure it’s yours.</h1><p>Check every name, initial, color, and placement. Approval applies to this version of your personalization.</p>
    {message && <p role="status">{message}</p>}
    {proof === undefined ? <p role="status">Loading your proof…</p> : !proof ? <p>Open the full proof link I sent you to see your design details.</p> : <><pre className="proof-copy">{proof.proof_text}</pre><p>Status: {proof.status.replaceAll('_', ' ')}</p>
      {proof.status === 'pending' ? <><label className="check-row"><input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />I have checked the spelling and personalization details.</label><label>Changes or comments<textarea maxLength={3000} rows={4} value={response} onChange={(e) => setResponse(e.target.value)} /></label><p className="helper">Tick the box to approve, or describe the changes to request them.</p><div className="order-actions"><button className="studio-primary" type="button" disabled={busy || !checked} onClick={() => respond('approved')}>Approve this proof</button><button className="outline-button" type="button" disabled={busy || !response.trim()} onClick={() => respond('changes_requested')}>Request changes</button></div></> : <p>{proof.status === 'superseded' ? 'I’ve replaced this version. Please open the newest proof link I sent.' : proof.status === 'approved' ? 'Approved — stitching starts once your order is paid.' : 'Thank you. I’ll send a revised proof.'}</p>}
    </>}
  </main>;
}
