import { certificationProfile } from "../certification/profile";
export async function GET(){return Response.json(certificationProfile,{headers:{"cache-control":"public, max-age=3600"}})}

