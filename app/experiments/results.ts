import { EXPERIMENT_DECISION_GATE,WANTED_LANDING_EXPERIMENT } from "./rotator.ts";

export type RawExperimentRow={variant:string;exposed_units:number;goal_units:number};
export type RawReceiptIntegrityVariantRow={variant:string;issued_receipts:number;issued_units:number;exposed_receipts:number;exposed_units:number;matured_units:number;matured_exposed_units:number;unexposed_receipts:number;expired_unexposed_receipts:number;duplicate_session_unit_receipts:number};
export const BONFERRONI_TWO_COMPARISON_Z=2.241402727604947;

const integer=(value:unknown)=>Number.isInteger(Number(value))&&Number(value)>=0?Number(value):0;
const insufficientCheck={method:"pearson_chi_square_df_2",alert_threshold:.001,status:"insufficient",chi_square:null,p_value:null} as const;

function allocationCheck(observed:number[]){
  const total=observed.reduce((sum,value)=>sum+value,0),expected=WANTED_LANDING_EXPERIMENT.variants.map(variant=>total*variant.weight_basis_points/10_000);
  if(!total||Math.min(...expected)<5)return insufficientCheck;
  const chiSquare=observed.reduce((sum,value,index)=>sum+(value-expected[index])**2/expected[index],0),pValue=Math.exp(-chiSquare/2);
  return{method:"pearson_chi_square_df_2",alert_threshold:.001,status:pValue<.001?"alert":"pass",chi_square:chiSquare,p_value:pValue} as const;
}

function deliveryBalanceCheck(rows:{matured_units:number;matured_exposed_units:number}[]){
  const issued=rows.reduce((sum,row)=>sum+row.matured_units,0),exposed=rows.reduce((sum,row)=>sum+row.matured_exposed_units,0),unexposed=issued-exposed;
  if(!issued||!exposed||!unexposed)return insufficientCheck;
  const exposedRate=exposed/issued,expected=rows.flatMap(row=>[row.matured_units*exposedRate,row.matured_units*(1-exposedRate)]);
  if(Math.min(...expected)<5)return insufficientCheck;
  const observed=rows.flatMap(row=>[row.matured_exposed_units,row.matured_units-row.matured_exposed_units]);
  const chiSquare=observed.reduce((sum,value,index)=>sum+(value-expected[index])**2/expected[index],0),pValue=Math.exp(-chiSquare/2);
  return{method:"pearson_chi_square_homogeneity_df_2",alert_threshold:.001,status:pValue<.001?"alert":"pass",chi_square:chiSquare,p_value:pValue} as const;
}

