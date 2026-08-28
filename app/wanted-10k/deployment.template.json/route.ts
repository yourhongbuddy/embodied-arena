import { deploymentTemplate } from "../sdk/deployment";

export async function GET() {
  return Response.json(deploymentTemplate, {
    headers: {
      "content-disposition": 'attachment; filename="wanted-deployment.json"',
      "cache-control": "public, max-age=3600",
    },
  });
}
