import { env } from "cloudflare:workers";

const allowed=new Set(["page_view","heartbeat","scan_started","scan_completed","scan_failed","report_downloaded","leaderboard_filter","video_opened","video_recommended","campaign_reviewed"]);

async function ready(){
  const db=env.DB;
  await db.batch([
    db.prepare("CREATE TABLE IF NOT EXISTS analytics_events (id INTEGER PRIMARY KEY AUTOINCREMENT, session_id TEXT NOT NULL, event_type TEXT NOT NULL, path TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_event_path ON analytics_events(event_type, path)"),
    db.prepare("CREATE INDEX IF NOT EXISTS idx_analytics_session_created ON analytics_events(session_id, created_at)"),
  ]);
  return db;
}

export async function POST(request:Request){
  try{
    const body=await request.json() as {sessionId?:string;eventType?:string;path?:string;metadata?:Record<string,unknown>};
    if(!body.sessionId||body.sessionId.length>80||!body.eventType||!allowed.has(body.eventType))return Response.json({error:"invalid event"},{status:400});
    const path=(body.path||"/").slice(0,160);const metadata=JSON.stringify(body.metadata||{}).slice(0,1500);const db=await ready();
    await db.prepare("INSERT INTO analytics_events (session_id,event_type,path,metadata) VALUES (?,?,?,?)").bind(body.sessionId,body.eventType,path,metadata).run();
    return Response.json({ok:true},{status:201});
  }catch{return Response.json({error:"analytics unavailable"},{status:503})}
}

export async function GET(){
  try{
    const db=await ready();
    const [totals,live,paths,events]=await Promise.all([
      db.prepare("SELECT SUM(CASE WHEN event_type='page_view' THEN 1 ELSE 0 END) views, COUNT(DISTINCT session_id) sessions, SUM(CASE WHEN event_type='scan_completed' THEN 1 ELSE 0 END) scans, SUM(CASE WHEN event_type='report_downloaded' THEN 1 ELSE 0 END) downloads, SUM(CASE WHEN event_type='heartbeat' THEN 1 ELSE 0 END) heartbeats FROM analytics_events WHERE created_at >= datetime('now','-7 days')").first<Record<string,number>>(),
      db.prepare("SELECT COUNT(DISTINCT session_id) live FROM analytics_events WHERE created_at >= datetime('now','-90 seconds')").first<{live:number}>(),
      db.prepare("SELECT path, COUNT(*) views FROM analytics_events WHERE event_type='page_view' AND created_at >= datetime('now','-7 days') GROUP BY path ORDER BY views DESC LIMIT 8").all<{path:string;views:number}>(),
      db.prepare("SELECT event_type eventType,path,created_at createdAt FROM analytics_events ORDER BY id DESC LIMIT 12").all<{eventType:string;path:string;createdAt:string}>(),
    ]);
    return Response.json({totals:{views:totals?.views||0,sessions:totals?.sessions||0,scans:totals?.scans||0,downloads:totals?.downloads||0,heartbeats:totals?.heartbeats||0},live:live?.live||0,paths:paths.results,events:events.results});
  }catch{return Response.json({error:"analytics unavailable"},{status:503})}
}
