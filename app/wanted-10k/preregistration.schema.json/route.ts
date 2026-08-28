import { preregistrationSchema } from "../protocol/preregistration";

export async function GET() {
  return Response.json(preregistrationSchema, { headers: { "cache-control": "public, max-age=3600" } });
}
