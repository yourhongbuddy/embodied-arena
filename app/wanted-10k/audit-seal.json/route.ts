import { auditSealContract } from "../audit-seal/profile";
export async function GET() { return Response.json(auditSealContract, { headers: { "cache-control": "public, max-age=3600" } }); }
