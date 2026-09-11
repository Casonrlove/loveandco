'use client';

import { useEffect, useRef, useState } from 'react';
import { formatZip, normalizeState, US_STATES } from '@/lib/address';

export default function AddressFields({ defaultAddress, required = true }) {
  const saved = defaultAddress || {};
  const [address, setAddress] = useState({
    address_line: saved.address_line || '',
    address_line2: saved.address_line2 || '',
    city: saved.city || '',
    region: saved.region || '',
    postal_code: formatZip(saved.postal_code || ''),
  });
  const [zipNote, setZipNote] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [status, setStatus] = useState('');
  const root = useRef(null);
  const timer = useRef(null);
  const request = useRef(0);
  const session = useRef(crypto.randomUUID());

  useEffect(() => {
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const setField = (key, value) => setAddress((current) => ({ ...current, [key]: value }));

  const applySuggestion = async (item) => {
    if (!item) return;
    let next = item;
    if (item.placeId) {
      try {
        const response = await fetch(`/api/address/details?id=${encodeURIComponent(item.placeId)}&session=${encodeURIComponent(session.current)}`);
        const result = await response.json().catch(() => ({}));
        if (result.address) next = result.address;
      } catch {
        next = item;
      }
      session.current = crypto.randomUUID();
    }
    setAddress({
      address_line: next.address_line || item.label.split(',')[0],
      address_line2: next.address_line2 || '',
      city: next.city || '',
      region: next.region || '',
      postal_code: formatZip(next.postal_code || ''),
    });
    setSuggestions([]);
    setOpen(false);
    setStatus('');
    setZipNote('');
  };

  const onStreetChange = (value) => {
    setField('address_line', value);
    clearTimeout(timer.current);
    if (value.trim().length < 3 || !/[A-Za-z]/.test(value)) {
      setSuggestions([]);
      setOpen(false);
      setStatus('');
      return;
    }
    setStatus('Looking up addresses…');
    const ticket = ++request.current;
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/address/suggest?q=${encodeURIComponent(value.trim())}&session=${encodeURIComponent(session.current)}`);
        const result = await response.json().catch(() => ({}));
        if (ticket !== request.current) return;
        if (result.error === 'not_configured') {
          setSuggestions([]);
          setOpen(false);
          setStatus('Address lookup needs a Google Places key.');
          return;
        }
        const next = result.suggestions || [];
        setSuggestions(next);
        setActive(0);
        setOpen(next.length > 0);
        setStatus(next.length ? '' : 'No matching addresses.');
      } catch {
        if (ticket !== request.current) return;
        setSuggestions([]);
        setOpen(false);
        setStatus('Could not look up addresses.');
      }
    }, 280);
  };

  const onStreetKeyDown = (event) => {
    if (!open || suggestions.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((current) => (current + 1) % suggestions.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((current) => (current - 1 + suggestions.length) % suggestions.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      applySuggestion(suggestions[active]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const onZipChange = async (value) => {
    const postal_code = formatZip(value);
    setAddress((current) => ({ ...current, postal_code }));
    const zip5 = postal_code.replace(/\D/g, '').slice(0, 5);
    if (zip5.length !== 5) {
      setZipNote('');
      return;
    }
    try {
      const response = await fetch(`/api/zip/${zip5}`);
      const result = await response.json().catch(() => ({}));
      if (!result.found) {
        setZipNote('We couldn’t confirm this ZIP. Double-check city and state.');
        return;
      }
      setZipNote('');
      setAddress((current) => ({
        ...current,
        postal_code,
        city: result.city || current.city,
        region: result.region || current.region,
      }));
    } catch {
      setZipNote('');
    }
  };

  return (
    <>
      <div className={`address-suggest${open ? ' is-open' : ''}`} ref={root}>
        <label>Street address
          <input
            name="address_line"
            required={required}
            autoComplete="off"
            spellCheck="false"
            placeholder="Start typing a street address"
            value={address.address_line}
            onChange={(event) => onStreetChange(event.target.value)}
            onKeyDown={onStreetKeyDown}
            onFocus={() => suggestions.length && setOpen(true)}
          />
        </label>
        {open && suggestions.length > 0 && (
          <ul className="address-suggest-menu" role="listbox">
            {suggestions.map((item, index) => (
              <li key={item.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={index === active ? 'is-active' : undefined}
                  onMouseDown={(event) => {
                    event.preventDefault();
                    applySuggestion(item);
                  }}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {status && <p className="helper">{status}</p>}
      </div>
      <label>Apt / unit
        <input
          name="address_line2"
          autoComplete="shipping address-line2"
          placeholder="Optional"
          value={address.address_line2}
          onChange={(event) => setField('address_line2', event.target.value)}
        />
      </label>
      <label>City
        <input
          name="city"
          required={required}
          autoComplete="shipping address-level2"
          value={address.city}
          onChange={(event) => setField('city', event.target.value)}
        />
      </label>
      <div className="form-grid form-grid--2">
        <label>State
          <input
            name="region"
            required={required}
            list="us-states"
            autoComplete="shipping address-level1"
            value={address.region}
            onChange={(event) => setField('region', event.target.value)}
            onBlur={() => setField('region', normalizeState(address.region))}
          />
          <datalist id="us-states">
            {US_STATES.map((state) => (
              <option key={state.value} value={state.value}>{state.label}</option>
            ))}
          </datalist>
        </label>
        <label>ZIP
          <input
            name="postal_code"
            required={required}
            inputMode="numeric"
            autoComplete="shipping postal-code"
            value={address.postal_code}
            onChange={(event) => onZipChange(event.target.value)}
          />
        </label>
      </div>
      {zipNote && <p className="helper">{zipNote}</p>}
    </>
  );
}
