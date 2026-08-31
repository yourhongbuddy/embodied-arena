import { learningContract } from "../learning-generalization/profile.ts";
export async function GET(){return Response.json(learningContract,{headers:{"cache-control":"public, max-age=3600"}})}
