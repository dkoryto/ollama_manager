import { NextResponse } from "next/server";
import { ollamaFetch } from "@/lib/ollama";
import { getErrorMessage, validateModelName } from "@/lib/api-utils";

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const name = validateModelName(body);
    const res = await ollamaFetch("/api/delete", {
      method: "DELETE",
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const status =
      err instanceof Error && err.message.includes("Missing or invalid")
        ? 400
        : 500;
    return NextResponse.json({ error: getErrorMessage(err) }, { status });
  }
}
