import { learningTemplate } from "../learning-generalization/profile.ts";
export async function GET(){return Response.json(learningTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
