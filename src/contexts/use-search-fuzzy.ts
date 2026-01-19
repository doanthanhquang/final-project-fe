import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { emailService, type EmailListItem, type PaginatedResponse } from "@/services/email";

interface UseSearchFuzzyOptions {
  limit?: number;
  page?: number;
  enabled?: boolean;
}

type FuzzySearchResult = PaginatedResponse<EmailListItem & { relevance_score?: number }>;

/**
 * Fuzzy email search hook.
 * Wraps the fuzzy search endpoint and exposes a react-query result.
 */
export function useSearchFuzzy(
  query: string,
  { limit = 5, page = 1, enabled = false }: UseSearchFuzzyOptions = {}
): UseQueryResult<FuzzySearchResult> {
  return useQuery({
    queryKey: ["emailSearch", "fuzzy", query, limit, page],
    queryFn: () => emailService.searchEmails(query, {}, page, limit, true),
    enabled: enabled && query.trim().length > 0,
  });
}
