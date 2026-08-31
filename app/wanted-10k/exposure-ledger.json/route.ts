import { exposureLedgerContract } from "../exposure-ledger/profile";export async function GET(){return Response.json(exposureLedgerContract,{headers:{"cache-control":"public, max-age=3600"}})}
