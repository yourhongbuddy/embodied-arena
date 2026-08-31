import { assistanceTemplate } from "../assistance-integrity/profile.ts";
export async function GET(){return Response.json(assistanceTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
