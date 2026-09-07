import test from "node:test";
import assert from "node:assert/strict";
import { isTopic, nasaHeadlines, normalizeArticles, publicLink } from "../app/news/catalog.ts";
import { dispatchHref, isDispatchHost } from "../app/news/domain.ts";
import { createNewsService } from "../app/news/feed.ts";

test("news links reject executable, credential-bearing and local addresses", () => {
  for (const value of ["javascript:alert(1)", "data:text/html,x", "https://user:secret@example.com/", "http://localhost/", "http://127.0.0.1/", "http://[::1]/", "https://host.local/", {}, null]) assert.equal(publicLink(value), null);
  assert.equal(publicLink("https://www.nasa.gov/news/"), "https://www.nasa.gov/news/");
});

test("headlines are bounded, deduplicated and attributed to the actual link host", () => {
  const item = { title: "A new discovery", url: "https://www.nasa.gov/example", domain: "fake.example", seendate: "20260906T123000Z", sourcecountry: "United States" };
  const articles = normalizeArticles({ articles: [item, { ...item, title: " A new   discovery ", url: "https://example.com/duplicate" }, { ...item, title: "Unsafe", url: "javascript:alert(1)" }, { ...item, title: [] }] });
  assert.equal(articles.length, 1); assert.equal(articles[0].publisher, "nasa.gov"); assert.equal(articles[0].seenAt, "2026-09-06T12:30:00Z");
  assert.equal(normalizeArticles({ articles: Array.from({ length: 200 }, (_, n) => ({ ...item, title: `Story ${n}`, url: `https://example.com/${n}` })) }).length, 40);
  assert.deepEqual(normalizeArticles({ error: "unavailable" }), []);
});

test("only known topics are queried and independent domains match exactly", () => {
  assert.equal(isTopic("politics"), true); assert.equal(isTopic("politics OR anything"), false);
  assert.equal(isDispatchHost("dispatch.example", "dispatch.example"), true);
  assert.equal(isDispatchHost("www.dispatch.example:443", "dispatch.example"), true);
  assert.equal(isDispatchHost("DISPATCH.EXAMPLE", "dispatch.example"), true);
  for (const host of ["getrobotrouter.com", "dispatch.example.attacker.com", "attacker-dispatch.example", "dispatch.example@attacker.com"]) assert.equal(isDispatchHost(host, "dispatch.example"), false);
  assert.equal(isDispatchHost("dispatch.example", "https://dispatch.example"), false);
  assert.equal(isDispatchHost("dispatch.example", ""), false);
  assert.equal(isDispatchHost("shark-app-pqh5h.ondigitalocean.app"), true);
  assert.equal(dispatchHref("localhost:5180"), "/news");
  assert.equal(dispatchHref("www.getrobotrouter.com"), "https://shark-app-pqh5h.ondigitalocean.app/");
  assert.equal(dispatchHref("www.getrobotrouter.com", "https://bad.example"), "/news");
});

const nasa = '<rss><channel><item><title><![CDATA[Science &amp; discovery]]></title><link>https://www.nasa.gov/example/</link><pubDate>Sun, 06 Sep 2026 12:00:00 GMT</pubDate><description>Never copied</description></item><item><title>Wrong source</title><link>https://nasa.gov.attacker.example/</link></item></channel></rss>';
test("NASA fallback keeps attributed headlines and publication dates without article bodies", () => {
  const articles = nasaHeadlines(nasa); assert.equal(articles.length, 1);
  assert.equal(articles[0].title, "Science & discovery"); assert.equal(articles[0].publisher, "NASA");
  assert.equal(articles[0].seenAt, "2026-09-06T12:00:00.000Z"); assert.equal(articles[0].dateKind, "published");
  assert.ok(!JSON.stringify(articles).includes("Never copied"));
});

test("provider rate limits use a labeled fallback only for appropriate topics and recover after cooldown", async () => {
  let time = Date.UTC(2026, 8, 6); let failures = true; let calls = 0;
  const getNews = createNewsService(async url => {
    calls++;
    if (url.includes("nasa.gov")) return new Response(nasa);
    if (failures) return new Response("rate limited", { status: 429 });
    return Response.json({ articles: [{ title: "World story", url: "https://example.com/story" }] });
  }, () => time);
  const feed = await getNews("top"); assert.equal(feed.source, "NASA"); assert.equal(feed.articles.length, 1); assert.match(feed.error, /broader news feed/);
  const politics = await getNews("politics"); assert.equal(politics.articles.length, 0); assert.equal(politics.stale, true);
  assert.equal(calls, 2); time += 61000; failures = false;
  const recovered = await getNews("politics"); assert.equal(recovered.source, "GDELT"); assert.equal(recovered.articles.length, 1); assert.equal(calls, 3);
});

test("cached feeds retain their original timestamp on failure and concurrent reads share a request", async () => {
  let time = 1000000; let calls = 0; let fail = false;
  const getNews = createNewsService(async () => { calls++; if (fail) throw new Error(); return Response.json({ articles: [{ title: "Story", url: "https://example.com/story" }] }); }, () => time);
  const [a, b] = await Promise.all([getNews("world"), getNews("world")]); assert.deepEqual(a, b); assert.equal(calls, 1);
  time += 610000; fail = true; const stale = await getNews("world"); assert.equal(stale.stale, true); assert.equal(stale.fetchedAt, a.fetchedAt); assert.deepEqual(stale.articles, a.articles);
});

test("malformed and oversized feeds do not become news stories", async () => {
  for (const value of ["<html>unavailable</html>", "x".repeat(500001), '{"secret":"not news"}']) {
    const getNews = createNewsService(async () => new Response(value));
    const feed = await getNews("world"); assert.equal(feed.stale, true); assert.equal(feed.articles.length, 0);
  }
});
