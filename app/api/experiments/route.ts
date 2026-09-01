import { getD1 } from "../../../db/d1.ts";
import { ANALYTICS_RETENTION_QUERY } from "../../experiments/ingestion.ts";
import { EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "../../experiments/rotator.ts";
import { summarizeExperiment,type RawExperimentRow } from "../../experiments/results.ts";

export const experimentResultsQuery=`WITH exposure_tokens AS (
  SELECT json_extract(metadata,'$.unit_id') unit_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime('now','-30 days')
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.analysis_cohort')=?
    AND json_extract(metadata,'$.treatment_fingerprint')=?
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
    WHERE g.created_at >= datetime('now','-30 days')
      AND g.event_type='experiment_goal'
      AND g.path='/wanted-10k'
      AND json_extract(g.metadata,'$.experiment')=?
      AND json_extract(g.metadata,'$.analysis_cohort')=?
      AND json_extract(g.metadata,'$.treatment_fingerprint')=?
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
  WHERE created_at >= datetime('now','-30 days')
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.analysis_cohort')=?
    AND json_extract(metadata,'$.treatment_fingerprint')=?
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

const emptySummary=()=>summarizeExperiment([]);

export async function GET() {
  try {
    const db=await getD1();
    await db.prepare(ANALYTICS_RETENTION_QUERY).run();
    const[result,integrity]=await Promise.all([
      db.prepare(experimentResultsQuery).bind(WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT,WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT).all<RawExperimentRow>(),
      db.prepare(experimentIntegrityQuery).bind(WANTED_LANDING_EXPERIMENT.id,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_TREATMENT_FINGERPRINT).first<{cross_variant_units:number;multi_token_units:number}>(),
    ]);
    return Response.json({status:"ready",experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,implementation_version:ROTATOR_VERSION,analysis_unit:"experiment_scoped_anonymous_browser_unit",unit_represents:"one_first_party_browser_profile_storage_instance",reported_as_unique_users:false,human_identity_resolution:false,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_units_excluded:Number(integrity?.cross_variant_units||0),multi_token_units_excluded:Number(integrity?.multi_token_units||0),...summarizeExperiment(result.results)},{headers:{"cache-control":"no-store"}});
  } catch { return Response.json({status:"unavailable",experiment:WANTED_LANDING_EXPERIMENT.id,analysis_cohort:EXPERIMENT_ANALYSIS_COHORT,treatment_fingerprint:EXPERIMENT_TREATMENT_FINGERPRINT,implementation_version:ROTATOR_VERSION,analysis_unit:"experiment_scoped_anonymous_browser_unit",unit_represents:"one_first_party_browser_profile_storage_instance",reported_as_unique_users:false,human_identity_resolution:false,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_units_excluded:0,multi_token_units_excluded:0,...emptySummary()},{headers:{"cache-control":"no-store"}}); }
}
