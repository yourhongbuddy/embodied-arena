import { rootCommitmentWitnessSchema } from "../root-commitment-witness/profile";
export async function GET(){return Response.json(rootCommitmentWitnessSchema,{headers:{"cache-control":"public, max-age=3600"}})}
