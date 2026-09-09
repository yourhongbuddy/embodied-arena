import { nasaHeadlines, normalizeArticles, topics, type NewsFeed, type Topic } from "./catalog.ts";

async function readFeed(response: Response) {
  if (!response.ok) throw new Error("feed unavailable");
  const reader = response.body?.getReader(); if (!reader) throw new Error("empty feed");
  let size = 0; let raw = ""; const decoder = new TextDecoder();
  for (;;) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 500000) { await reader.cancel(); throw new Error("feed too large"); } raw += decoder.decode(value, { stream: true }); }
  return raw + decoder.decode();
}
export function createNewsService(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
  const cache = new Map<Topic, { value: NewsFeed; expires: number }>(); const pending = new Map<Topic, Promise<NewsFeed>>();
  let nextRequest = 0; let nasa: { raw: string; expires: number } | null = null; let nasaRequest: Promise<string> | null = null;
  async function nasaFeed() {
    if (nasa && nasa.expires > now()) return nasa.raw;
    if (nasaRequest) return nasaRequest;
    const task = (async () => {
      await Promise.resolve();
      try { const raw = await readFeed(await fetcher("https://www.nasa.gov/feed/", { signal: AbortSignal.timeout(10000), redirect: "error" })); nasa = { raw, expires: now() + 600000 }; return raw; }
      finally { nasaRequest = null; }
    })(); nasaRequest = task; return task;
  }
  return async function getNews(topic: Topic): Promise<NewsFeed> {
    const saved = cache.get(topic);
    if (saved && saved.expires > now()) return saved.value;
    const existing = pending.get(topic); if (existing) return existing;
    const unavailable = (message: string): NewsFeed => ({ topic, articles: saved?.value.articles ?? [], fetchedAt: saved?.value.fetchedAt ?? null, source: saved?.value.source, stale: true, error: message });
    const task = (async () => {
      await Promise.resolve();
      try {
        if (nextRequest > now()) throw new Error("feed cooling down");
        nextRequest = now() + 5500;
        const params = new URLSearchParams({ query: `${topics.find(item => item.id === topic)!.query} sourcelang:english`, mode: "artlist", format: "json", maxrecords: "40", timespan: "48h", sort: "datedesc" });
        const response = await fetcher(`https://api.gdeltproject.org/api/v2/doc/doc?${params}`, { signal: AbortSignal.timeout(15000), redirect: "error" });
        if (response.status === 429) nextRequest = now() + 60000;
        const payload = JSON.parse(await readFeed(response)); if (!payload || !Array.isArray(payload.articles)) throw new Error("invalid feed");
        const value: NewsFeed = { topic, articles: normalizeArticles(payload), fetchedAt: new Date(now()).toISOString(), stale: false, source: "GDELT" };
        cache.set(topic, { value, expires: now() + 600000 }); return value;
      } catch {
        if ((!saved?.value.articles.length || saved.value.source === "NASA") && ["top", "science", "technology"].includes(topic)) {
          try {
            const articles = nasaHeadlines(await nasaFeed());
            if (articles.length) {
              const value: NewsFeed = { topic, articles, fetchedAt: new Date(now()).toISOString(), stale: false, source: "NASA", error: "The broader news feed is unavailable. Showing NASA’s science and space headlines." };
              cache.set(topic, { value, expires: now() + 120000 }); return value;
            }
          } catch { /* Preserve the unavailable state if both providers fail. */ }
        }
        const value = unavailable("Headlines are temporarily unavailable. Explore the sources below or try again in a minute.");
        cache.set(topic, { value, expires: now() + 60000 }); return value;
      } finally { pending.delete(topic); }
    })(); pending.set(topic, task); return task;
  };
}
export const getNews = createNewsService();
