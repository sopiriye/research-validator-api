export function trimInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim() : value;
}

export function normalizeWhitespaceInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value;
}

export function normalizeEmailInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}

export function uppercaseInput(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toUpperCase() : value;
}
