export type DeliveryDisposition="accepted"|"retry"|"rejected";
export type QueuedExperimentEvent={id:string;eventType:"experiment_goal";path:"/wanted-10k";metadata:Record<string,unknown>;queuedAt:number};
export const EXPERIMENT_GOAL_OUTBOX_STORAGE_KEY="ea_experiment_goal_outbox";

type StorageLike={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void};
type OutboxOptions={
  storage:StorageLike;
  storageKey:string;
  send:(event:QueuedExperimentEvent)=>Promise<DeliveryDisposition>;
  makeId:()=>string;
  now:()=>number;
  maxEntries:number;
  maxAgeMs:number;
};

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function createExperimentOutbox(options:OutboxOptions){
  const valid=(value:unknown,now:number):value is QueuedExperimentEvent=>{
    if(!value||typeof value!=="object"||Array.isArray(value))return false;
    const event=value as Partial<QueuedExperimentEvent>;
    return typeof event.id==="string"&&uuid.test(event.id)&&event.eventType==="experiment_goal"&&event.path==="/wanted-10k"&&!!event.metadata&&typeof event.metadata==="object"&&!Array.isArray(event.metadata)&&typeof event.queuedAt==="number"&&Number.isFinite(event.queuedAt)&&event.queuedAt<=now+300_000&&event.queuedAt>=now-options.maxAgeMs;
  };
  const write=(events:QueuedExperimentEvent[])=>events.length?options.storage.setItem(options.storageKey,JSON.stringify(events.slice(-options.maxEntries))):options.storage.removeItem(options.storageKey);
  const read=()=>{
    let parsed:unknown;
    try{parsed=JSON.parse(options.storage.getItem(options.storageKey)||"[]")}catch{parsed=[]}
    const events=Array.isArray(parsed)?parsed.filter(value=>valid(value,options.now())).slice(-options.maxEntries):[];
    write(events);return events;
  };
  let flushing:Promise<{accepted:number;rejected:number;pending:number}>|null=null;
  const enqueue=(path:"/wanted-10k",metadata:Record<string,unknown>)=>{
    const event:QueuedExperimentEvent={id:options.makeId(),eventType:"experiment_goal",path,metadata,queuedAt:options.now()};
    const events=read();events.push(event);write(events);return event.id;
  };
  const flush=()=>{
    if(flushing)return flushing;
    flushing=(async()=>{
      let accepted=0,rejected=0;
      while(true){
        const event=read()[0];if(!event)break;
        const disposition=await options.send(event);if(disposition==="retry")break;
        write(read().filter(candidate=>candidate.id!==event.id));
        if(disposition==="accepted")accepted++;else rejected++;
      }
      return{accepted,rejected,pending:read().length};
    })().finally(()=>{flushing=null});
    return flushing;
  };
  return{enqueue,flush,pendingCount:()=>read().length,clear:()=>options.storage.removeItem(options.storageKey)};
}
