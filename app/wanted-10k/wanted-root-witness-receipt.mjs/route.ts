import { rootWitnessReceiptSdkSource } from "../root-witness-receipt-sdk/source.ts";

export async function GET(){return new Response(rootWitnessReceiptSdkSource,{headers:{"content-type":"text/javascript; charset=utf-8","content-disposition":'attachment; filename="wanted-root-witness-receipt.mjs"',"cache-control":"public, max-age=3600"}});}
