'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'react-bootstrap-icons';

export default function FancySelect({
  value,
  onChange,
  options,
  placeholder = 'Choose…',
  required = false,
  compact = false,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false);
  const root = useRef(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);
  const label = selected?.label || placeholder;

  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!root.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div className={`fancy-select${compact ? ' is-compact' : ''}${open ? ' is-open' : ''}${!selected ? ' is-empty' : ''}`} ref={root}>
      <button
        type="button"
        className="fancy-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDown />
      </button>
      {open && (
        <ul className="fancy-select-menu" id={listId} role="listbox">
          {options.map((option) => (
            <li key={String(option.value)}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === value}
                className={option.value === value ? 'is-active' : ''}
                onClick={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
      {required && <input tabIndex={-1} className="fancy-select-required" value={value || ''} onChange={() => {}} required />}
    </div>
  );
}
