import { cohortIntegritySchema } from "../cohort-integrity/profile";export async function GET(){return Response.json(cohortIntegritySchema,{headers:{"cache-control":"public, max-age=3600"}})}
