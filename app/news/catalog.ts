export const topics = [
  { id: "top", label: "Top stories", query: "(world OR government OR economy OR science OR technology OR sports)" },
  { id: "world", label: "World", query: "(diplomacy OR international OR humanitarian)" },
  { id: "politics", label: "Politics", query: "(election OR congress OR parliament)" },
  { id: "markets", label: "Markets", query: "(economy OR inflation OR markets)" },
  { id: "technology", label: "Technology", query: '(robotics OR "artificial intelligence" OR semiconductor)' },
  { id: "science", label: "Science", query: "(research OR space OR discovery)" },
  { id: "culture", label: "Culture", query: "(film OR music OR arts)" },
  { id: "sports", label: "Sports", query: "(football OR basketball OR tennis)" },
] as const;
export type Topic = typeof topics[number]["id"];
export type NewsArticle = { title: string; url: string; publisher: string; seenAt: string | null; country: string; dateKind?: "published" };
export type NewsFeed = { topic: Topic; articles: NewsArticle[]; fetchedAt: string | null; stale: boolean; source?: "GDELT" | "NASA"; error?: string };
export function isTopic(value: string): value is Topic { return topics.some(topic => topic.id === value); }

// Only hyperlinks are shown: publisher photographs and article bodies are not copied.
export function publicLink(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2048) return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host.endsWith(".local") || host.endsWith(".localhost") || /^\d+(?:\.\d+){3}$/.test(host) || host.includes(":")) return null;
    return url.href;
  } catch { return null; }
}
export function normalizeArticles(payload: unknown): NewsArticle[] {
  if (!payload || typeof payload !== "object" || !("articles" in payload) || !Array.isArray(payload.articles)) return [];
  const seen = new Set<string>(); const articles: NewsArticle[] = [];
  for (const item of payload.articles.slice(0, 100)) {
    if (!item || typeof item !== "object") continue;
    const url = publicLink(item.url);
    if (!url || typeof item.title !== "string" || !item.title.trim() || item.title.length > 500) continue;
    const title = item.title.replace(/\s+/g, " ").trim();
    const key = title.toLowerCase(); if (seen.has(key)) continue; seen.add(key);
    const date = typeof item.seendate === "string" && /^\d{8}T\d{6}Z$/.test(item.seendate) ? item.seendate.replace(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/, "$1-$2-$3T$4:$5:$6Z") : "";
    articles.push({ title, url, publisher: new URL(url).hostname.replace(/^www\./, ""), seenAt: Number.isFinite(Date.parse(date)) ? date : null, country: typeof item.sourcecountry === "string" ? item.sourcecountry.slice(0, 60) : "" });
    if (articles.length === 40) break;
  }
  return articles;
}

// Extract only RSS headlines, links and dates. Article bodies and images are
// never rendered, and XML entities never resolve remotely.
export function nasaHeadlines(xml: string): NewsArticle[] {
  function text(value: string) {
    const entities: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
    return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").replace(/<[^>]*>/g, "").replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity: string) => {
      if (!entity.startsWith("#")) return entities[entity.toLowerCase()] ?? "";
      const code = entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return code > 31 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "";
    }).replace(/\s+/g, " ").trim();
  }
  const articles: NewsArticle[] = []; const seen = new Set<string>();
  for (const match of xml.slice(0, 500000).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)) {
    const item = match[1]; const title = text(item.match(/<title(?:\s[^>]*)?>([\s\S]*?)<\/title>/i)?.[1] ?? "");
    const url = publicLink(text(item.match(/<link(?:\s[^>]*)?>([\s\S]*?)<\/link>/i)?.[1] ?? ""));
    if (!title || title.length > 500 || !url || seen.has(url)) continue;
    const host = new URL(url).hostname; if (host !== "nasa.gov" && !host.endsWith(".nasa.gov")) continue;
    seen.add(url); const date = Date.parse(text(item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] ?? ""));
    articles.push({ title, url, publisher: "NASA", seenAt: Number.isFinite(date) ? new Date(date).toISOString() : null, dateKind: "published", country: "United States" });
    if (articles.length === 20) break;
  }
  return articles;
}
