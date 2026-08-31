import { cohortIntegrityTemplate } from "../cohort-integrity/profile";export async function GET(){return Response.json(cohortIntegrityTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
