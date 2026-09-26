import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../../components/SiteNav";
import post from "../../../public/blog/gpt-6-astra-robot-longevity.json";
import styles from "../blog.module.css";

const articlePath = `/blog/${post.slug}`;
export const metadata: Metadata = {
  title: `${post.title} | HILO Blog`,
  description: post.excerpt,
  alternates: { canonical: articlePath },
  openGraph: { title: post.title, description: post.excerpt, url: articlePath, type: "article", publishedTime: post.published_on },
  twitter: { card: "summary", title: post.title, description: post.excerpt },
};

export default function RobotLongevityArticle() {
  return <div className={styles.page}>
    <SiteNav />
    <main className={styles.container}>
      <article>
        <header className={styles.hero}>
          <Link className={styles.back} href="/blog">← HILO Blog</Link>
          <p className={styles.eyebrow}>CAPABILITY ≠ LONGEVITY</p>
          <h1>{post.title}</h1>
          <p className={styles.lead}>{post.excerpt}</p>
          <div className={styles.meta}><time dateTime={post.published_on}>September 6, 2026</time><span className={styles.badge}>Source-reported / not HILO-certified</span></div>
        </header>
        <div className={styles.prose}>
          <aside className={styles.notice}>
            <strong>Evidence boundary.</strong> This is HILO commentary on an external report, not an independent replication or an official model-provider announcement. No HILO-verified longevity or certification is claimed.
          </aside>
          <section aria-labelledby="reported-results">
            <h2 id="reported-results">What RoboCurve reported</h2>
            <p>RoboCurve’s September 4, 2026 report evaluates GPT-6 Astra and Fable models on two manipulation tasks using I2RT YAM arms. The selected results below are source-reported, not independently reproduced by HILO. <a href={post.source.url} rel="external">Read the original experiment.</a></p>
            <div className={styles.tableWrap} role="region" aria-label="Reported manipulation results" tabIndex={0}>
              <table>
                <caption>Selected source-reported results. Time is the reported mean per run; costs are estimates in USD.</caption>
                <thead><tr><th scope="col">Model</th><th scope="col">Task</th><th scope="col">Completed</th><th scope="col">Rate</th><th scope="col">Min/run</th><th scope="col">Est. $/run</th></tr></thead>
                <tbody>{post.results.map((row) => <tr key={`${row.model}-${row.task}`}>
                  <th scope="row">{row.model}</th><td>{row.task}</td><td>{row.completed}/{row.trials}</td><td>{(100 * row.completed / row.trials).toFixed(0)}%</td><td>{row.minutes_per_run.toFixed(1)}</td><td>${row.estimated_usd_per_run.toFixed(2)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            <h3>Limitations travel with the result</h3>
            <ul>{post.limitations.map((limitation) => <li key={limitation}>{limitation}</li>)}</ul>
            <p className={styles.small}>Source: <a href={post.source.url} rel="external">{post.source.publisher}, {post.source.title}</a>. Checked September 6, 2026. Model names and numerical results follow that report.</p>
          </section>
          {post.sections.map((section) => <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </section>)}
          <section className={styles.card} aria-labelledby="next-steps">
            <h2 id="next-steps">Explore the benchmark</h2>
            <p>For the existing endpoint, resident-clock rules, evidence requirements, and certification boundaries, read the project protocol rather than interpreting the examples above as a new scoring formula.</p>
            <div className={styles.actions}>
              <Link className={styles.button} href="/wanted-10k/protocol">WANTED-10K protocol →</Link>
              <Link className={styles.textLink} href="/wanted-10k/certification">Certification requirements</Link>
              <a className={styles.textLink} href="/blog/gpt-6-astra-robot-longevity.json" download>Download article + evidence JSON</a>
            </div>
          </section>
        </div>
      </article>
    </main>
  </div>;
}
