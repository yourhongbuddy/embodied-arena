import { auditManifestTemplates } from "../audit/manifest";
export async function GET(){return Response.json({certification_profile_version:"0.2-C1",templates:auditManifestTemplates},{headers:{"cache-control":"public, max-age=3600"}})}
