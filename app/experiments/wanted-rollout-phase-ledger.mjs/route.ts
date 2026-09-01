import{experimentRolloutPhaseLedgerVerifierSource}from"../rollout-phase-ledger-verifier-source.ts";
export function GET(){return new Response(experimentRolloutPhaseLedgerVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-rollout-phase-ledger.mjs"',"cache-control":"public, max-age=3600"}})}
