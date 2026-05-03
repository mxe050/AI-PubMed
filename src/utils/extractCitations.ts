export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"'）)」』、,]+/g) ?? [];
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;:]+$/, ""))));
}
