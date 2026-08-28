import { safetySchema } from "../safety/profile";export async function GET(){return Response.json(safetySchema,{headers:{"cache-control":"public, max-age=3600"}})}
