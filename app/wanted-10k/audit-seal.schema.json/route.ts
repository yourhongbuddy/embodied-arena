import { auditSealSchema } from "../audit-seal/profile";
export async function GET() { return Response.json(auditSealSchema, { headers: { "cache-control": "public, max-age=3600" } }); }
