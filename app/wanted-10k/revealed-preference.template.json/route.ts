import { preferenceTemplate } from "../revealed-preference/profile.ts";
export async function GET(){return Response.json(preferenceTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
