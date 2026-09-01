import { experimentSnapshotVerifierSource } from "../snapshot-verifier-source.ts";

export async function GET(){return new Response(experimentSnapshotVerifierSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-result-snapshot.mjs"',"cache-control":"public, max-age=3600"}})}
