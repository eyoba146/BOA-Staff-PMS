/**
 * Small, composable client-side validators. Client validation is for UX only —
 * the backend must re-validate every request (SRS §19).
 * Each validator returns an error message or `undefined`.
 */
export type Validator = (value: string) => string | undefined;

export const required =
  (label = 'This field'): Validator =>
  (v) =>
    v.trim() ? undefined : `${label} is required.`;

export const minLength =
  (n: number, label = 'This field'): Validator =>
  (v) =>
    v.trim().length >= n ? undefined : `${label} must be at least ${n} characters.`;

export const email: Validator = (v) =>
  !v.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim()) ? undefined : 'Enter a valid email address.';

/** Ethiopian mobile formats: 09XXXXXXXX, 07XXXXXXXX or +2519/+2517XXXXXXXX. */
export const phone: Validator = (v) =>
  !v.trim() || /^(\+251|0)[79]\d{8}$/.test(v.replace(/\s/g, '')) ? undefined : 'Enter a valid phone number (e.g. 0911 234 567).';

export const employeeId: Validator = (v) =>
  !v.trim() || /^[A-Za-z0-9-]{3,20}$/.test(v.trim()) ? undefined : 'Use 3–20 letters, numbers or dashes.';

export const PASSWORD_RULES = [
  { id: 'len', label: 'At least 8 characters', test: (v: string) => v.length >= 8 },
  { id: 'upper', label: 'An uppercase letter', test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower', label: 'A lowercase letter', test: (v: string) => /[a-z]/.test(v) },
  { id: 'num', label: 'A number', test: (v: string) => /\d/.test(v) },
] as const;

export const strongPassword: Validator = (v) =>
  PASSWORD_RULES.every((r) => r.test(v)) ? undefined : 'Password does not meet the requirements.';

export const nonNegativeNumber =
  (opts: { integer?: boolean; max?: number } = {}): Validator =>
  (v) => {
    if (!v.trim()) return 'Enter a value.';
    const n = Number(v);
    if (Number.isNaN(n)) return 'Enter a number.';
    if (n < 0) return 'Value cannot be negative.';
    if (opts.integer && !Number.isInteger(n)) return 'Enter a whole number.';
    if (opts.max !== undefined && n > opts.max) return `Value cannot exceed ${opts.max}.`;
    return undefined;
  };

/** Run validators in order, returning the first error. */
export function validate(value: string, ...validators: Validator[]): string | undefined {
  for (const fn of validators) {
    const err = fn(value);
    if (err) return err;
  }
  return undefined;
}

/** Validate a whole form: `{ field: [validators] }` → `{ field: error }` (only failing fields). */
export function validateForm<T extends Record<string, string>>(
  values: T,
  schema: Partial<Record<keyof T, Validator[]>>,
): Partial<Record<keyof T, string>> {
  const errors: Partial<Record<keyof T, string>> = {};
  for (const key in schema) {
    const err = validate(values[key] ?? '', ...(schema[key] ?? []));
    if (err) errors[key] = err;
  }
  return errors;
}

export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(Boolean);
}
