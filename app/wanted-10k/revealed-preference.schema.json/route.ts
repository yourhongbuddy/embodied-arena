import { preferenceSchema } from "../revealed-preference/profile.ts";
export async function GET(){return Response.json(preferenceSchema,{headers:{"cache-control":"public, max-age=3600"}})}
