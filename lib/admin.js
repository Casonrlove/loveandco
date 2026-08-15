export function adminEmails() {
  const raw = [process.env.ADMIN_EMAILS, process.env.ADMIN_NOTIFICATION_EMAIL].filter(Boolean).join(',');
  return raw.split(',').map((value) => value.trim().toLowerCase()).filter(Boolean);
}

export function isAdminEmail(email) {
  if (!email) return false;
  return adminEmails().includes(String(email).toLowerCase());
}

export function isAdminProfile(profile) {
  return Boolean(profile && (profile.role === 'admin' || isAdminEmail(profile.email)));
}
