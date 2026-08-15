export const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'DC', label: 'District of Columbia' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' },
];

export function formatZip(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 9);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

export function isValidZip(value) {
  return /^\d{5}(-\d{4})?$/.test(String(value || '').trim());
}

export function normalizeState(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const upper = raw.toUpperCase();
  const byCode = US_STATES.find((state) => state.value === upper);
  if (byCode) return byCode.value;
  const byLabel = US_STATES.find((state) => state.label.toLowerCase() === raw.toLowerCase());
  return byLabel?.value || raw;
}

export function isValidState(value) {
  return US_STATES.some((state) => state.value === normalizeState(value));
}

export function formatUnit(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw
    .replace(/^apartment\b/i, 'Apt')
    .replace(/^apt\b/i, 'Apt')
    .replace(/^unit\b/i, 'Unit')
    .replace(/^suite\b/i, 'Suite')
    .replace(/^ste\b/i, 'Suite');
}

export function pickAddress(input = {}) {
  return {
    address_line: String(input.address_line || '').trim(),
    address_line2: formatUnit(input.address_line2),
    city: String(input.city || '').trim(),
    region: normalizeState(input.region),
    postal_code: formatZip(input.postal_code),
  };
}

export function hasAddressInput(input = {}) {
  const address = pickAddress(input);
  return Boolean(address.address_line || address.city || address.region || address.postal_code);
}

export function validateAddress(input) {
  const address = pickAddress(input);
  if (address.address_line.length < 3) return 'Add a street address.';
  if (address.city.length < 2) return 'Add a city.';
  if (!isValidState(address.region)) return 'Choose a U.S. state.';
  if (!isValidZip(address.postal_code)) return 'Enter a 5-digit ZIP code.';
  return null;
}

export function validateOptionalAddress(input) {
  if (!hasAddressInput(input)) return null;
  return validateAddress(input);
}

export function uniqueSuggestions(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.label)) return false;
    seen.add(item.label);
    return true;
  });
}

export function rankSuggestions(query, items) {
  const house = String(query || '').trim().match(/^(\d+[A-Za-z]?)/)?.[1];
  if (!house) return items;
  return [...items].sort((left, right) => {
    const leftHit = left.address_line.startsWith(`${house} `) || left.address_line === house ? 0 : 1;
    const rightHit = right.address_line.startsWith(`${house} `) || right.address_line === house ? 0 : 1;
    return leftHit - rightHit;
  });
}

export function expandRuralQuery(query) {
  return String(query || '')
    .replace(/\bC\.?R\.?\s*#?\s*(?=\d)/gi, 'County Road ')
    .replace(/\bCo\.?\s*Rd\.?\s*/gi, 'County Road ')
    .replace(/\bCounty\s*Rd\.?\s*/gi, 'County Road ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function suggestionLabel(item) {
  return [item.address_line, item.city, [item.region, item.postal_code].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

export function componentText(components, type) {
  const match = (components || []).find((item) => (item.types || []).includes(type));
  return match?.longText || match?.shortText || match?.long_name || match?.short_name || '';
}

export function componentShort(components, type) {
  const match = (components || []).find((item) => (item.types || []).includes(type));
  return match?.shortText || match?.short_name || match?.longText || match?.long_name || '';
}

export function addressFromGoogleComponents(components, formatted = '') {
  const number = componentText(components, 'street_number');
  const route = componentText(components, 'route');
  const address_line2 = formatUnit(componentText(components, 'subpremise'));
  const address_line = [number, route].filter(Boolean).join(' ').trim() || String(formatted).split(',')[0] || '';
  const city = componentText(components, 'locality')
    || componentText(components, 'postal_town')
    || componentText(components, 'neighborhood');
  const region = normalizeState(componentShort(components, 'administrative_area_level_1'));
  const postal_code = formatZip([
    componentText(components, 'postal_code'),
    componentText(components, 'postal_code_suffix'),
  ].filter(Boolean).join('-'));
  if (!address_line) return null;
  return {
    address_line,
    address_line2,
    city,
    region,
    postal_code,
    label: suggestionLabel({
      address_line: address_line2 ? `${address_line} ${address_line2}` : address_line,
      city,
      region,
      postal_code,
    }),
  };
}
