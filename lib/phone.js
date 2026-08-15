export function formatPhoneInput(value) {
  const input = String(value || '');
  if (input.trim().startsWith('+') && !input.trim().startsWith('+1')) return input;
  let digits = input.replace(/\D/g, '');
  if (input.trim().startsWith('+1') || (digits.length > 10 && digits.startsWith('1'))) digits = digits.slice(1);
  digits = digits.slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}
