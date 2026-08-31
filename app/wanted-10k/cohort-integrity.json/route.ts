import { cohortIntegrityContract } from "../cohort-integrity/profile";export async function GET(){return Response.json(cohortIntegrityContract,{headers:{"cache-control":"public, max-age=3600"}})}
