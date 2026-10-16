import 'server-only';
function notificationConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  const sender = process.env.NOTIFICATION_FROM_EMAIL;
  return apiKey && recipient && sender ? { apiKey, recipient, sender } : null;
}

export const siteUrl = () => process.env.NEXT_PUBLIC_SITE_URL || 'https://loveandco.vercel.app';
export const escapeHtml = (value) => String(value ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// Inline-styled 600px table; every caller-supplied string goes through escapeHtml.
export function renderEmail({ heading, lines = [], items = [], total, action }) {
  const cell = 'padding:6px 0;font-family:Georgia,serif;font-size:16px;color:#2b2b2b;';
  const rows = [
    `<tr><td style="${cell}font-size:22px;padding-bottom:12px;">${escapeHtml(heading)}</td></tr>`,
    `<tr><td style="${cell}">${lines.map(escapeHtml).join('<br>')}</td></tr>`,
    ...items.map((item) => `<tr><td style="${cell}border-top:1px solid #e4ddd2;">${escapeHtml(item.quantity)} × ${escapeHtml(item.name)}</td></tr>`),
    !total ? '' : `<tr><td style="${cell}border-top:1px solid #e4ddd2;font-weight:bold;">Subtotal before shipping: $${Number(total).toFixed(2)}</td></tr>`,
    action ? `<tr><td style="padding:20px 0;"><a href="${escapeHtml(action.href)}" style="display:inline-block;padding:12px 22px;background:#1f3a52;color:#ffffff;text-decoration:none;font-family:Georgia,serif;border-radius:4px;">${escapeHtml(action.label)}</a></td></tr>` : '',
    `<tr><td style="${cell}color:#6b6b6b;">Anna, Love &amp; Co.</td></tr>`,
  ];
  return `<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">${rows.join('')}</table>`;
}

async function sendEmail({ subject, text, html, to }) {
  const config = notificationConfig();
  if (!config) return { status: 'disabled' };
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.sender,
      to: [to || config.recipient],
      subject,
      text,
      ...(html ? { html } : {}),
    }),
    signal: AbortSignal.timeout(7000),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || `Resend returned HTTP ${response.status}.`);
  }
  return { status: 'sent' };
}

export async function notifyNewOrder(order) {
  const lines = [
    'A new Love & Co. order is waiting for review.',
    '',
    `Customer: ${order.name}`,
    `Email: ${order.email}`,
    `Phone: ${order.phone || '—'}`,
    `Venmo: ${order.venmo_username || '—'}`,
    order.delivery_method === 'pickup' ? 'Local pickup' : `Ship to: ${[order.address_line, order.address_line2, order.city, order.region, order.postal_code].filter(Boolean).join(', ')}`,
    `Subtotal: $${Number(order.subtotal || 0).toFixed(2)}`,
    '',
    ...(order.items || []).map((item) => `- ${item.quantity} × ${item.name}${item.is_custom ? ' (custom)' : ''}`),
    '',
    order.customer_notes ? `Notes: ${order.customer_notes}` : '',
  ].filter(Boolean);
  return sendEmail({ subject: `New order from ${order.name}`, text: lines.join('\n') }).catch((error) => {
    console.error('[order-notification]', error.message);
    return { status: 'failed' };
  });
}

export async function notifyOrderUpdate(order, message, subject = `Love & Co. order #${String(order.id || '').slice(0, 8)}`, { items = [], total, action } = {}) {
  if (!order.email) return { status: 'skipped' };
  const link = action || { href: `${siteUrl()}/account`, label: 'View your order' };
  const lines = [message, ...items.map((item) => `- ${item.quantity} × ${item.name}`), ...(!total ? [] : [`Subtotal before shipping: $${Number(total).toFixed(2)}`])];
  return sendEmail({
    to: order.email,
    subject,
    text: [`Hi ${order.name},`, '', ...lines, '', `${link.label}: ${link.href}`, '', 'Anna, Love & Co.'].join('\n'),
    html: renderEmail({ heading: `Hi ${order.name},`, lines: String(message).split('\n'), items, total, action: link }),
  }).catch((error) => {
    console.error('[customer-notification]', error.message);
    return { status: 'failed' };
  });
}

export async function notifyContact(message) {
  return sendEmail({
    subject: `Website message from ${message.name}`,
    text: [`Name: ${message.name}`, `Email: ${message.email}`, `Phone: ${message.phone || '—'}`, '', message.message].join('\n'),
  }).catch((error) => {
    console.error('[contact-notification]', error.message);
    return { status: 'failed' };
  });
}
