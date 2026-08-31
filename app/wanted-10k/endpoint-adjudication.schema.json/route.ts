import { endpointSchema } from "../endpoint-adjudication/profile";
export async function GET(){return Response.json(endpointSchema,{headers:{"cache-control":"public, max-age=3600"}})}
