import nodemailer from 'nodemailer';
import { getEmailSettings } from '@/lib/store';

const SHOP_GMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || 'loveandcoembroidery@gmail.com';
const SHOP_REPLY = SHOP_GMAIL;
export const DEFAULT_FROM = 'Love & Co. Embroidery <onboarding@resend.dev>';

function looksLikeEmail(value) {
  return /.+@.+\..+/.test(String(value || ''));
}

export function fromAddressError(value) {
  if (!String(value || '').trim()) return '';
  const raw = String(value || '').trim();
  const named = raw.match(/^(.+)<([^>]+)>$/);
  const address = (named ? named[2] : raw).trim().toLowerCase();
  if (!looksLikeEmail(address)) {
    return 'From address should look like Love & Co. Embroidery <onboarding@resend.dev>.';
  }
  return '';
}

function parseFrom(value) {
  const raw = String(value || '').trim();
  if (!raw) return DEFAULT_FROM;
  const named = raw.match(/^(.+)<([^>]+)>$/);
  const address = (named ? named[2] : raw).trim();
  if (!looksLikeEmail(address)) return DEFAULT_FROM;
  const domain = address.split('@').pop().toLowerCase();
  if (['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'that-domain.com'].includes(domain)) {
    return DEFAULT_FROM;
  }
  return named ? `${named[1].trim()} <${address}>` : address;
}

export async function notificationConfig() {
  const stored = await getEmailSettings().catch(() => ({ apiKey: '', fromEmail: '', gmailPassword: '' }));
  const apiKey = String(process.env.RESEND_API_KEY || stored.apiKey || '').trim();
  const gmailPassword = String(process.env.GMAIL_APP_PASSWORD || stored.gmailPassword || '').replace(/\s/g, '');
  const sender = gmailPassword
    ? `Love & Co. Embroidery <${SHOP_GMAIL}>`
    : parseFrom(process.env.NOTIFICATION_FROM_EMAIL || stored.fromEmail || DEFAULT_FROM);
  const recipient = String(process.env.ADMIN_NOTIFICATION_EMAIL || '').trim();
  return {
    apiKey,
    gmailPassword,
    gmailUser: SHOP_GMAIL,
    sender,
    recipient: looksLikeEmail(recipient) ? recipient : '',
    replyTo: looksLikeEmail(SHOP_REPLY) ? SHOP_REPLY : '',
    ready: Boolean(gmailPassword || (apiKey && sender)),
    adminReady: Boolean((gmailPassword || apiKey) && looksLikeEmail(recipient)),
  };
}

async function sendViaGmail(config, { subject, text, html, to }) {
  const transport = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.gmailUser, pass: config.gmailPassword },
  });
  await transport.sendMail({
    from: `Love & Co. Embroidery <${config.gmailUser}>`,
    to,
    replyTo: config.gmailUser,
    subject,
    text,
    html: html || `<p>${String(text || '').replaceAll('\n', '<br/>')}</p>`,
  });
  return { status: 'sent' };
}

async function sendEmail({ subject, text, html, to }) {
  const config = await notificationConfig();
  if (!config.ready) return { status: 'disabled' };
  const recipient = to || config.recipient;
  if (!looksLikeEmail(recipient)) return { status: 'skipped' };
  if (config.gmailPassword) {
    return sendViaGmail(config, { subject, text, html, to: recipient });
  }
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: config.sender,
      to: [recipient],
      reply_to: config.replyTo || undefined,
      subject,
      text,
      html: html || `<p>${String(text || '').replaceAll('\n', '<br/>')}</p>`,
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
    return { status: 'failed', error: error.message };
  });
}

const CUSTOMER_SUBJECTS = {
  requested: 'Your Love & Co. Venmo request is on the way',
  paid: 'Payment received for your Love & Co. order',
  started: 'I’ve started your Love & Co. order',
  shipped: 'Your Love & Co. order has shipped',
  complete: 'Your Love & Co. order is complete',
};

export async function notifyOrderUpdate(order, message, { event } = {}) {
  if (!order.email || !message) return { status: 'skipped' };
  const first = String(order.name || 'there').trim().split(/\s+/)[0] || 'there';
  return sendEmail({
    to: order.email,
    subject: CUSTOMER_SUBJECTS[event] || 'Your Love & Co. order update',
    text: [`Hi ${first},`, '', message, '', 'If you have a question, just reply to this email.', '', 'Love & Co. Embroidery'].join('\n'),
  }).catch((error) => {
    console.error('[customer-notification]', error.message);
    return { status: 'failed', error: error.message };
  });
}

export async function notifyContact(message) {
  return sendEmail({
    subject: `Website message from ${message.name}`,
    text: [`Name: ${message.name}`, `Email: ${message.email}`, `Phone: ${message.phone || '—'}`, '', message.message].join('\n'),
  }).catch((error) => {
    console.error('[contact-notification]', error.message);
    return { status: 'failed', error: error.message };
  });
}

export async function sendTestEmail(to) {
  const config = await notificationConfig();
  if (!config.ready) return { status: 'disabled' };
  const recipient = to || config.recipient;
  if (!looksLikeEmail(recipient)) return { status: 'skipped', error: 'No inbox to send the test to.' };
  try {
    const result = await sendEmail({
      to: recipient,
      subject: 'Love & Co. test email',
      text: 'This is a test from Studio. If you received it, customer order emails are ready.',
    });
    return { ...result, to: recipient, from: config.sender };
  } catch (error) {
    return { status: 'failed', error: error.message, to: recipient, from: config.sender };
  }
}
