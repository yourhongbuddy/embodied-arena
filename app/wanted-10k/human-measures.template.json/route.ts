import { humanMeasuresTemplate } from "../human-measures/profile.ts";
export async function GET(){return Response.json(humanMeasuresTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
