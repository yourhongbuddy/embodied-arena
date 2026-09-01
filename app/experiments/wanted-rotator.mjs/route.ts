import { experimentRotatorSdkSource } from "../rotator-sdk-source.ts";

export async function GET(){return new Response(experimentRotatorSdkSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-rotator.mjs"',"cache-control":"public, max-age=3600"}})}
