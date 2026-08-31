import { DEVIATION_TARGETS, deviationTemplateFor, type DeviationTarget } from "../protocol-deviations/profile.ts";
export function GET(request:Request){const target=new URL(request.url).searchParams.get("target") as DeviationTarget|null;return Response.json(deviationTemplateFor(target&&DEVIATION_TARGETS.includes(target)?target:"WANTED_WILD"),{headers:{"cache-control":"public, max-age=300"}})}
