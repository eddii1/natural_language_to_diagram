import { NextResponse } from "next/server";

import { generateDiagram } from "@/lib/diagram-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      clarificationAnswers?: Record<string, string>;
    };

    const result = await generateDiagram({
      prompt: body.prompt ?? "",
      clarificationAnswers: body.clarificationAnswers,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to generate the diagram.",
      },
      { status: 400 },
    );
  }
}
