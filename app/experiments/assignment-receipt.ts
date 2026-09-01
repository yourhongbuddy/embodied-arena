import type { D1Binding } from "../../db/d1.ts";
import { assignWantedVariant,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_TREATMENT_FINGERPRINT,WANTED_LANDING_EXPERIMENT } from "./rotator.ts";

export const EXPERIMENT_ASSIGNMENT_RECEIPT_TTL_SECONDS=86_400;
export const EXPERIMENT_ASSIGNMENT_RECEIPT_RETENTION_DAYS=35;
export const EXPERIMENT_ASSIGNMENT_RECEIPT_MAX_BODY_BYTES=1_024;
export const EXPERIMENT_ASSIGNMENT_RECEIPT_ROUTE="/api/experiments/assignment";

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function validAssignmentReceiptId(value:unknown):value is string{return typeof value==="string"&&uuid.test(value)}
export function validAssignmentReceiptSessionId(value:unknown):value is string{return typeof value==="string"&&uuid.test(value)}

export type ExperimentAssignmentReceipt={
  receipt_id:string;
  profile:string;
  experiment:typeof WANTED_LANDING_EXPERIMENT.id;
  analysis_cohort:string;
  treatment_fingerprint:string;
  presentation_fingerprint:string;
  session_id:string;
  unit_id:string;
  variant:string;
  bucket:number;
  issued_at:string;
  expires_at:string;
};

export function createAssignmentReceiptRecord(unitId:string,sessionId:string,receiptId:string,issuedAt=new Date().toISOString()):ExperimentAssignmentReceipt{
  if(!validAssignmentReceiptSessionId(sessionId))throw new TypeError("A UUIDv4 analytics session ID is required.");
  if(!validAssignmentReceiptId(receiptId))throw new TypeError("A UUIDv4 assignment receipt ID is required.");
  if(!Number.isFinite(Date.parse(issuedAt)))throw new TypeError("A valid receipt issue time is required.");
  const assignment=assignWantedVariant(unitId);
  return{receipt_id:receiptId,profile:EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,presentation_fingerprint:EXPERIMENT_PRESENTATION_FINGERPRINT,session_id:sessionId,unit_id:unitId,variant:assignment.variant,bucket:assignment.bucket,issued_at:new Date(issuedAt).toISOString(),expires_at:new Date(Date.parse(issuedAt)+EXPERIMENT_ASSIGNMENT_RECEIPT_TTL_SECONDS*1_000).toISOString()};
}

export const ASSIGNMENT_RECEIPT_INSERT_QUERY=`INSERT INTO experiment_assignment_receipts (receipt_id,session_id,experiment,analysis_cohort,treatment_fingerprint,presentation_fingerprint,unit_id,variant,bucket,issued_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;
export const ASSIGNMENT_RECEIPT_DELETE_QUERY=`DELETE FROM experiment_assignment_receipts WHERE expires_at < ?`;
export const ASSIGNMENT_RECEIPT_VERIFY_QUERY=`SELECT receipt_id FROM experiment_assignment_receipts WHERE receipt_id=? AND session_id=? AND experiment=? AND analysis_cohort=? AND treatment_fingerprint=? AND presentation_fingerprint=? AND unit_id=? AND variant=? AND bucket=? AND issued_at<=? AND expires_at>? LIMIT 1`;

export async function storeAssignmentReceipt(db:D1Binding,receipt:ExperimentAssignmentReceipt){
  await db.prepare(ASSIGNMENT_RECEIPT_DELETE_QUERY).bind(new Date(Date.parse(receipt.issued_at)-EXPERIMENT_ASSIGNMENT_RECEIPT_RETENTION_DAYS*86_400_000).toISOString()).run();
  await db.prepare(ASSIGNMENT_RECEIPT_INSERT_QUERY).bind(receipt.receipt_id,receipt.session_id,receipt.experiment,receipt.analysis_cohort,receipt.treatment_fingerprint,receipt.presentation_fingerprint,receipt.unit_id,receipt.variant,receipt.bucket,receipt.issued_at,receipt.expires_at).run();
}

type ReceiptMetadata=Record<string,string|number|boolean|null>;
export async function verifyAssignmentReceipt(db:D1Binding,sessionId:string,metadata:ReceiptMetadata,now=new Date().toISOString()){
  if(!validAssignmentReceiptSessionId(sessionId)||!validAssignmentReceiptId(metadata.assignment_receipt)||typeof metadata.unit_id!=="string"||typeof metadata.variant!=="string")return false;
  const assignment=assignWantedVariant(metadata.unit_id);
  if(assignment.variant!==metadata.variant)return false;
  const row=await db.prepare(ASSIGNMENT_RECEIPT_VERIFY_QUERY).bind(metadata.assignment_receipt,sessionId,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,metadata.unit_id,metadata.variant,assignment.bucket,now,now).first<{receipt_id:string}>();
  return row?.receipt_id===metadata.assignment_receipt;
}

export const experimentAssignmentReceiptContract={profile:EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,route:EXPERIMENT_ASSIGNMENT_RECEIPT_ROUTE,ttl_seconds:EXPERIMENT_ASSIGNMENT_RECEIPT_TTL_SECONDS,retention_after_expiry_days:EXPERIMENT_ASSIGNMENT_RECEIPT_RETENTION_DAYS,retention_covers_raw_event_window:true,binding:["receipt_id","analytics_session_id","experiment","analysis_cohort","treatment_fingerprint","presentation_fingerprint","unit_id","variant","bucket","issued_at","expires_at"],same_origin_request_required:true,server_computes_assignment:true,server_stores_no_IP_address:true,receipt_required_for_exposure:true,receipt_required_for_goal:true,receipt_replay_across_sessions_permitted:false,proves_human_traffic:false,eliminates_automated_fabrication:false,interpretation:"proves_server_issuance_for_this_session_and_frozen_presentation; does_not_prove_a_unique_or_human_user"} as const;
