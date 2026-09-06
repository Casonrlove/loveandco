import 'server-only';
function notificationConfig() {
  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.ADMIN_NOTIFICATION_EMAIL;
  const sender = process.env.NOTIFICATION_FROM_EMAIL;
  return apiKey && recipient && sender ? { apiKey, recipient, sender } : null;
}

async function sendEmail({ subject, text, to }) {
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
    `Ship to: ${[order.address_line, order.address_line2, order.city, order.region, order.postal_code].filter(Boolean).join(', ')}`,
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

export async function notifyOrderUpdate(order, message) {
  if (!order.email) return { status: 'skipped' };
  return sendEmail({
    to: order.email,
    subject: `Your Love & Co. order update`,
    text: [`Hi ${order.name},`, '', message, '', 'Love & Co. Embroidery'].join('\n'),
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
