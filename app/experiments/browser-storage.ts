export type BrowserStorageLike={getItem:(key:string)=>string|null;setItem:(key:string,value:string)=>void;removeItem:(key:string)=>void};

const fallbackSessionValues=new Map<string,string>();

function nativeSessionStorage():BrowserStorageLike|null{
  try{return typeof window==="undefined"?null:window.sessionStorage}catch{return null}
}

export const safeSessionStorage:BrowserStorageLike={
  getItem(key){try{const storage=nativeSessionStorage();return storage?storage.getItem(key):fallbackSessionValues.get(key)??null}catch{return fallbackSessionValues.get(key)??null}},
  setItem(key,value){try{const storage=nativeSessionStorage();if(storage){storage.setItem(key,value);fallbackSessionValues.delete(key);return}}catch{fallbackSessionValues.set(key,value);return}fallbackSessionValues.set(key,value)},
  removeItem(key){try{nativeSessionStorage()?.removeItem(key)}catch{fallbackSessionValues.delete(key);return}fallbackSessionValues.delete(key)},
};

export function persistentRandomUnit(storage:BrowserStorageLike|null,key:string,create:()=>string,valid:(value:unknown)=>boolean):string|null{
  if(!storage)return null;
  try{
    let value=storage.getItem(key);
    if(!valid(value)){value=create();if(!valid(value))return null;storage.setItem(key,value)}
    return storage.getItem(key)===value?value:null;
  }catch{return null}
}

export function nativeLocalStorage():BrowserStorageLike|null{
  try{return typeof window==="undefined"?null:window.localStorage}catch{return null}
}
