import { NextResponse } from "next/server";

import { analyzePrompt } from "@/lib/diagram-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: string };
    const result = await analyzePrompt(body.prompt ?? "");

    if (result.status === "blocked") {
      return NextResponse.json(result, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to analyze the prompt.",
      },
      { status: 500 },
    );
  }
}
