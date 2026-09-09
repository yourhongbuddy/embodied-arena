import { handleStudioMcp } from "../mcp-server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => handleStudioMcp(request);
export const GET = () => new Response(null, { status: 405, headers: { Allow: "POST" } });
export const DELETE = GET;
