import{experimentRolloutPhaseLedgerSchema}from"../rollout-phase-ledger-schema.ts";
export function GET(){return Response.json(experimentRolloutPhaseLedgerSchema,{headers:{"cache-control":"public, max-age=3600"}})}
