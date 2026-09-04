import type { Metadata } from "next";
import "./arenagpt.css";

const title = "ArenaGPT — Robot Model Analysis | Embodied Arena";
const description = "Explore robot model profiles and interactive comparison bar charts for manipulation, navigation, and embodied reasoning. Clearly labeled illustrative beta data.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/arenagpt" },
  openGraph: { title, description, url: "/arenagpt", type: "website", siteName: "Embodied Arena", images: [{ url: "/og.png", width: 1200, height: 630, alt: "Embodied Arena — the open arena for embodied intelligence" }] },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

export default function ArenaGPTLayout({ children }: { children: React.ReactNode }) {
  return children;
}
