import { humanMeasuresSchema } from "../human-measures/profile.ts";
export async function GET(){return Response.json(humanMeasuresSchema,{headers:{"cache-control":"public, max-age=3600"}})}
