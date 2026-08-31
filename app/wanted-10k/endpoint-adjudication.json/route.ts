import { endpointContract } from "../endpoint-adjudication/profile";
export async function GET(){return Response.json(endpointContract,{headers:{"cache-control":"public, max-age=3600"}})}
