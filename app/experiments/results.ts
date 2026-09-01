import { EXPERIMENT_DECISION_GATE,WANTED_LANDING_EXPERIMENT } from "./rotator.ts";

export type RawExperimentRow={variant:string;exposed_units:number;goal_units:number};
export type RawReceiptIntegrityRow={issued_receipts:number;issued_units:number;exposed_receipts:number;unexposed_receipts:number;expired_unexposed_receipts:number;duplicate_identity_receipts:number};
export const BONFERRONI_TWO_COMPARISON_Z=2.241402727604947;

export function summarizeReceiptIntegrity(row:Partial<RawReceiptIntegrityRow>|null|undefined){
  const integer=(value:unknown)=>Number.isInteger(Number(value))&&Number(value)>=0?Number(value):0;
  const issuedReceipts=integer(row?.issued_receipts),issuedUnits=integer(row?.issued_units),exposedReceipts=Math.min(issuedReceipts,integer(row?.exposed_receipts)),unexposedReceipts=Math.min(issuedReceipts-exposedReceipts,integer(row?.unexposed_receipts)),expiredUnexposedReceipts=Math.min(unexposedReceipts,integer(row?.expired_unexposed_receipts)),duplicateIdentityReceipts=Math.min(issuedReceipts,integer(row?.duplicate_identity_receipts));
  return{profile:"0.22-RD1",window_days:30,issued_receipts:issuedReceipts,issued_units:issuedUnits,exposed_receipts:exposedReceipts,unexposed_receipts:unexposedReceipts,active_unexposed_receipts:unexposedReceipts-expiredUnexposedReceipts,expired_unexposed_receipts:expiredUnexposedReceipts,duplicate_identity_receipts:duplicateIdentityReceipts,receipt_to_exposure_rate:issuedReceipts?exposedReceipts/issuedReceipts:null,status:issuedReceipts?"descriptive":"insufficient",counts_rejected_requests:false,proves_human_traffic:false,interpretation:"receipt issuance and accepted exposure funnel only; does not count rejected requests or identify human users"} as const;
}

export function wilsonInterval(successes:number,total:number,z=1.959963984540054){
  if(!Number.isInteger(successes)||!Number.isInteger(total)||successes<0||total<1||successes>total)return null;
  const rate=successes/total,z2=z*z,denominator=1+z2/total;
  const center=(rate+z2/(2*total))/denominator;
  const margin=z*Math.sqrt((rate*(1-rate)+z2/(4*total))/total)/denominator;
  return{low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}

export function newcombeRiskDifference(successes:number,total:number,baselineSuccesses:number,baselineTotal:number,z=BONFERRONI_TWO_COMPARISON_Z){
  const interval=wilsonInterval(successes,total,z),baselineInterval=wilsonInterval(baselineSuccesses,baselineTotal,z);
  if(!interval||!baselineInterval)return null;
  const rate=successes/total,baselineRate=baselineSuccesses/baselineTotal,difference=rate-baselineRate;
  const lower=difference-Math.sqrt((rate-interval.low)**2+(baselineInterval.high-baselineRate)**2);
  const upper=difference+Math.sqrt((interval.high-rate)**2+(baselineRate-baselineInterval.low)**2);
  return{low:Math.max(-1,lower),high:Math.min(1,upper)};
}

export function summarizeExperiment(rawRows:RawExperimentRow[]){
  const found=new Map(rawRows.map(row=>[row.variant,row]));
  const variants=WANTED_LANDING_EXPERIMENT.variants.map(variant=>{
    const row=found.get(variant.id),exposed=Number(row?.exposed_units||0),goals=Number(row?.goal_units||0);
    const interval=wilsonInterval(goals,exposed);
    return{variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_units:exposed,goal_units:goals,conversion_rate:exposed?goals/exposed:null,conversion_interval_95:interval};
  });
  const total=variants.reduce((sum,row)=>sum+row.exposed_units,0);
  const expected=variants.map(row=>total*row.weight_basis_points/10_000);
  const minimumExpected=Math.min(...expected);
  const chiSquare=total?variants.reduce((sum,row,index)=>sum+(row.exposed_units-expected[index])**2/expected[index],0):0;
  const pValue=minimumExpected>=5?Math.exp(-chiSquare/2):null;
  const baseline=variants.find(row=>row.variant==="control")!;
  const comparisons=variants.filter(row=>row.variant!=="control").map(row=>{
    const interval=newcombeRiskDifference(row.goal_units,row.exposed_units,baseline.goal_units,baseline.exposed_units);
    const lift=interval?row.conversion_rate!-baseline.conversion_rate!:null;
    return{variant:row.variant,label:row.label,baseline:"control",absolute_lift:lift,familywise_interval_95:interval,interval_position:!interval?"unavailable":interval.low>0?"entirely_above_zero":interval.high<0?"entirely_below_zero":"includes_zero"};
  });
  return{variants,comparisons,total_exposed_units:total,decision_gate:EXPERIMENT_DECISION_GATE,sample_ratio_mismatch:{method:"pearson_chi_square_df_2",alert_threshold:0.001,status:pValue===null?"insufficient":pValue<0.001?"alert":"pass",chi_square:pValue===null?null:chiSquare,p_value:pValue}};
}
