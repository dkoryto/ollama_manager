export function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {
      // fallthrough
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}
