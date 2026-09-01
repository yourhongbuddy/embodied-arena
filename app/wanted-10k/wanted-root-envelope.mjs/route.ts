import { rootEnvelopeSdkSource } from "../root-envelope-sdk/source.ts";

export async function GET(){return new Response(rootEnvelopeSdkSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-root-envelope.mjs"',"cache-control":"public, max-age=3600"}});}
