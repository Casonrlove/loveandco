export function safeNextPath(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || /[\\\u0000-\u0020]/.test(value)) return '/account';
  const base = 'https://local.invalid';
  try {
    const url = new URL(value, base);
    return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : '/account';
  } catch { return '/account'; }
}

export async function readJsonBody(request, limit = 128 * 1024) {
  const fail = (message, status) => { throw Object.assign(new Error(message), { status }); };
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) fail('Send JSON data.', 415);
  const reader = request.body?.getReader();
  if (!reader) fail('Enter the required details.', 400);
  let size = 0;
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > limit) { await reader.cancel(); fail('This request is too large. Reduce the text or number of items.', 413); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  let body;
  try { body = JSON.parse(new TextDecoder().decode(bytes)); } catch { fail('Check the submitted details and try again.', 400); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail('Enter the required details.', 400);
  return body;
}

export function validateSubmission(body, { order = false } = {}) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Enter your contact details.';
  for (const [key, limit] of Object.entries({ name: 120, email: 254, phone: 40, venmo_username: 80, message: 5000, customer_notes: 5000, address_line: 200, address_line2: 200, city: 120, region: 80, postal_code: 20 })) {
    if (body[key] !== undefined && (typeof body[key] !== 'string' || body[key].length > limit)) return `Check the ${key.replaceAll('_', ' ')} field.`;
  }
  if (!body.name?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email || '')) return 'Enter your name and a valid email address.';
  if (!order) return body.message?.trim() ? '' : 'Enter a message.';
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 50) return 'Your bag must contain between 1 and 50 items.';
  for (const item of body.items) {
    if (!item || typeof item !== 'object' || Array.isArray(item) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 500) return 'Choose a whole-number quantity between 1 and 500.';
    for (const key of ['id', 'productId', 'name', 'designName', 'designDescription', 'personalization', 'bundleTheme', 'napkinColor', 'towelLetter', 'monogram', 'monogramFirst', 'monogramMiddle', 'monogramLast', 'threadColor', 'placement', 'extraNotes', 'nameVerifiedValue', 'nameVerifiedAt']) {
      if (item[key] !== undefined && (typeof item[key] !== 'string' || item[key].length > 5000)) return 'Check the text and design choices for each item.';
    }
    for (const key of ['wantsDesign', 'isCustom', 'is_custom', 'nameVerified']) {
      if (item[key] !== undefined && typeof item[key] !== 'boolean') return 'Check the design confirmations for each item.';
    }
  }
  return '';
}

export function validateSettings(settings) {
  if (!Array.isArray(settings.workDays) || !settings.workDays.length || settings.workDays.length > 7 || settings.workDays.some((day) => !Number.isInteger(day) || day < 0 || day > 6)) return 'Choose at least one work day.';
  const minutes = Number(settings.minutesPerSession);
  if (!Number.isInteger(minutes) || minutes < 15 || minutes > 1440) return 'Choose between 15 and 1,440 minutes per session.';
  if (!Array.isArray(settings.daysOff) || settings.daysOff.length > 730 || settings.daysOff.some((day) => typeof day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(Date.parse(day)) || new Date(day).toISOString().slice(0, 10) !== day)) return 'Choose valid days off, up to 730 dates.';
  return '';
}

// Next's internal request URL can use localhost behind a reverse proxy. The
// browser-visible Host header is the authority for same-origin submissions.
export function isSameOriginRequest(headers, protocol) {
  if (headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = headers.get('origin');
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.protocol === protocol
      && parsed.host === headers.get('host') && parsed.origin === origin;
  } catch { return false; }
}
