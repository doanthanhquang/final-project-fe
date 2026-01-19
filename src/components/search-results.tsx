import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EmailCardData } from "@/types/kanban";

interface SearchResultsProps {
  results: (EmailCardData & { relevance_score?: number })[];
  query: string;
  isLoading?: boolean;
  error?: string | null;
  onClear: () => void;
  onEmailClick?: (emailId: string) => void;
}

export function SearchResults({
  results,
  query,
  isLoading = false,
  error = null,
  onClear,
  onEmailClick,
}: SearchResultsProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
        <p className="text-sm text-gray-500">Searching...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <Button onClick={onClear} variant="outline">
          Clear search
        </Button>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Search className="h-12 w-12 text-gray-300 mb-4" />
        <p className="text-lg font-medium text-gray-700 mb-2">No results found</p>
        <p className="text-sm text-gray-500 mb-4">
          No emails match your search for &quot;{query}&quot;
        </p>
        <Button onClick={onClear} variant="outline">
          Clear search
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Search Results
            {results.length > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                ({results.length} {results.length === 1 ? "result" : "results"})
              </span>
            )}
          </h2>
          <p className="text-sm text-gray-500 mt-1">Results for &quot;{query}&quot;</p>
        </div>
        <Button onClick={onClear} variant="ghost" size="sm">
          <X className="h-4 w-4 mr-2" />
          Clear
        </Button>
      </div>

      {/* Results List */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-3">
          {results.map((email) => (
            <div
              key={email.id}
              className="cursor-pointer hover:bg-gray-50 rounded-lg transition-colors"
              onClick={() => onEmailClick?.(email.id)}
            >
              <div className="bg-white rounded-lg border border-gray-200 p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-gray-600">
                        {email.sender.name?.charAt(0).toUpperCase() || "?"}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm truncate ${!email.read ? "font-semibold" : "font-medium"}`}
                      >
                        {email.sender.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(email.date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subject */}
                <h3 className={`text-sm mb-2 ${!email.read ? "font-semibold" : "font-medium"}`}>
                  {email.subject}
                </h3>

                {/* Summary */}
                {email.summary && (
                  <p className="text-xs text-gray-600 line-clamp-2 mb-2">{email.summary}</p>
                )}

                {/* Relevance Score */}
                {email.relevance_score !== undefined && (
                  <div className="text-xs text-gray-500">
                    Relevance: {Math.round(email.relevance_score)}%
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
