import { NextResponse } from "next/server";

import { reviseDiagram } from "@/lib/diagram-service";
import { diagramSpecSchema } from "@/lib/schema";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      currentDiagram?: unknown;
    };

    const parsedDiagram = diagramSpecSchema.safeParse(body.currentDiagram);
    if (!parsedDiagram.success) {
      return NextResponse.json(
        {
          error: "Current diagram payload is invalid.",
        },
        { status: 400 },
      );
    }

    const result = await reviseDiagram({
      prompt: body.prompt ?? "",
      currentDiagram: parsedDiagram.data,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to revise the diagram.",
      },
      { status: 400 },
    );
  }
}
