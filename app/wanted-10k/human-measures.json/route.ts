import { humanMeasuresContract } from "../human-measures/profile.ts";
export async function GET(){return Response.json(humanMeasuresContract,{headers:{"cache-control":"public, max-age=3600"}})}
