import { getD1,type D1Binding } from "../../../db/d1.ts";
import { ANALYTICS_RETENTION_QUERY } from "../../experiments/ingestion.ts";
import { EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_ANALYSIS_SETTLING_LAG_SECONDS,EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_REPORTING_WINDOW_DAYS,EXPERIMENT_TREATMENT_FINGERPRINT,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "../../experiments/rotator.ts";
import { summarizeExperiment,summarizeReceiptIntegrity,type RawExperimentRow,type RawReceiptIntegrityVariantRow } from "../../experiments/results.ts";

export const experimentResultsQuery=`WITH exposure_tokens AS (
  SELECT json_extract(metadata,'$.unit_id') unit_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime(?) AND created_at <= datetime(?)
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.analysis_cohort')=?
    AND json_extract(metadata,'$.treatment_fingerprint')=?
    AND json_extract(metadata,'$.presentation_fingerprint')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
    AND json_extract(metadata,'$.unit_id') IS NOT NULL
    AND json_extract(metadata,'$.exposure_id') IS NOT NULL
  GROUP BY json_extract(metadata,'$.unit_id'),json_extract(metadata,'$.variant'),json_extract(metadata,'$.exposure_id')
), eligible_exposures AS (
  SELECT unit_id,MIN(variant) variant,MIN(exposure_token) exposure_token
  FROM exposure_tokens
  GROUP BY unit_id
  HAVING COUNT(DISTINCT variant)=1 AND COUNT(DISTINCT exposure_token)=1
), matched AS (
  SELECT e.variant,e.unit_id,EXISTS(
    SELECT 1 FROM analytics_events g
    WHERE g.created_at >= datetime(?) AND g.created_at <= datetime(?)
      AND g.event_type='experiment_goal'
      AND g.path='/wanted-10k'
      AND json_extract(g.metadata,'$.experiment')=?
      AND json_extract(g.metadata,'$.analysis_cohort')=?
      AND json_extract(g.metadata,'$.treatment_fingerprint')=?
      AND json_extract(g.metadata,'$.presentation_fingerprint')=?
      AND json_extract(g.metadata,'$.unit_id')=e.unit_id
      AND json_extract(g.metadata,'$.variant')=e.variant
      AND json_extract(g.metadata,'$.exposure_id')=e.exposure_token
      AND json_extract(g.metadata,'$.assignment_mode')='assigned'
      AND json_extract(g.metadata,'$.goal')='primary_cta'
  ) converted FROM eligible_exposures e
)
SELECT variant,COUNT(*) exposed_units,SUM(converted) goal_units
FROM matched GROUP BY variant`;

export const experimentIntegrityQuery=`WITH exposure_tokens AS (
  SELECT json_extract(metadata,'$.unit_id') unit_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime(?) AND created_at <= datetime(?)
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.analysis_cohort')=?
    AND json_extract(metadata,'$.treatment_fingerprint')=?
    AND json_extract(metadata,'$.presentation_fingerprint')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
    AND json_extract(metadata,'$.unit_id') IS NOT NULL
    AND json_extract(metadata,'$.exposure_id') IS NOT NULL
  GROUP BY json_extract(metadata,'$.unit_id'),json_extract(metadata,'$.variant'),json_extract(metadata,'$.exposure_id')
), unit_integrity AS (
  SELECT unit_id,COUNT(DISTINCT variant) variant_count,COUNT(DISTINCT exposure_token) exposure_token_count
  FROM exposure_tokens GROUP BY unit_id
)
SELECT COALESCE(SUM(variant_count>1),0) cross_variant_units,
       COALESCE(SUM(variant_count=1 AND exposure_token_count>1),0) multi_token_units
FROM unit_integrity`;

export const experimentReceiptIntegrityQuery=`WITH current_receipts AS (
  SELECT receipt_id,session_id,unit_id,variant,issued_at,expires_at
  FROM experiment_assignment_receipts
  WHERE expires_at>=? AND issued_at<=?
    AND experiment=? AND analysis_cohort=?
    AND treatment_fingerprint=? AND presentation_fingerprint=?
), exposure_receipts AS (
  SELECT json_extract(metadata,'$.assignment_receipt') receipt_id
  FROM analytics_events
  WHERE created_at>=datetime(?) AND created_at<=datetime(?)
    AND event_type='experiment_exposure' AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.analysis_cohort')=?
    AND json_extract(metadata,'$.treatment_fingerprint')=?
    AND json_extract(metadata,'$.presentation_fingerprint')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
  GROUP BY json_extract(metadata,'$.assignment_receipt')
), receipt_rows AS (
  SELECT r.*,e.receipt_id IS NOT NULL exposed,
         ROW_NUMBER() OVER (PARTITION BY r.variant,r.unit_id ORDER BY r.issued_at,r.receipt_id) unit_order
  FROM current_receipts r LEFT JOIN exposure_receipts e ON e.receipt_id=r.receipt_id
)
SELECT variant,COUNT(*) issued_receipts,COUNT(DISTINCT unit_id) issued_units,
       COALESCE(SUM(exposed),0) exposed_receipts,
       COUNT(DISTINCT CASE WHEN exposed THEN unit_id END) exposed_units,
       COALESCE(SUM(unit_order=1 AND expires_at<=?),0) matured_units,
       COALESCE(SUM(unit_order=1 AND expires_at<=? AND exposed),0) matured_exposed_units,
       COALESCE(SUM(NOT exposed),0) unexposed_receipts,
       COALESCE(SUM(NOT exposed AND expires_at<=?),0) expired_unexposed_receipts,
       COUNT(*)-COUNT(DISTINCT session_id||'|'||unit_id) duplicate_session_unit_receipts
FROM receipt_rows GROUP BY variant`;

const emptySummary=()=>summarizeExperiment([]);
export const experimentAnalysisClockQuery=`SELECT strftime('%Y-%m-%dT%H:%M:%SZ','now','-${EXPERIMENT_ANALYSIS_SETTLING_LAG_SECONDS} second') analysis_as_of`;

export function experimentAnalysisWindow(asOf:string){
  const endedAt=new Date(asOf);
  if(!Number.isFinite(endedAt.getTime()))throw new Error("A valid analysis timestamp is required.");
  const endedAtMs=Math.floor(endedAt.getTime()/1_000)*1_000,endedAtIso=new Date(endedAtMs).toISOString(),startedAtIso=new Date(endedAtMs-EXPERIMENT_REPORTING_WINDOW_DAYS*86_400_000).toISOString();
  return{profile:"0.28-AW2",clock:"d1_database_utc",source:"d1_clock_query_minus_settling_lag",settling_lag_seconds:EXPERIMENT_ANALYSIS_SETTLING_LAG_SECONDS,precision:"whole_seconds",started_at:startedAtIso,ended_at:endedAtIso,start_inclusive:true,end_inclusive:true,duration_days:EXPERIMENT_REPORTING_WINDOW_DAYS} as const;
}

export async function readExperimentResults(db:D1Binding){
  await db.prepare(ANALYTICS_RETENTION_QUERY).run();
  const clock=await db.prepare(experimentAnalysisClockQuery).first<{analysis_as_of:string}>();
  if(!clock?.analysis_as_of)throw new Error("The D1 analysis clock is unavailable.");
  const analysisWindow=experimentAnalysisWindow(clock.analysis_as_of),receiptCutoff=new Date(Date.parse(analysisWindow.started_at)+86_400_000).toISOString();
  const[result,integrity,receiptIntegrity]=await Promise.all([
    db.prepare(experimentResultsQuery).bind(analysisWindow.started_at,analysisWindow.ended_at,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,analysisWindow.started_at,analysisWindow.ended_at,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT).all<RawExperimentRow>(),
    db.prepare(experimentIntegrityQuery).bind(analysisWindow.started_at,analysisWindow.ended_at,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT).first<{cross_variant_units:number;multi_token_units:number}>(),
    db.prepare(experimentReceiptIntegrityQuery).bind(receiptCutoff,analysisWindow.ended_at,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,analysisWindow.started_at,analysisWindow.ended_at,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,EXPERIMENT_PRESENTATION_FINGERPRINT,analysisWindow.ended_at,analysisWindow.ended_at,analysisWindow.ended_at).all<RawReceiptIntegrityVariantRow>(),
  ]);
  return{status:"ready",experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,presentation_fingerprint:EXPERIMENT_PRESENTATION_FINGERPRINT,analysis_window_status:"bound",analysis_window:analysisWindow,assignment_receipt_profile:EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,assignment_receipt_required:true,receipt_integrity:summarizeReceiptIntegrity(receiptIntegrity.results),implementation_version:ROTATOR_VERSION,analysis_unit:"experiment_scoped_anonymous_browser_unit",unit_represents:"one_first_party_browser_profile_storage_instance",reported_as_unique_users:false,human_identity_resolution:false,window_days:EXPERIMENT_REPORTING_WINDOW_DAYS,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_units_excluded:Number(integrity?.cross_variant_units||0),multi_token_units_excluded:Number(integrity?.multi_token_units||0),...summarizeExperiment(result.results)} as const;
}

export async function GET() {
  try{return Response.json(await readExperimentResults(await getD1()),{headers:{"cache-control":"no-store"}})}
  catch{return Response.json({status:"unavailable",experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,presentation_fingerprint:EXPERIMENT_PRESENTATION_FINGERPRINT,analysis_window_status:"unavailable",analysis_window:null,assignment_receipt_profile:EXPERIMENT_ASSIGNMENT_RECEIPT_PROFILE,assignment_receipt_required:true,receipt_integrity:summarizeReceiptIntegrity(null),implementation_version:ROTATOR_VERSION,analysis_unit:"experiment_scoped_anonymous_browser_unit",unit_represents:"one_first_party_browser_profile_storage_instance",reported_as_unique_users:false,human_identity_resolution:false,window_days:EXPERIMENT_REPORTING_WINDOW_DAYS,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_units_excluded:0,multi_token_units_excluded:0,...emptySummary()},{headers:{"cache-control":"no-store"}})}
}
