export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function validateEmail(email: string): string | null {
  if (!email.trim()) return 'Enter your email address.';
  if (!EMAIL_RE.test(email.trim())) return 'Enter a valid email address.';
  return null;
}

export function validatePassword(password: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  return null;
}

/** Turns Supabase auth errors into copy a listener can act on. */
export function describeAuthError(message: string | undefined): string {
  const text = (message ?? '').toLowerCase();
  if (!text) return 'Something went wrong. Please try again.';
  if (text.includes('invalid login credentials')) return 'Email or password is incorrect.';
  if (text.includes('email not confirmed')) {
    return 'Confirm your email before signing in. Check your inbox for the link.';
  }
  if (text.includes('user already registered')) {
    return 'An account already exists for this email. Sign in instead.';
  }
  if (text.includes('password should be at least')) {
    return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (text.includes('rate limit')) return 'Too many attempts. Wait a moment and try again.';
  if (text.includes('network')) return 'Cannot reach the server. Check your connection.';
  return message ?? 'Something went wrong. Please try again.';
}
