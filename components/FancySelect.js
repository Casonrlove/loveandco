'use client';

import { ChevronDown } from 'react-bootstrap-icons';

export default function FancySelect({ value, onChange, options, placeholder = 'Choose…', required = false, compact = false, name, 'aria-label': ariaLabel }) {
  return (
    <span className={`fancy-select${compact ? ' is-compact' : ''}`}>
      <select className="fancy-select-trigger" name={name} value={value ?? ''} required={required}
        aria-label={ariaLabel} onChange={(event) => {
          const selected = options.find((option) => String(option.value) === event.target.value);
          onChange(selected ? selected.value : event.target.value);
        }}>
        <option value="" disabled>{placeholder}</option>
        {options.map((option) => <option key={String(option.value)} value={option.value}>{option.label}</option>)}
      </select>
      <ChevronDown className="select-chevron" aria-hidden="true" />
    </span>
  );
}
