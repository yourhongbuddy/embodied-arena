export const ANALYTICS_OPT_OUT_STORAGE_KEY="ea_analytics_opt_out";
export type TrackingExclusionReason="site_opt_out"|"global_privacy_control"|"do_not_track";
export type PrivacyNavigatorLike={globalPrivacyControl?:boolean;doNotTrack?:string|null};
export type PrivacyStorageLike={getItem:(key:string)=>string|null;setItem?:(key:string,value:string)=>void;removeItem?:(key:string)=>void};
export type EnumerablePrivacyStorageLike=PrivacyStorageLike&{length:number;key:(index:number)=>string|null};

export const LOCAL_ANALYTICS_STATE_PREFIXES=["ea_experiment_unit:","ea_exposure:"] as const;
export const SESSION_ANALYTICS_STATE_KEYS=["ea_session","ea_experiment_operator","ea_experiment_goal_outbox"] as const;
export const SESSION_ANALYTICS_STATE_PREFIXES=["ea_assignment:","ea_exposure:"] as const;

export function trackingExclusionReason(storage:PrivacyStorageLike|null,navigatorLike:PrivacyNavigatorLike|null):TrackingExclusionReason|null{
  try{if(storage?.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY)==="1")return"site_opt_out"}catch{void 0}
  if(navigatorLike?.globalPrivacyControl===true)return"global_privacy_control";
  if(navigatorLike?.doNotTrack==="1"||navigatorLike?.doNotTrack?.toLowerCase()==="yes")return"do_not_track";
  return null;
}

export function persistAnalyticsOptOut(storage:PrivacyStorageLike|null,excluded:boolean):boolean{
  if(!storage)return false;
  try{
    if(excluded){storage.setItem?.(ANALYTICS_OPT_OUT_STORAGE_KEY,"1");return storage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY)==="1"}
    storage.removeItem?.(ANALYTICS_OPT_OUT_STORAGE_KEY);return storage.getItem(ANALYTICS_OPT_OUT_STORAGE_KEY)!=="1";
  }catch{return false}
}

function purgeMatching(storage:EnumerablePrivacyStorageLike|null,exact:readonly string[],prefixes:readonly string[]):number{
  if(!storage)return 0;
  let removed=0;
  try{for(let index=storage.length-1;index>=0;index--){const key=storage.key(index);if(key&&(exact.includes(key)||prefixes.some(prefix=>key.startsWith(prefix)))){storage.removeItem?.(key);removed++}}}catch{return removed}
  return removed;
}

export function purgeLocalAnalyticsState(local:EnumerablePrivacyStorageLike|null,session:EnumerablePrivacyStorageLike|null){
  return{
    local_removed:purgeMatching(local,[],LOCAL_ANALYTICS_STATE_PREFIXES),
    session_removed:purgeMatching(session,SESSION_ANALYTICS_STATE_KEYS,SESSION_ANALYTICS_STATE_PREFIXES),
  };
}

export function setSiteAnalyticsOptOut(excluded:boolean):boolean{
  try{
    const persisted=persistAnalyticsOptOut(window.localStorage,excluded);
    if(persisted&&excluded){let session:Storage|null=null;try{session=window.sessionStorage}catch{void 0}purgeLocalAnalyticsState(window.localStorage,session)}
    return persisted;
  }catch{return false}
}

export function currentTrackingExclusionReason():TrackingExclusionReason|null{
  if(typeof navigator==="undefined")return null;
  let storage:PrivacyStorageLike|null=null;
  try{storage=window.localStorage}catch{void 0}
  return trackingExclusionReason(storage,navigator as PrivacyNavigatorLike);
}
