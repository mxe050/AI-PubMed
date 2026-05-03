export function buildPrompt(
  template: string,
  values: Record<string, string | number | string[] | undefined>
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = values[key];

    if (Array.isArray(value)) {
      return value.join("\n");
    }

    if (value === undefined || value === null || value === "") {
      return "未入力";
    }

    return String(value);
  });
}
