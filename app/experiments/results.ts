import { WANTED_LANDING_EXPERIMENT } from "./rotator.ts";

export type RawExperimentRow={variant:string;exposed_sessions:number;goal_sessions:number};

export function wilsonInterval(successes:number,total:number,z=1.959963984540054){
  if(!Number.isInteger(successes)||!Number.isInteger(total)||successes<0||total<1||successes>total)return null;
  const rate=successes/total,z2=z*z,denominator=1+z2/total;
  const center=(rate+z2/(2*total))/denominator;
  const margin=z*Math.sqrt((rate*(1-rate)+z2/(4*total))/total)/denominator;
  return{low:Math.max(0,center-margin),high:Math.min(1,center+margin)};
}

export function summarizeExperiment(rawRows:RawExperimentRow[]){
  const found=new Map(rawRows.map(row=>[row.variant,row]));
  const variants=WANTED_LANDING_EXPERIMENT.variants.map(variant=>{
    const row=found.get(variant.id),exposed=Number(row?.exposed_sessions||0),goals=Number(row?.goal_sessions||0);
    const interval=wilsonInterval(goals,exposed);
    return{variant:variant.id,label:variant.label,weight_basis_points:variant.weight_basis_points,exposed_sessions:exposed,goal_sessions:goals,conversion_rate:exposed?goals/exposed:null,conversion_interval_95:interval};
  });
  const total=variants.reduce((sum,row)=>sum+row.exposed_sessions,0);
  const expected=variants.map(row=>total*row.weight_basis_points/10_000);
  const minimumExpected=Math.min(...expected);
  const chiSquare=total?variants.reduce((sum,row,index)=>sum+(row.exposed_sessions-expected[index])**2/expected[index],0):0;
  const pValue=minimumExpected>=5?Math.exp(-chiSquare/2):null;
  return{variants,total_exposed_sessions:total,sample_ratio_mismatch:{method:"pearson_chi_square_df_2",alert_threshold:0.001,status:pValue===null?"insufficient":pValue<0.001?"alert":"pass",chi_square:pValue===null?null:chiSquare,p_value:pValue}};
}
