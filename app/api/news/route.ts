import { getNews } from "../../news/feed.ts";
import { isTopic } from "../../news/catalog.ts";
export async function GET(request: Request) {
  const topic = new URL(request.url).searchParams.get("topic") || "top";
  if (!isTopic(topic)) return Response.json({ error: "Choose a listed news topic." }, { status: 400 });
  return Response.json(await getNews(topic), { headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}
