import { protocolDeviationSchema } from "../protocol-deviations/profile.ts";
export function GET(){return Response.json(protocolDeviationSchema,{headers:{"cache-control":"public, max-age=300"}})}
