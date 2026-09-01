import { rootWitnessReceiptSchema } from "../root-witness-receipt-sdk/source.ts";

export async function GET(){return Response.json(rootWitnessReceiptSchema,{headers:{"cache-control":"public, max-age=3600"}});}
