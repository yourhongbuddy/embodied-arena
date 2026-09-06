import type { Metadata } from "next";
import Link from "next/link";
import { SiteNav } from "../components/SiteNav";
import post from "../../public/blog/gpt-6-astra-robot-longevity.json";
import styles from "./blog.module.css";

export const metadata: Metadata = {
  title: "HILO Blog — Robot Longevity & Real-World Evidence",
  description: "Source-linked robotics analysis connecting short-task capability to long-term human acceptance and the WANTED-10K benchmark.",
  alternates: { canonical: "/blog" },
  openGraph: { title: "HILO Blog", description: "From capable robots to robots people keep.", url: "/blog", type: "website" },
  twitter: { card: "summary", title: "HILO Blog", description: "From capable robots to robots people keep." },
};

export default function BlogPage() {
  return <div className={styles.page}>
    <SiteNav />
    <main className={styles.container}>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>HILO / RESEARCH JOURNAL</p>
        <h1>From capable robots<br />to robots people keep.</h1>
        <p className={styles.lead}>Evidence, failure modes, and the long road from a successful demo to 10,000 wanted hours.</p>
      </header>
      <section aria-label="Latest articles">
        <article className={styles.card}>
          <div className={styles.meta}><time dateTime={post.published_on}>September 6, 2026</time><span className={styles.badge}>External evidence / HILO analysis</span></div>
          <h2><Link href={`/blog/${post.slug}`}>{post.title}</Link></h2>
          <p>{post.excerpt}</p>
          <Link className={styles.button} href={`/blog/${post.slug}`}>Read the analysis <span aria-hidden="true">→</span></Link>
        </article>
      </section>
      <aside className={styles.notice}>
        <strong>Evidence, not endorsement.</strong> Blog coverage does not confer a HILO score or certification. <Link href="/wanted-10k/protocol">Read the WANTED-10K protocol.</Link>
      </aside>
    </main>
  </div>;
}
