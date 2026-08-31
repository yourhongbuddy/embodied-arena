import type { Metadata } from "next";
import "./realtime.css";

export const metadata: Metadata = {
  title: "HILO Realtime Protocol — Embodied Arena",
  description: "A vendor-neutral protocol for measuring the human burden, intervention interval, latency, safety, and long-horizon reliability of realtime human–AI–robot systems.",
  alternates: { canonical: "/wanted-10k/realtime" },
  openGraph: {
    title: "HILO Realtime Protocol",
    description: "Benchmark the whole closed loop: human ↔ realtime intelligence ↔ robot ↔ physical world.",
    images: [{ url: "/og-wanted.png", width: 1200, height: 630, alt: "HILO Realtime Protocol by Embodied Arena" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "HILO Realtime Protocol",
    description: "Measure how much human attention a realtime robot actually consumes.",
    images: ["/og-wanted.png"],
  },
};

export default function RealtimeLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
