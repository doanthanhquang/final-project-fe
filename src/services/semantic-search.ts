import { api } from "./api";

export interface SemanticSearchResult {
  id: string;
  subject: string;
  from: string;
  date: string;
  read: boolean;
  has_attachments: boolean;
  relevance_score: number;
  [key: string]: unknown;
}

export interface SemanticSearchResponse {
  success: boolean;
  data: SemanticSearchResult[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    last_page: number;
    has_more: boolean;
  };
}

export const semanticSearchService = {
  /**
   * Search emails using semantic similarity.
   *
   * @param query Search query text
   * @param limit Maximum number of results
   * @param threshold Minimum similarity threshold (0-1)
   * @param page Page number for pagination
   * @returns Promise with search results
   */
  async searchSemantic(
    query: string,
    limit: number = 50,
    threshold?: number,
    page: number = 1
  ): Promise<SemanticSearchResponse> {
    const response = await api.post<SemanticSearchResponse>("/search/semantic", {
      query,
      limit,
      threshold,
      page,
    });

    if (!response.data.success) {
      throw new Error("Semantic search failed");
    }

    return response.data;
  },
};
