import { ollamaFetch } from "@/lib/ollama";
import { getErrorMessage, validateModelName } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const name = validateModelName(body);
    const res = await ollamaFetch("/api/pull", {
      method: "POST",
      body: JSON.stringify({ name, stream: true }),
    });
    if (!res.ok) {
      return new Response(await res.text(), { status: res.status });
    }
    return new Response(res.body, {
      status: 200,
      headers: {
        "Content-Type": "application/x-ndjson",
      },
    });
  } catch (err: unknown) {
    const status =
      err instanceof Error && err.message.includes("Missing or invalid")
        ? 400
        : 500;
    return new Response(JSON.stringify({ error: getErrorMessage(err) }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }
}
