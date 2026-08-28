import { diagnosticInputSchema } from "../diagnostics/profile";
export async function GET() { return Response.json(diagnosticInputSchema, { headers: { "cache-control": "public, max-age=3600" } }); }
