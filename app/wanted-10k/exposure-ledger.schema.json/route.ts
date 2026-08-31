import { exposureLedgerSchema } from "../exposure-ledger/profile";export async function GET(){return Response.json(exposureLedgerSchema,{headers:{"cache-control":"public, max-age=3600"}})}
