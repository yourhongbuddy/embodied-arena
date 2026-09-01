type TimerHandle=ReturnType<typeof setTimeout>;

type DeliveryOptions={
  send:()=>Promise<boolean>;
  isAcknowledged:()=>boolean;
  markAcknowledged:()=>void;
  retryDelaysMs:readonly number[];
  schedule?:(callback:()=>void,delay:number)=>TimerHandle;
  clearSchedule?:(handle:TimerHandle)=>void;
};

export function startAcknowledgedDelivery(options:DeliveryOptions){
  const schedule=options.schedule??((callback,delay)=>setTimeout(callback,delay));
  const clearSchedule=options.clearSchedule??(handle=>clearTimeout(handle));
  let cancelled=false,inFlight=false,retryIndex=0,retryTimer:TimerHandle|undefined;
  const attempt=async()=>{
    if(cancelled||inFlight||options.isAcknowledged())return;
    inFlight=true;const accepted=await options.send();inFlight=false;
    if(cancelled)return;
    if(accepted){options.markAcknowledged();return}
    const delay=options.retryDelaysMs[retryIndex++];
    if(delay!==undefined)retryTimer=schedule(()=>{retryTimer=undefined;void attempt()},delay);
  };
  const retryNow=()=>{
    if(cancelled||options.isAcknowledged())return;
    if(retryTimer!==undefined)clearSchedule(retryTimer);retryTimer=undefined;retryIndex=0;
    if(!inFlight)void attempt();
  };
  const cancel=()=>{cancelled=true;if(retryTimer!==undefined)clearSchedule(retryTimer)};
  void attempt();
  return{retryNow,cancel};
}
