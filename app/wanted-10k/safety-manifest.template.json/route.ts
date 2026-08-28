import { safetyTemplate } from "../safety/profile";export async function GET(){return Response.json(safetyTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
