/**
 * Client-side form validators.
 * These mirror backend/schemas/auth.py so users get instant feedback;
 * the backend remains the source of truth and is always re-checked there.
 */

const EMAIL_PATTERN = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

export function validateName(value) {
  const v = (value || "").trim();
  if (!v) return "Full name is required.";
  if (v.length < 2) return "Name must be at least 2 characters.";
  if (v.length > 100) return "Name must be 100 characters or fewer.";
  return "";
}

export function validateEmail(value) {
  const v = (value || "").trim();
  if (!v) return "Email address is required.";
  if (!EMAIL_PATTERN.test(v)) return "Enter a valid email address.";
  return "";
}

export function validatePhone(value) {
  const v = (value || "").trim();
  if (!v) return ""; // optional
  if (!/^\+?[0-9\s().-]+$/.test(v)) {
    return "Use digits, spaces, + ( ) and - only.";
  }
  const digits = v.replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) {
    return "Phone number must have 7 to 15 digits.";
  }
  return "";
}

export function passwordChecks(value) {
  const v = value || "";
  return {
    length: v.length >= 8,
    letter: /[A-Za-z]/.test(v),
    number: /[0-9]/.test(v),
    mixed: /[a-z]/.test(v) && /[A-Z]/.test(v),
    symbol: /[^A-Za-z0-9]/.test(v),
  };
}

export function validatePassword(value) {
  const v = value || "";
  if (!v) return "Password is required.";
  const c = passwordChecks(v);
  if (!c.length) return "Password must be at least 8 characters.";
  if (!c.letter || !c.number) return "Password must include a letter and a number.";
  if (v.length > 128) return "Password must be 128 characters or fewer.";
  return "";
}

export function validateConfirmPassword(password, confirm) {
  if (!confirm) return "Please confirm your password.";
  if (password !== confirm) return "Passwords do not match.";
  return "";
}

/**
 * 0-4 strength score. Required rules (8+ chars, letter, number) gate score >= 2.
 */
export function passwordStrength(value) {
  const v = value || "";
  if (!v) return { score: 0, label: "" };
  const c = passwordChecks(v);
  let score = 0;
  if (c.length) score += 1;
  if (c.letter && c.number) score += 1;
  if (c.mixed) score += 1;
  if (c.symbol || v.length >= 12) score += 1;
  if (!c.length || !c.letter || !c.number) score = Math.min(score, 1);
  const labels = ["", "Weak", "Fair", "Good", "Strong"];
  return { score, label: labels[score] };
}
