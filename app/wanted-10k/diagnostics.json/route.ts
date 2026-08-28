import { diagnosticContract } from "../diagnostics/profile";
export async function GET() { return Response.json(diagnosticContract, { headers: { "cache-control": "public, max-age=3600" } }); }
