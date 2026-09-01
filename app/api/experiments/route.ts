import { getD1 } from "../../../db/d1.ts";
import { ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "../../experiments/rotator.ts";
import { summarizeExperiment,type RawExperimentRow } from "../../experiments/results.ts";

export const experimentResultsQuery=`WITH exposure_tokens AS (
  SELECT session_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime('now','-30 days')
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.rotator_version')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
    AND json_extract(metadata,'$.exposure_id') IS NOT NULL
  GROUP BY session_id,json_extract(metadata,'$.variant'),json_extract(metadata,'$.exposure_id')
), eligible_exposures AS (
  SELECT session_id,MIN(variant) variant,MIN(exposure_token) exposure_token
  FROM exposure_tokens
  GROUP BY session_id
  HAVING COUNT(DISTINCT variant)=1 AND COUNT(DISTINCT exposure_token)=1
), matched AS (
  SELECT e.variant,e.session_id,EXISTS(
    SELECT 1 FROM analytics_events g
    WHERE g.session_id=e.session_id
      AND g.created_at >= datetime('now','-30 days')
      AND g.event_type='experiment_goal'
      AND g.path='/wanted-10k'
      AND json_extract(g.metadata,'$.experiment')=?
      AND json_extract(g.metadata,'$.rotator_version')=?
      AND json_extract(g.metadata,'$.variant')=e.variant
      AND json_extract(g.metadata,'$.exposure_id')=e.exposure_token
      AND json_extract(g.metadata,'$.assignment_mode')='assigned'
      AND json_extract(g.metadata,'$.goal')='primary_cta'
  ) converted FROM eligible_exposures e
)
SELECT variant,COUNT(*) exposed_sessions,SUM(converted) goal_sessions
FROM matched GROUP BY variant`;

export const experimentIntegrityQuery=`WITH exposure_tokens AS (
  SELECT session_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime('now','-30 days')
    AND event_type='experiment_exposure'
    AND path='/wanted-10k'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.rotator_version')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
    AND json_extract(metadata,'$.exposure_id') IS NOT NULL
  GROUP BY session_id,json_extract(metadata,'$.variant'),json_extract(metadata,'$.exposure_id')
), session_integrity AS (
  SELECT session_id,COUNT(DISTINCT variant) variant_count,COUNT(DISTINCT exposure_token) exposure_token_count
  FROM exposure_tokens GROUP BY session_id
)
SELECT COALESCE(SUM(variant_count>1),0) cross_variant_sessions,
       COALESCE(SUM(variant_count=1 AND exposure_token_count>1),0) multi_token_sessions
FROM session_integrity`;

const emptySummary=()=>summarizeExperiment([]);

export async function GET() {
  try {
    const db=await getD1();
    const[result,integrity]=await Promise.all([
      db.prepare(experimentResultsQuery).bind(WANTED_LANDING_EXPERIMENT.id,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT.id,ROTATOR_VERSION).all<RawExperimentRow>(),
      db.prepare(experimentIntegrityQuery).bind(WANTED_LANDING_EXPERIMENT.id,ROTATOR_VERSION).first<{cross_variant_sessions:number;multi_token_sessions:number}>(),
    ]);
    return Response.json({status:"ready",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_sessions_excluded:Number(integrity?.cross_variant_sessions||0),multi_token_sessions_excluded:Number(integrity?.multi_token_sessions||0),...summarizeExperiment(result.results)},{headers:{"cache-control":"no-store"}});
  } catch { return Response.json({status:"unavailable",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,cross_variant_sessions_excluded:0,multi_token_sessions_excluded:0,...emptySummary()},{headers:{"cache-control":"no-store"}}); }
}
