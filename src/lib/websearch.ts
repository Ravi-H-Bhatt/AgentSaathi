import "server-only";

export interface WebResult {
  title: string;
  url: string;
  content: string;
}

export function webSearchConfigured(): boolean {
  return !!process.env.TAVILY_API_KEY;
}

/**
 * Web search via Tavily (free tier). Returns a compact list of results that
 * the assistant can cite. Throws if not configured so the caller can tell the
 * user to add a key.
 */
export async function webSearch(
  query: string,
  maxResults = 6
): Promise<{ answer: string | null; results: WebResult[] }> {
  const key = process.env.TAVILY_API_KEY;
  if (!key) throw new Error("Web search is not configured.");

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      query,
      max_results: maxResults,
      search_depth: "advanced",
      include_answer: true,
    }),
  });

  if (!res.ok) {
    throw new Error(`Web search failed (${res.status}).`);
  }

  const data = (await res.json()) as {
    answer?: string;
    results?: { title: string; url: string; content: string }[];
  };

  return {
    answer: data.answer ?? null,
    results: (data.results ?? []).map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
    })),
  };
}
