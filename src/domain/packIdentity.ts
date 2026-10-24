/** Compare parsed JSON by content, independent of object-key order or file whitespace. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return '[' + value.map(canonicalJson).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return (
      '{' +
      Object.entries(value)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, v]) => JSON.stringify(key) + ':' + canonicalJson(v))
        .join(',') +
      '}'
    );
  return JSON.stringify(value) ?? 'null';
}
