export const MAX_PROMPT_CHARS = 4000;
export const MAX_NODES = 30;
export const MAX_EDGES = 60;

const HARD_BLOCK_PATTERNS = [
  /ignore\s+previous\s+instructions/i,
  /reveal\s+(the\s+)?system\s+prompt/i,
  /prompt\s+injection/i,
  /drop\s+table/i,
  /malware/i,
  /ransomware/i,
  /credential\s+theft/i,
  /shell\s+script/i,
];

export function checkPromptSafety(prompt: string) {
  const trimmed = prompt.trim();

  if (!trimmed) {
    return { ok: false, reason: "Enter a prompt before generating a diagram." };
  }

  if (trimmed.length > MAX_PROMPT_CHARS) {
    return {
      ok: false,
      reason: `Prompt is too long. Keep it under ${MAX_PROMPT_CHARS} characters.`,
    };
  }

  if (HARD_BLOCK_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return {
      ok: false,
      reason:
        "This app only supports architecture diagram requests. Remove tool-execution or prompt-manipulation instructions.",
    };
  }

  return { ok: true as const };
}