export function summarizeReceiptIntegrity(rawRows:Partial<RawReceiptIntegrityVariantRow>[]|null|undefined){
  const found=new Map((rawRows??[]).map(row=>[row.variant,row]));
  const variants=WANTED_LANDING_EXPERIMENT.variants.map(variant=>{
    const row=found.get(variant.id),issuedReceipts=integer(row?.issued_receipts),issuedUnits=Math.min(issuedReceipts,integer(row?.issued_units)),exposedReceipts=Math.min(issuedReceipts,integer(row?.exposed_receipts)),exposedUnits=Math.min(issuedUnits,integer(row?.exposed_units)),maturedUnits=Math.min(issuedUnits,integer(row?.matured_units)),maturedExposedUnits=Math.min(maturedUnits,exposedUnits,integer(row?.matured_exposed_units)),unexposedReceipts=Math.min(issuedReceipts-exposedReceipts,integer(row?.unexposed_receipts)),expiredUnexposedReceipts=Math.min(unexposedReceipts,integer(row?.expired_unexposed_receipts)),duplicateSessionUnitReceipts=Math.min(issuedReceipts,integer(row?.duplicate_session_unit_receipts));
    return{variant:variant.id,label:variant.label,issued_receipts:issuedReceipts,issued_units:issuedUnits,exposed_receipts:exposedReceipts,exposed_units:exposedUnits,matured_units:maturedUnits,matured_exposed_units:maturedExposedUnits,pending_maturity_units:issuedUnits-maturedUnits,unexposed_receipts:unexposedReceipts,active_unexposed_receipts:unexposedReceipts-expiredUnexposedReceipts,expired_unexposed_receipts:expiredUnexposedReceipts,duplicate_session_unit_receipts:duplicateSessionUnitReceipts,receipt_to_exposure_rate:issuedReceipts?exposedReceipts/issuedReceipts:null,unit_to_exposure_rate:issuedUnits?exposedUnits/issuedUnits:null,matured_unit_delivery_rate:maturedUnits?maturedExposedUnits/maturedUnits:null,matured_unit_delivery_interval_95:wilsonInterval(maturedExposedUnits,maturedUnits)} as const;
  });
  const total=(field:keyof typeof variants[number])=>variants.reduce((sum,row)=>sum+(typeof row[field]==="number"?row[field] as number:0),0);
  const issuedReceipts=total("issued_receipts"),issuedUnits=total("issued_units"),exposedReceipts=total("exposed_receipts"),exposedUnits=total("exposed_units"),unexposedReceipts=total("unexposed_receipts"),expiredUnexposedReceipts=total("expired_unexposed_receipts");
  const maturedUnits=total("matured_units"),maturedExposedUnits=total("matured_exposed_units");
  const baseline=variants.find(row=>row.variant==="control")!;
  const deliveryRateComparisons=variants.filter(row=>row.variant!=="control").map(row=>{
    const interval=newcombeRiskDifference(row.matured_exposed_units,row.matured_units,baseline.matured_exposed_units,baseline.matured_units);
    const difference=interval?row.matured_unit_delivery_rate!-baseline.matured_unit_delivery_rate!:null;
    return{variant:row.variant,label:row.label,baseline:"control",absolute_delivery_rate_difference:difference,familywise_interval_95:interval,interval_position:!interval?"unavailable":interval.low>0?"entirely_above_zero":interval.high<0?"entirely_below_zero":"includes_zero"} as const;
  });
  return{profile:"0.28-RD7",window_days:30,receipt_followup_hours:24,issued_receipts:issuedReceipts,issued_units:issuedUnits,exposed_receipts:exposedReceipts,exposed_units:exposedUnits,matured_units:maturedUnits,matured_exposed_units:maturedExposedUnits,pending_maturity_units:issuedUnits-maturedUnits,unexposed_receipts:unexposedReceipts,active_unexposed_receipts:unexposedReceipts-expiredUnexposedReceipts,expired_unexposed_receipts:expiredUnexposedReceipts,duplicate_session_unit_receipts:total("duplicate_session_unit_receipts"),receipt_to_exposure_rate:issuedReceipts?exposedReceipts/issuedReceipts:null,unit_to_exposure_rate:issuedUnits?exposedUnits/issuedUnits:null,matured_unit_delivery_rate:maturedUnits?maturedExposedUnits/maturedUnits:null,matured_unit_delivery_interval_95:wilsonInterval(maturedExposedUnits,maturedUnits),issuance_sample_ratio_mismatch:allocationCheck(variants.map(row=>row.issued_units)),unit_delivery_balance:deliveryBalanceCheck(variants),delivery_rate_comparisons:deliveryRateComparisons,variants,status:issuedReceipts?"descriptive":"insufficient",counts_rejected_requests:false,proves_human_traffic:false,interpretation:"version-level server receipt issuance and accepted exposure diagnostics bound to the returned settled D1 database-clock window, with marginal Wilson 95% rates and Bonferroni-controlled familywise 95% Newcombe–Wilson differences versus control; final delivery diagnostics use only browser units with a closed 24-hour receipt window, do not support version selection, and do not count rejected requests or identify human users"} as const;
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
