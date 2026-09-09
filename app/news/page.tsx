import type { Metadata } from "next";
import { headers } from "next/headers";
import { isDispatchHost } from "./domain";
import { Newsroom } from "./Newsroom";
export async function generateMetadata(): Promise<Metadata> {
  const canonical = isDispatchHost((await headers()).get("host")) ? "/" : "/news";
  const title = "Robot Dispatch — News & perspectives"; const description = "Explore news across the world, politics, technology, markets, science, culture, and sports. Read the original sources and ask questions with Robot Router.";
  return { title, description, alternates: { canonical }, icons: { icon: "/dispatch-icon.svg" }, openGraph: { title, description, siteName: "Robot Dispatch", url: canonical, images: [] }, twitter: { title, description, card: "summary", images: [] } };
}
export default function NewsPage() { return <Newsroom />; }
