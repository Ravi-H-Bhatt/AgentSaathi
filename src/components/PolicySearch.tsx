"use client";

import { useState } from "react";
import { Search, CheckCircle, XCircle } from "lucide-react";

type SearchResult = {
  found: boolean;
  clientName?: string;
  clientId?: string;
  policyId?: string;
};

export function PolicySearch() {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<SearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) {
      setResult(null);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/policies/search?policy_number=${encodeURIComponent(query.trim())}`
      );
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error("Policy search error:", error);
      setResult({ found: false });
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold">Policy Search</h2>
        <p className="text-sm text-muted mt-1">
          Search by policy number to verify policies in database
        </p>
      </div>

      <div className="p-5 space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) setResult(null);
              }}
              onKeyPress={handleKeyPress}
              placeholder="Enter policy number (e.g., 0605002825P116693180)"
              className="w-full rounded-xl border border-border bg-background pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!query.trim() || isSearching}
            className="px-6 py-3 rounded-xl bg-foreground text-background font-medium text-sm hover:opacity-90 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSearching ? "Searching..." : "Search"}
          </button>
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl border-2 ${
              result.found
                ? "bg-green-50 border-green-500 dark:bg-green-950/30"
                : "bg-red-50 border-red-500 dark:bg-red-950/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {result.found ? (
                <CheckCircle className="text-green-600 dark:text-green-400 flex-shrink-0" size={24} />
              ) : (
                <XCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={24} />
              )}
              <div className="flex-1">
                <h3
                  className={`font-semibold ${
                    result.found
                      ? "text-green-900 dark:text-green-100"
                      : "text-red-900 dark:text-red-100"
                  }`}
                >
                  {result.found ? "Match Found" : "Match Not Found"}
                </h3>
                {result.found && result.clientName && (
                  <div className="mt-2 space-y-1">
                    <p
                      className={`text-sm ${
                        result.found
                          ? "text-green-800 dark:text-green-200"
                          : "text-red-800 dark:text-red-200"
                      }`}
                    >
                      <span className="font-medium">Client:</span> {result.clientName}
                    </p>
                    {result.clientId && (
                      <a
                        href={`/clients/${result.clientId}`}
                        className="inline-block mt-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition"
                      >
                        View Client Details
                      </a>
                    )}
                  </div>
                )}
                {!result.found && (
                  <p className="text-sm mt-1 text-red-800 dark:text-red-200">
                    No policy found with number: <strong>{query}</strong>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
