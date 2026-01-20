import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, User, Hash, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchSuggestionService, type SearchSuggestion } from "@/services/search-suggestions";

export type SearchMode = "smart" | "fuzzy" | "semantic";

interface HybridSearchBarProps {
  onSearch: (query: string, mode: SearchMode, actualMode?: SearchMode) => void;
  onClear?: () => void;
  placeholder?: string;
  defaultValue?: string;
  debounceMs?: number;
}

/**
 * Determines which search mode to use based on query characteristics.
 * Smart mode heuristic:
 * - Use Fuzzy if query contains '@' OR many digits/symbols OR <=2 words
 * - Otherwise use Semantic
 */
function determineSmartMode(query: string): "fuzzy" | "semantic" {
  const trimmed = query.trim();

  // Check for '@' symbol (email address)
  if (trimmed.includes("@")) {
    return "fuzzy";
  }

  // Count words
  const words = trimmed.split(/\s+/).filter((w) => w.length > 0);
  if (words.length <= 2) {
    return "fuzzy";
  }

  // Count digits and symbols (excluding spaces and common punctuation)
  const digitSymbolCount = (trimmed.match(/[0-9!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/g) || []).length;

  const totalChars = trimmed.length;

  // If more than 30% are digits/symbols, use fuzzy
  if (totalChars > 0 && digitSymbolCount / totalChars > 0.3) {
    return "fuzzy";
  }

  // Default to semantic for natural language queries
  return "semantic";
}

export function HybridSearchBar({
  onSearch,
  onClear,
  placeholder = "Search emails...",
  defaultValue = "",
  debounceMs = 250,
}: HybridSearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const [searchMode, setSearchMode] = useState<SearchMode>("smart");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle keyboard shortcut (Ctrl+K / Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Handle click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debounce
  const fetchSuggestions = useCallback(async (searchQuery: string) => {
    if (searchQuery.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    setIsLoadingSuggestions(true);
    try {
      const results = await searchSuggestionService.getSuggestions(searchQuery, 5);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedIndex(-1);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, []);

  // Handle query change with debounced suggestion fetching
  useEffect(() => {
    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    if (query.trim() === "") {
      setSuggestions([]);
      setShowSuggestions(false);
      if (onClear) {
        onClear();
      }
      return;
    }

    suggestionTimerRef.current = setTimeout(() => {
      fetchSuggestions(query);
    }, debounceMs);

    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [query, debounceMs, fetchSuggestions, onClear]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || suggestions.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        handleSearch(query);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        } else {
          handleSearch(query);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSearch = (searchQuery: string) => {
    if (!searchQuery.trim()) {
      return;
    }

    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    setShowSuggestions(false);

    // Determine actual mode to use
    let actualMode: SearchMode = searchMode;
    if (searchMode === "smart") {
      actualMode = determineSmartMode(searchQuery);
    }

    onSearch(searchQuery.trim(), searchMode, actualMode);
  };

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    const searchValue =
      suggestion.type === "sender" && suggestion.email ? suggestion.email : suggestion.value;

    setQuery(searchValue);
    setShowSuggestions(false);
    handleSearch(searchValue);
  };

  const handleClear = () => {
    setQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedIndex(-1);

    if (suggestionTimerRef.current) {
      clearTimeout(suggestionTimerRef.current);
    }

    if (onClear) {
      onClear();
    }
  };

  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "sender":
        return <User className="h-4 w-4 text-blue-500" />;
      case "keyword":
        return <Hash className="h-4 w-4 text-green-500" />;
      default:
        return <Search className="h-4 w-4 text-gray-400" />;
    }
  };

  const getModeIcon = (mode: SearchMode) => {
    switch (mode) {
      case "smart":
        return <Sparkles className="h-4 w-4" />;
      case "fuzzy":
        return <Zap className="h-4 w-4" />;
      case "semantic":
        return <Sparkles className="h-4 w-4" />;
    }
  };

  return (
    <div className="w-full max-w-2xl relative">
      <div className="relative flex items-center gap-2">
        {/* Mode Selector */}
        <div className="relative">
          <select
            value={searchMode}
            onChange={(e) => {
              const newMode = e.target.value as SearchMode;
              setSearchMode(newMode);

              // If there is already a query, immediately search with the newly selected mode
              if (query.trim()) {
                handleSearch(query);
              }
            }}
            className="appearance-none bg-white border border-gray-300 rounded-lg px-3 py-2 pr-8 text-sm font-medium text-gray-700 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
            aria-label="Search mode"
          >
            <option value="smart">Smart</option>
            <option value="fuzzy">Fuzzy</option>
            <option value="semantic">Semantic (AI)</option>
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
            {getModeIcon(searchMode)}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative flex-1 flex items-center">
          <Search className="absolute left-3 h-4 w-4 text-gray-400 z-10" />
          <Input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (suggestions.length > 0) {
                setShowSuggestions(true);
              }
            }}
            placeholder={placeholder}
            className="pl-10 pr-20 h-10"
            autoComplete="off"
          />
          {query && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
              className="absolute right-2 h-6 w-6 p-0 z-10"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
          <div className="absolute right-12 hidden sm:flex items-center gap-1 text-xs text-gray-400 pointer-events-none z-10">
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">
              {typeof navigator !== "undefined" && navigator.platform?.includes("Mac")
                ? "⌘"
                : "Ctrl"}
            </kbd>
            <span>+</span>
            <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">K</kbd>
          </div>
        </div>
      </div>

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 max-h-64 overflow-y-auto"
        >
          {isLoadingSuggestions && suggestions.length === 0 ? (
            <div className="px-4 py-3 text-sm text-gray-500">Loading suggestions...</div>
          ) : (
            <ul className="py-1">
              {suggestions.map((suggestion, index) => (
                <li key={`${suggestion.type}-${suggestion.value}-${index}`}>
                  <button
                    type="button"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-left text-sm hover:bg-gray-100 transition-colors ${
                      index === selectedIndex ? "bg-gray-100" : ""
                    }`}
                  >
                    <span className="flex-shrink-0">{getSuggestionIcon(suggestion.type)}</span>
                    <span className="flex-1 truncate">{suggestion.value}</span>
                    <span className="text-xs text-gray-400 capitalize">{suggestion.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
