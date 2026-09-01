export const ANALYTICS_OPT_OUT_STORAGE_KEY="ea_analytics_opt_out";
export type TrackingExclusionReason="site_opt_out"|"global_privacy_control"|"do_not_track";
export type PrivacyNavigatorLike={globalPrivacyControl?:boolean;doNotTrack?:string|null};
export type PrivacyStorageLike={getItem:(key:string)=>string|null;setItem?:(key:string,value:string)=>void;removeItem?:(key:string)=>void};

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

export function setSiteAnalyticsOptOut(excluded:boolean):boolean{
  try{return persistAnalyticsOptOut(window.localStorage,excluded)}catch{return false}
}

export function currentTrackingExclusionReason():TrackingExclusionReason|null{
  if(typeof navigator==="undefined")return null;
  let storage:PrivacyStorageLike|null=null;
  try{storage=window.localStorage}catch{void 0}
  return trackingExclusionReason(storage,navigator as PrivacyNavigatorLike);
}
