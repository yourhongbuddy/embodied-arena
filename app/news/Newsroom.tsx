"use client";
import { useEffect, useState } from "react";
import { topics, type NewsFeed, type Topic } from "./catalog";
import "./news.css";

const sourceLinks = [
  { title: "Associated Press", description: "World reporting", href: "https://apnews.com/" },
  { title: "Reuters", description: "World & markets", href: "https://www.reuters.com/" },
  { title: "NASA", description: "Space & discovery", href: "https://www.nasa.gov/news/" },
];
export function Newsroom() {
  const [topic, setTopic] = useState<Topic>("top"); const [query, setQuery] = useState("");
  const [feed, setFeed] = useState<NewsFeed | null>(null); const [loading, setLoading] = useState(true); const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/news?topic=${topic}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error(); return response.json() as Promise<NewsFeed>;
    }).then(value => { setFeed(value); setLoading(false); }).catch(() => {
      if (!controller.signal.aborted) { setFeed({ topic, articles: [], fetchedAt: null, stale: true, error: "We couldn’t reach the news feed. Try again shortly." }); setLoading(false); }
    });
    return () => controller.abort();
  }, [topic, refresh]);
  function select(next: Topic) { if (next !== topic) { setTopic(next); setLoading(true); setQuery(""); setFeed(null); } }
  const articles = (feed?.articles ?? []).filter(item => `${item.title} ${item.publisher}`.toLowerCase().includes(query.toLowerCase()));
  const label = topics.find(item => item.id === topic)!.label;
  return <div className="dispatch">
    <a className="dispatchSkip" href="#dispatch-stories">Skip to stories</a>
    <aside className="dispatchSidebar">
      <a href="/news" className="dispatchBrand" aria-label="Robot Dispatch home"><span className="dispatchMark">rd<span>●</span></span><span>ROBOT<br />DISPATCH</span></a>
      <p className="dispatchEyebrow">THE NEWS DESK</p>
      <nav aria-label="News topics">{topics.map((item, index) => <button key={item.id} aria-current={topic === item.id ? "page" : undefined} onClick={() => select(item.id)}><span className="dispatchNavNumber">{String(index + 1).padStart(2, "0")}</span>{item.label}<span className="dispatchNavArrow">↗</span></button>)}</nav>
      <div className="dispatchSidebarBottom"><p>From the world to your work.</p><a href="/studio">Benchmark Studio ↗</a><a href="/leaderboard">Robot leaderboard ↗</a><a href="/about">About Robot Router ↗</a></div>
    </aside>
    <div className="dispatchBody">
      <header className="dispatchTopline"><span><i /> An open window on the world</span><a href="/studio">Robot Router <span>↗</span></a></header>
      <main>
        <div className="dispatchMasthead"><div><p className="dispatchEyebrow">INFORMATION. PERSPECTIVE. CURIOSITY.</p><h1>The Dispatch<span aria-hidden="true">●</span></h1></div><p>A little more context.<br />A wider view.</p></div>
        <div className="dispatchEdition"><span>{label} <b>/</b> English-language coverage</span><span>By hfxaa llc</span></div>
        <div className="dispatchColumns">
          <section id="dispatch-stories" aria-labelledby="dispatch-feed-title">
            <div className="dispatchFeedHeading"><h2 id="dispatch-feed-title">{label}</h2><button className="dispatchTextButton" disabled={loading} onClick={() => { setLoading(true); setRefresh(value => value + 1); }}> {loading ? "Updating…" : "Refresh ↻"}</button></div>
            <label className="dispatchSearch"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search headlines or publishers" aria-label="Search loaded headlines or publishers" value={query} onChange={event => setQuery(event.target.value)} /><span>{articles.length} stories</span></label>
            <p className="dispatchFeedNote">{feed?.source === "NASA" ? "NASA news feed" : "Latest indexed coverage"} · Headlines link to their original publishers.{feed?.fetchedAt && <> Updated {new Date(feed.fetchedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.</>}</p>
            {loading ? <div className="dispatchLoading" role="status"><span /> Gathering the headlines…</div> : <>
              {feed?.error && <div className="dispatchNotice" role="status">{feed.error}{feed.stale && feed.articles.length > 0 && <p>Showing the last available feed.</p>}</div>}
              {articles.map((article, index) => <article className={`dispatchStory ${index === 0 ? "dispatchLead" : ""}`} key={article.url}>
                <div className="dispatchStoryMeta"><span>{article.publisher}</span>{article.country && <span>{article.country}</span>}{article.seenAt && <time dateTime={article.seenAt}>{article.dateKind === "published" ? "Published" : "Indexed"} {new Date(article.seenAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</time>}</div>
                <h3><a href={article.url} target="_blank" rel="noopener noreferrer">{article.title}<span aria-hidden="true"> ↗</span></a></h3>
                <div className="dispatchStoryFoot"><span>{index === 0 ? "IN FOCUS" : String(index + 1).padStart(2, "0")}</span><a href={article.url} target="_blank" rel="noopener noreferrer">Read at source <span aria-hidden="true">→</span></a></div>
              </article>)}
              {!articles.length && !feed?.error && <div className="dispatchNotice">{query ? "No matching headlines in this feed. Try another search." : "No headlines are available for this topic yet."}</div>}
            </>}
          </section>
          <aside className="dispatchRail" aria-label="Discover more"><div className="dispatchBrief"><span className="dispatchEyebrow">THE READING ROOM</span><h2>Stay curious.<br />Go to the source.</h2><p>Headlines are a starting point. Open the full story, compare coverage, and form your own view.</p><span className="dispatchSmallRule" /><p className="dispatchSmall">This feed is organized by topic, not fact-checked or ranked by reliability. Coverage is indexed by <a href="https://www.gdeltproject.org/" target="_blank" rel="noopener noreferrer">GDELT</a>.</p></div>
            <div className="dispatchSources"><h2>Explore the sources <span>↗</span></h2>{sourceLinks.map(source => <a key={source.href} href={source.href} target="_blank" rel="noopener noreferrer"><span><strong>{source.title}</strong><small>{source.description}</small></span><span>↗</span></a>)}</div>
            <a className="dispatchStudioCard" href="/studio"><span className="dispatchEyebrow">MAKE SOMETHING OF IT</span><h2>Bring your own<br />evidence.</h2><p>Build a benchmark. Compare results. Turn your data into a chart.</p><strong>Open Benchmark Studio ↗</strong></a>
          </aside>
        </div>
      </main>
      <footer className="dispatchFooter"><div><strong>Robot Dispatch</strong><p>Independent of IJR. A Robot Router experience by hfxaa llc.</p></div><nav aria-label="News footer"><a href="/about">About us</a><a href="/contact">Contact</a><a href="/privacy">Privacy</a><a href="/terms">Terms</a></nav></footer>
    </div>
  </div>;
}
