export function object(value: unknown, at: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${at} must be an object.`);
  }
  return value as Record<string, unknown>;
}

export function keys(value: Record<string, unknown>, allowed: string[], at: string): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) {
    throw new Error(`${at} contains an unknown field.`);
  }
}

export function string(value: unknown, at: string, allowEmpty = false): string {
  if (typeof value !== 'string' || (!allowEmpty && !value.trim())) {
    throw new Error(`${at} must be ${allowEmpty ? 'a' : 'a non-empty'} string.`);
  }
  return value;
}

export function number(value: unknown, at: string, integer = false): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 ||
      (integer && !Number.isSafeInteger(value))) {
    throw new Error(`${at} must be a non-negative ${integer ? 'safe integer' : 'finite number'}.`);
  }
  return value;
}

export function array(value: unknown, at: string): unknown[] {
  if (!Array.isArray(value)) throw new Error(`${at} must be an array.`);
  return value;
}

export function boolean(value: unknown, at: string): boolean {
  if (typeof value !== 'boolean') throw new Error(`${at} must be a boolean.`);
  return value;
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], at: string): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new Error(`${at} has an unsupported value.`);
  }
  return value as T;
}
