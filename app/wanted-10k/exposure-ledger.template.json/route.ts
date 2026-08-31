import { exposureLedgerTemplate } from "../exposure-ledger/profile";export async function GET(){return Response.json(exposureLedgerTemplate,{headers:{"cache-control":"public, max-age=3600"}})}
