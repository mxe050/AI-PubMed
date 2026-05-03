export function extractPmids(text: string): string[] {
  const matches = text.match(/\b\d{5,9}\b/g) ?? [];
  return Array.from(new Set(matches));
}
