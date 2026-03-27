import apiGatewayCrudAppPattern from "@/lib/rag/patterns/api_gateway_crud_app.json";
import authGatewayBackendPattern from "@/lib/rag/patterns/auth_gateway_backend.json";
import cacheAsideApplicationPattern from "@/lib/rag/patterns/cache_aside_application.json";
import layeredWebApplicationPattern from "@/lib/rag/patterns/layered_web_application.json";
import searchIndexingPipelinePattern from "@/lib/rag/patterns/search_indexing_pipeline.json";

import {
  architecturePatternArraySchema,
} from "@/lib/rag/pattern-schema";

const rawPatterns = [
  apiGatewayCrudAppPattern,
  authGatewayBackendPattern,
  layeredWebApplicationPattern,
  cacheAsideApplicationPattern,
  searchIndexingPipelinePattern,
] as const;

export const ARCHITECTURE_PATTERNS =
  architecturePatternArraySchema.parse(rawPatterns);

export const ARCHITECTURE_PATTERN_IDS = ARCHITECTURE_PATTERNS.map(
  (pattern) => pattern.id,
);

export const ARCHITECTURE_PATTERNS_BY_ID = new Map(
  ARCHITECTURE_PATTERNS.map((pattern) => [pattern.id, pattern]),
);
