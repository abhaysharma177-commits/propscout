/** Short, sortable-ish, collision-safe enough for a single-device app. */
export function newId(prefix = 'p'): string {
  const rand =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}

/** Stable id derived from a name, used when seeding so re-seeding is idempotent. */
export function slugId(name: string, prefix = 'seed'): string {
  const slug = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return `${prefix}_${slug || 'unnamed'}`;
}
