import { NextResponse } from "next/server";
import { ollamaFetch } from "@/lib/ollama";
import { getErrorMessage } from "@/lib/api-utils";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params;
    const decoded = decodeURIComponent(name);
    if (!decoded || decoded.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid model name" },
        { status: 400 }
      );
    }
    const res = await ollamaFetch("/api/show", {
      method: "POST",
      body: JSON.stringify({ name: decoded }),
    });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text }, { status: res.status });
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
