import { useState, useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  onClear?: () => void;
  placeholder?: string;
  defaultValue?: string;
  debounceMs?: number;
}

export function SearchBar({
  onSearch,
  onClear,
  placeholder = "Search emails...",
  defaultValue = "",
  debounceMs = 2000,
}: SearchBarProps) {
  const [query, setQuery] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Debounced search effect
  useEffect(() => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // If query is empty, clear search immediately
    if (query.trim() === "") {
      if (onClear) {
        onClear();
      }
      return;
    }

    // Set new timer for debounced search
    debounceTimerRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, debounceMs);

    // Cleanup function
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, onSearch, onClear, debounceMs]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Submit is now optional - debounce handles search automatically
    // But we can still allow immediate search on Enter if needed
    if (query.trim()) {
      // Clear debounce timer and search immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      onSearch(query.trim());
    }
  };

  const handleClear = () => {
    setQuery("");
    // Clear debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (onClear) {
      onClear();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl">
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-4 w-4 text-gray-400" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-20 h-10"
        />
        {query && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-2 h-6 w-6 p-0"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        <div className="absolute right-12 hidden sm:flex items-center gap-1 text-xs text-gray-400 pointer-events-none">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">
            {navigator.platform.includes("Mac") ? "⌘" : "Ctrl"}
          </kbd>
          <span>+</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded border border-gray-200">K</kbd>
        </div>
      </div>
    </form>
  );
}
