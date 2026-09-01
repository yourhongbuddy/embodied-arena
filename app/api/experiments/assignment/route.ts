import { getD1 } from "../../../../db/d1.ts";
import { createAssignmentReceiptRecord,EXPERIMENT_ASSIGNMENT_RECEIPT_MAX_BODY_BYTES,storeAssignmentReceipt,validAssignmentReceiptSessionId } from "../../../experiments/assignment-receipt.ts";
import { validExperimentUnitId } from "../../../experiments/rotator.ts";

const headers={"cache-control":"no-store"};

export async function POST(request:Request){
  if(request.headers.get("sec-fetch-site")==="cross-site")return new Response(null,{status:403,headers});
  const origin=request.headers.get("origin");
  if(origin){try{if(new URL(origin).origin!==new URL(request.url).origin)return new Response(null,{status:403,headers})}catch{return new Response(null,{status:403,headers})}}
  if(!request.headers.get("content-type")?.toLowerCase().includes("application/json"))return new Response(null,{status:415,headers});
  if(Number(request.headers.get("content-length")||0)>EXPERIMENT_ASSIGNMENT_RECEIPT_MAX_BODY_BYTES)return new Response(null,{status:413,headers});
  let body:Record<string,unknown>;
  try{const text=await request.text();if(new TextEncoder().encode(text).byteLength>EXPERIMENT_ASSIGNMENT_RECEIPT_MAX_BODY_BYTES)return new Response(null,{status:413,headers});body=JSON.parse(text) as Record<string,unknown>}catch{return new Response(null,{status:400,headers})}
  if(!validExperimentUnitId(body.unit_id)||!validAssignmentReceiptSessionId(body.session_id))return new Response(null,{status:400,headers});
  try{
    const receipt=createAssignmentReceiptRecord(body.unit_id,body.session_id,crypto.randomUUID());
    await storeAssignmentReceipt(await getD1(),receipt);
    return Response.json({status:"issued",...receipt},{headers});
  }catch{return Response.json({status:"unavailable"},{status:503,headers})}
}
