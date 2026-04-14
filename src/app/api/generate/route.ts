import { ollamaFetch } from "@/lib/ollama";
import { getErrorMessage, validateModelName } from "@/lib/api-utils";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    validateModelName(body);
    if (typeof body.prompt !== "string" || body.prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'prompt' field" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    const res = await ollamaFetch("/api/generate", {
      method: "POST",
      body: JSON.stringify(body),
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
