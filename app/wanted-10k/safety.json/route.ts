import { safetyContract } from "../safety/profile";export async function GET(){return Response.json(safetyContract,{headers:{"cache-control":"public, max-age=3600"}})}
