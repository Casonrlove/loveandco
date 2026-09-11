import { jsonError, requireAdmin } from '@/lib/require-admin';
import { fromAddressError, notificationConfig, sendTestEmail } from '@/lib/notifications';
import { getEmailSettings, saveEmailSettings } from '@/lib/store';

export async function GET() {
  try {
    await requireAdmin();
    const config = await notificationConfig();
    return Response.json({
      ready: config.ready,
      adminReady: config.adminReady,
      from: config.sender || '',
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request) {
  try {
    const profile = await requireAdmin();
    const body = await request.json().catch(() => ({}));
    if (body.test) {
      const result = await sendTestEmail(body.to || profile.email);
      if (result.status === 'disabled') {
        return Response.json({ error: 'Add a Resend API key and a from address on your verified domain first.' }, { status: 400 });
      }
      if (result.status !== 'sent') {
        return Response.json({ error: result.error || 'Test email was not sent.', result }, { status: 400 });
      }
      return Response.json({ ok: true, result });
    }
    const apiKey = String(body.apiKey || '').trim();
    const fromEmail = String(body.fromEmail || '').trim();
    const gmailPassword = String(body.gmailPassword || '').trim();
    if (apiKey && !apiKey.startsWith('re_')) {
      return Response.json({ error: 'That does not look like a Resend API key.' }, { status: 400 });
    }
    if (fromEmail) {
      const fromError = fromAddressError(fromEmail);
      if (fromError) return Response.json({ error: fromError }, { status: 400 });
    }
    const stored = await getEmailSettings();
    await saveEmailSettings({
      apiKey: apiKey || stored.apiKey,
      fromEmail: fromEmail || stored.fromEmail,
      gmailPassword: gmailPassword || stored.gmailPassword,
    });
    const config = await notificationConfig();
    return Response.json({ ok: true, ready: config.ready, from: config.sender || '' });
  } catch (error) {
    return jsonError(error);
  }
}
