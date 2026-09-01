import { rootWitnessTemplateFor } from "../root-commitment-witness/template";
export async function GET(){return Response.json(await rootWitnessTemplateFor("WANTED_LAB"),{headers:{"cache-control":"public, max-age=3600"}})}
