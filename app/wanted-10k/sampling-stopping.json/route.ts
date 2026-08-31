import { samplingStoppingContract } from "../sampling-stopping/profile.ts";
export function GET(){return Response.json(samplingStoppingContract,{headers:{"cache-control":"public, max-age=300"}})}
