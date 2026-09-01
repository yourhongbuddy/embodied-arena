import { getD1 } from "../../../db/d1.ts";
import { ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT } from "../../experiments/rotator.ts";
import { summarizeExperiment,type RawExperimentRow } from "../../experiments/results.ts";

export const experimentResultsQuery=`WITH exposures AS (
  SELECT session_id,json_extract(metadata,'$.variant') variant,json_extract(metadata,'$.exposure_id') exposure_token
  FROM analytics_events
  WHERE created_at >= datetime('now','-30 days')
    AND event_type='experiment_exposure'
    AND json_extract(metadata,'$.experiment')=?
    AND json_extract(metadata,'$.rotator_version')=?
    AND json_extract(metadata,'$.assignment_mode')='assigned'
    AND json_extract(metadata,'$.exposure_id') IS NOT NULL
  GROUP BY session_id,json_extract(metadata,'$.variant'),json_extract(metadata,'$.exposure_id')
), matched AS (
  SELECT e.variant,e.session_id,EXISTS(
    SELECT 1 FROM analytics_events g
    WHERE g.session_id=e.session_id
      AND g.created_at >= datetime('now','-30 days')
      AND g.event_type='experiment_goal'
      AND json_extract(g.metadata,'$.experiment')=?
      AND json_extract(g.metadata,'$.rotator_version')=?
      AND json_extract(g.metadata,'$.variant')=e.variant
      AND json_extract(g.metadata,'$.exposure_id')=e.exposure_token
      AND json_extract(g.metadata,'$.assignment_mode')='assigned'
      AND json_extract(g.metadata,'$.goal')='primary_cta'
  ) converted FROM exposures e
)
SELECT variant,COUNT(*) exposed_sessions,SUM(converted) goal_sessions
FROM matched GROUP BY variant`;

const emptySummary=()=>summarizeExperiment([]);

export async function GET() {
  try {
    const db=await getD1();
    const result=await db.prepare(experimentResultsQuery).bind(WANTED_LANDING_EXPERIMENT.id,ROTATOR_VERSION,WANTED_LANDING_EXPERIMENT.id,ROTATOR_VERSION).all<RawExperimentRow>();
    return Response.json({status:"ready",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,...summarizeExperiment(result.results)},{headers:{"cache-control":"no-store"}});
  } catch { return Response.json({status:"unavailable",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,...emptySummary()},{headers:{"cache-control":"no-store"}}); }
}
