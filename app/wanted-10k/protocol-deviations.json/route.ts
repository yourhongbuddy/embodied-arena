import { protocolDeviationContract } from "../protocol-deviations/profile.ts";
export function GET(){return Response.json(protocolDeviationContract,{headers:{"cache-control":"public, max-age=300"}})}
