import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { emailService, type EmailListItem, type PaginatedResponse } from "@/services/email";

interface UseSearchSemanticOptions {
  limit?: number;
  page?: number;
  enabled?: boolean;
}

type SemanticSearchResult = PaginatedResponse<EmailListItem & { similarity_score?: number }> & {
  meta?: { took_ms?: number; model?: string };
};

/**
 * Semantic email search hook.
 * Wraps the semantic search endpoint and exposes a react-query result.
 */
export function useSearchSemantic(
  query: string,
  { limit = 5, page = 1, enabled = false }: UseSearchSemanticOptions = {}
): UseQueryResult<SemanticSearchResult> {
  return useQuery({
    queryKey: ["emailSearch", "semantic", query, limit, page],
    queryFn: () => emailService.searchSemantic(query, limit, page),
    enabled: enabled && query.trim().length > 0,
  });
}
