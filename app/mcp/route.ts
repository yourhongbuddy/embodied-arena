import { handleMcpRequest } from "./server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Accept, Content-Type, MCP-Protocol-Version, Mcp-Method, Mcp-Name",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Max-Age": "86400",
    },
  });
}
