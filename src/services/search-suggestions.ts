import { api } from "./api";

export interface SearchSuggestion {
  type: "sender" | "keyword";
  value: string;
  email?: string; // For sender type
  relevance?: number;
}

export interface SearchSuggestionsResponse {
  success: boolean;
  data: SearchSuggestion[];
}

export const searchSuggestionService = {
  /**
   * Get search suggestions based on partial query.
   *
   * @param partialQuery Partial search query
   * @param limit Maximum number of suggestions (default: 5)
   * @returns Promise with suggestions
   */
  async getSuggestions(partialQuery: string, limit: number = 5): Promise<SearchSuggestion[]> {
    if (!partialQuery || partialQuery.trim().length === 0) {
      return [];
    }

    try {
      const response = await api.get<SearchSuggestionsResponse>("/search/suggestions", {
        params: {
          query: partialQuery.trim(),
          limit,
        },
      });

      if (!response.data.success) {
        throw new Error("Failed to get suggestions");
      }

      return response.data.data || [];
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      return [];
    }
  },
};
