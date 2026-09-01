import { getD1 } from "../../../db/d1";

const allowedEvents = new Set(["page_view","heartbeat","scan_started","scan_failed","scan_completed","report_downloaded","video_opened","video_recommended","leaderboard_filter","campaign_reviewed","experiment_exposure","experiment_goal"]);
const identifier = /^[A-Za-z0-9_-]{8,80}$/;
const empty = { totals:{views:0,sessions:0,scans:0,downloads:0,heartbeats:0},live:0,paths:[],events:[],status:"unavailable" };

function safeMetadata(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: Record<string,string|number|boolean|null> = {};
  for (const [key,item] of Object.entries(value)) if (/^[a-z][a-z0-9_]{0,39}$/.test(key) && (item === null || ["string","number","boolean"].includes(typeof item))) output[key] = typeof item === "string" ? item.slice(0,160) : item as number|boolean|null;
  return output;
}

export async function POST(request: Request) {
  try {
    if (Number(request.headers.get("content-length") || 0) > 8_192) return new Response(null,{status:413});
    const body = await request.json() as Record<string,unknown>;
    const sessionId = String(body.sessionId || ""), eventType = String(body.eventType || ""), path = String(body.path || "");
    if (!identifier.test(sessionId) || !allowedEvents.has(eventType) || !path.startsWith("/") || path.length > 180) return new Response(null,{status:400});
    const metadata = JSON.stringify(safeMetadata(body.metadata));
    const db=await getD1();
    await db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)").bind(sessionId,eventType,path,metadata).run();
    return new Response(null,{status:204});
  } catch {
    return new Response(null,{status:204,headers:{"x-analytics-status":"unavailable"}});
  }
}

export async function GET() {
  try {
    const db=await getD1();
    const [totals,live,paths,events]=await Promise.all([
      db.prepare("SELECT SUM(event_type='page_view') views, COUNT(DISTINCT session_id) sessions, SUM(event_type='scan_completed') scans, SUM(event_type='report_downloaded') downloads, SUM(event_type='heartbeat') heartbeats FROM analytics_events WHERE created_at >= datetime('now','-7 days')").first<Record<string,number>>(),
      db.prepare("SELECT COUNT(DISTINCT session_id) live FROM analytics_events WHERE created_at >= datetime('now','-90 seconds')").first<{live:number}>(),
      db.prepare("SELECT path,COUNT(*) views FROM analytics_events WHERE event_type='page_view' AND created_at >= datetime('now','-7 days') GROUP BY path ORDER BY views DESC LIMIT 10").all<{path:string;views:number}>(),
      db.prepare("SELECT event_type eventType,path,created_at createdAt FROM analytics_events WHERE created_at >= datetime('now','-7 days') ORDER BY id DESC LIMIT 20").all<{eventType:string;path:string;createdAt:string}>(),
    ]);
    return Response.json({totals:{views:Number(totals?.views||0),sessions:Number(totals?.sessions||0),scans:Number(totals?.scans||0),downloads:Number(totals?.downloads||0),heartbeats:Number(totals?.heartbeats||0)},live:Number(live?.live||0),paths:paths.results,events:events.results,status:"ready"});
  } catch { return Response.json(empty); }
}
