import { getD1 } from "../../../db/d1";
import { WANTED_LANDING_EXPERIMENT } from "../../experiments/rotator";

const emptyRows = () => WANTED_LANDING_EXPERIMENT.variants.map(variant=>({variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_sessions:0,goal_sessions:0,conversion_rate:null}));

export async function GET() {
  try {
    const db=await getD1();
    const result=await db.prepare(`SELECT json_extract(metadata,'$.variant') variant,
      COUNT(DISTINCT CASE WHEN event_type='experiment_exposure' THEN session_id END) exposed_sessions,
      COUNT(DISTINCT CASE WHEN event_type='experiment_goal' AND json_extract(metadata,'$.goal')='primary_cta' THEN session_id END) goal_sessions
      FROM analytics_events
      WHERE created_at >= datetime('now','-30 days')
        AND json_extract(metadata,'$.experiment')=?
        AND json_extract(metadata,'$.assignment_mode')='assigned'
        AND event_type IN ('experiment_exposure','experiment_goal')
      GROUP BY json_extract(metadata,'$.variant')`).bind(WANTED_LANDING_EXPERIMENT.id).all<{variant:string;exposed_sessions:number;goal_sessions:number}>();
    const found=new Map(result.results.map(row=>[row.variant,row]));
    const variants=WANTED_LANDING_EXPERIMENT.variants.map(variant=>{const row=found.get(variant.id);const exposed=Number(row?.exposed_sessions||0),goals=Number(row?.goal_sessions||0);return{variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_sessions:exposed,goal_sessions:goals,conversion_rate:exposed?goals/exposed:null}});
    return Response.json({status:"ready",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,variants},{headers:{"cache-control":"no-store"}});
  } catch { return Response.json({status:"unavailable",experiment:WANTED_LANDING_EXPERIMENT.id,window_days:30,primary_goal:WANTED_LANDING_EXPERIMENT.primary_goal,variants:emptyRows()},{headers:{"cache-control":"no-store"}}); }
}
