export function sanitizePlainText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/<[^>]*>/g, '')
    .replaceAll(String.fromCharCode(0), '')
    .replace(/\r\n?/g, '\n')
    .trim();
}

export function countWords(value: string): number {
  const trimmed = value.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}
