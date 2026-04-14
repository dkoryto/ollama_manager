import { NextResponse } from "next/server";
import { ollamaFetch } from "@/lib/ollama";
import { getErrorMessage } from "@/lib/api-utils";

export async function GET() {
  try {
    const res = await ollamaFetch("/api/version", { method: "GET" });
    if (!res.ok) {
      return NextResponse.json(
        { error: "Failed to fetch Ollama version" },
        { status: res.status }
      );
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json(
      { error: getErrorMessage(err) },
      { status: 500 }
    );
  }
}
