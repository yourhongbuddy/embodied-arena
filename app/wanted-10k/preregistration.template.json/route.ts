import { preregistrationTemplate } from "../protocol/preregistration";

export async function GET() {
  return Response.json(preregistrationTemplate, { headers: { "content-disposition": "attachment; filename=wanted-10k-preregistration.json", "cache-control": "public, max-age=3600" } });
}
