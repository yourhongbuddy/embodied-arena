import { ROTATOR_VERSION,validWantedVariant,WANTED_LANDING_EXPERIMENT } from "./rotator.ts";

export const ANALYTICS_RETENTION_DAYS=35;
export const ANALYTICS_RETENTION_QUERY=`DELETE FROM analytics_events WHERE created_at < datetime('now','-${ANALYTICS_RETENTION_DAYS} days')`;

type Metadata=Record<string,string|number|boolean|null>;

export function validExperimentEvent(eventType:string,path:string,metadata:Metadata){
  if(path!=="/wanted-10k"||metadata.experiment!==WANTED_LANDING_EXPERIMENT.id||!validWantedVariant(metadata.variant))return false;
  if(metadata.assignment_mode!=="assigned"&&metadata.assignment_mode!=="preview")return false;
  if(metadata.rotator_version!==ROTATOR_VERSION)return false;
  if(eventType==="experiment_exposure")return metadata.goal===undefined&&metadata.destination===undefined;
  if(eventType!=="experiment_goal"||typeof metadata.goal!=="string"||typeof metadata.destination!=="string")return false;
  return(metadata.goal==="primary_cta"||/^secondary_[a-z0-9_-]{1,80}$/.test(metadata.goal))&&metadata.destination.startsWith("/wanted-10k")&&metadata.destination.length<=160;
}
