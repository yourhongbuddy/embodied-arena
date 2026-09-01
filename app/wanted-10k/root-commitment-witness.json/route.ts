import { rootCommitmentWitnessContract } from "../root-commitment-witness/profile";
export async function GET(){return Response.json(rootCommitmentWitnessContract,{headers:{"cache-control":"public, max-age=3600"}})}
