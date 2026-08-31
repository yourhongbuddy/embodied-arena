import { learningSchema } from "../learning-generalization/profile.ts";
export async function GET(){return Response.json(learningSchema,{headers:{"cache-control":"public, max-age=3600"}})}
