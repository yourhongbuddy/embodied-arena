export async function POST() {
  return new Response(null, { status: 204 });
}

export async function GET() {
  return Response.json({
    totals: {
      views: 0,
      sessions: 0,
      scans: 0,
      downloads: 0,
      heartbeats: 0,
    },
    live: 0,
    paths: [],
    events: [],
  });
}