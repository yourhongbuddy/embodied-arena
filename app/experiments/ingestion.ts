import { assignWantedVariant,EXPERIMENT_ANALYSIS_COHORT,EXPERIMENT_PRESENTATION_FINGERPRINT,EXPERIMENT_TREATMENT_FINGERPRINT,exposureTokenForAssignment,ROTATOR_VERSION,validExperimentUnitId,validWantedVariant,WANTED_LANDING_EXPERIMENT } from "./rotator.ts";
import { validAssignmentReceiptId } from "./assignment-receipt.ts";

export const ANALYTICS_RETENTION_DAYS=35;
export const ANALYTICS_RETENTION_QUERY=`DELETE FROM analytics_events WHERE created_at < datetime('now','-${ANALYTICS_RETENTION_DAYS} days')`;

type Metadata=Record<string,string|number|boolean|null>;

export function validExposureToken(value:unknown){return typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)}

export function validExperimentEvent(eventType:string,path:string,metadata:Metadata){
  if(path!=="/wanted-10k"||metadata.experiment!==WANTED_LANDING_EXPERIMENT.id||!validWantedVariant(metadata.variant))return false;
  if(metadata.assignment_mode!=="assigned")return false;
  if(metadata.rotator_version!==ROTATOR_VERSION)return false;
  if(metadata.analysis_cohort!==EXPERIMENT_ANALYSIS_COHORT)return false;
  if(metadata.treatment_fingerprint!==EXPERIMENT_TREATMENT_FINGERPRINT)return false;
  if(metadata.presentation_fingerprint!==EXPERIMENT_PRESENTATION_FINGERPRINT)return false;
  if(!validExperimentUnitId(metadata.unit_id))return false;
  if(!validExposureToken(metadata.exposure_id))return false;
  if(!validAssignmentReceiptId(metadata.assignment_receipt))return false;
  if(assignWantedVariant(metadata.unit_id).variant!==metadata.variant)return false;
  if(exposureTokenForAssignment(metadata.unit_id,metadata.variant)!==metadata.exposure_id)return false;
  if(eventType==="experiment_exposure")return metadata.goal===undefined&&metadata.destination===undefined;
  if(eventType!=="experiment_goal"||typeof metadata.goal!=="string"||typeof metadata.destination!=="string")return false;
  return(metadata.goal==="primary_cta"||/^secondary_[a-z0-9_-]{1,80}$/.test(metadata.goal))&&metadata.destination.startsWith("/wanted-10k")&&metadata.destination.length<=160;
}
