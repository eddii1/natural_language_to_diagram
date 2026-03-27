# Natural Language to Diagram

V1 hackathon app that turns architecture-style natural language into a single editable React Flow diagram.

## Stack

- Next.js App Router
- React Flow
- ELK auto-layout
- Zod validation
- Vercel AI SDK with optional OpenAI model generation
- Zustand client state

## Features

- Generate a single architecture flowchart from natural language
- Ask clarification questions only when the prompt is materially ambiguous
- Surface inferred assumptions in the UI
- Edit nodes and edges directly on the canvas
- Apply follow-up natural-language revisions to the current diagram
- Export PNG, SVG, and JSON
- Fallback heuristic generation when no model key is configured

## Local Development

1. Install dependencies:

```bash
npm install
```

2. Copy the environment template:

```bash
cp .env.example .env.local
```

3. Optionally set `OPENAI_API_KEY` for model-backed generation. Without it, the app uses the built-in heuristic fallback.

4. Start the app:

```bash
npm run dev
```

## Validation

```bash
npm run lint
npm run build
```

## API Routes

- `POST /api/diagram/analyze`
- `POST /api/diagram/generate`
- `POST /api/diagram/revise`

## Notes

- V1 supports one canvas only. There are no sub-diagrams or drill-down views.
- Safety is best-effort hardening, not a guarantee of prompt-injection proofing.
