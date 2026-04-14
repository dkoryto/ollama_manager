const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://host.docker.internal:11434";

if (!OLLAMA_HOST.startsWith("http://") && !OLLAMA_HOST.startsWith("https://")) {
  throw new Error("OLLAMA_HOST must be a valid HTTP or HTTPS URL");
}

const FETCH_TIMEOUT_MS = 300_000; // 5 minutes

export function getOllamaUrl(path: string) {
  const base = OLLAMA_HOST.replace(/\/$/, "");
  return `${base}${path}`;
}

export async function ollamaFetch(path: string, init?: RequestInit) {
  const url = getOllamaUrl(path);
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  return res;
}
