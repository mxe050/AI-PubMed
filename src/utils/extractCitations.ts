export function extractUrls(text: string): string[] {
  if (!text) return [];
  const matches = text.match(/https?:\/\/[^\s<>"'）)」』、,]+/g) ?? [];
  return Array.from(new Set(matches.map((u) => u.replace(/[.,;:]+$/, ""))));
}

export function extractDois(text: string): string[] {
  if (!text) return [];
  const matches =
    text.match(/10\.\d{4,9}\/[-._;()/:A-Z0-9a-z]+/gi) ?? [];
  return Array.from(
    new Set(matches.map((d) => d.replace(/[.,;:)\]]+$/, "")))
  );
}
