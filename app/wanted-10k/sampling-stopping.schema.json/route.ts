import { samplingStoppingSchema } from "../sampling-stopping/profile.ts";
export function GET(){return Response.json(samplingStoppingSchema,{headers:{"cache-control":"public, max-age=300"}})}
