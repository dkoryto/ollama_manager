export function getErrorMessage(err: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "Internal server error";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg || "Internal server error";
}

export function validateModelName(body: unknown): string {
  const b = body as Record<string, unknown>;
  const name = b?.name || b?.model;
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new Error("Missing or invalid 'model' / 'name' field");
  }
  return name.trim();
}
