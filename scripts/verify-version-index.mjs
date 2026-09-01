import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const index=readFileSync(new URL("../docs/SITE-VERSIONS.md",import.meta.url),"utf8");
const row=/^\|\s*(\d+)\s*\|\s*`((sites|digitalocean)-v(\d{2}))`\s*\|\s*`([0-9a-f]{7})`\s*\|/gm;
const entries=[...index.matchAll(row)].map(match=>({version:Number(match[1]),tag:match[2],family:match[3],tagVersion:Number(match[4]),commit:match[5]}));
const fail=message=>{throw new Error(`Version index integrity failure: ${message}`)};
const git=(...args)=>execFileSync("git",args,{encoding:"utf8"}).trim();
const legacyLightweightTags=new Set(["digitalocean-v09","digitalocean-v10"]);

if(!entries.length)fail("no version rows were found");
const documented=new Set();
const resolvedByTag=new Map();
for(const entry of entries){
  if(entry.version!==entry.tagVersion)fail(`${entry.tag} does not match table version ${entry.version}`);
  if(documented.has(entry.tag))fail(`${entry.tag} is documented more than once`);
  documented.add(entry.tag);
  let resolved;
  try{resolved=git("rev-parse","--verify",`${entry.tag}^{commit}`)}catch{fail(`${entry.tag} does not resolve to a commit`)}
  let objectType;
  try{objectType=git("cat-file","-t",entry.tag)}catch{fail(`${entry.tag} cannot be inspected`)}
  const expectedObjectType=legacyLightweightTags.has(entry.tag)?"commit":"tag";
  if(objectType!==expectedObjectType)fail(`${entry.tag} must remain a ${expectedObjectType} object, not ${objectType}`);
  if(resolved.slice(0,7)!==entry.commit)fail(`${entry.tag} resolves to ${resolved.slice(0,7)}, not ${entry.commit}`);
  resolvedByTag.set(entry.tag,resolved);
}

for(const family of ["sites","digitalocean"]){
  const familyEntries=entries.filter(entry=>entry.family===family).sort((a,b)=>a.version-b.version);
  const versions=familyEntries.map(entry=>entry.version);
  if(!versions.length)fail(`${family} has no documented versions`);
  versions.forEach((version,index)=>{if(version!==index+1)fail(`${family} versions are not contiguous at ${version}`)});
  for(let index=1;index<familyEntries.length;index++){
    const previous=familyEntries[index-1],current=familyEntries[index];
    try{git("merge-base","--is-ancestor",resolvedByTag.get(previous.tag),resolvedByTag.get(current.tag))}
    catch{fail(`${current.tag} does not descend from ${previous.tag}`)}
  }
}

const releaseTags=git("tag","--list").split(/\r?\n/).filter(tag=>/^(sites|digitalocean)-v\d{2}$/.test(tag));
for(const tag of releaseTags)if(!documented.has(tag))fail(`${tag} exists in Git but is missing from the index`);
for(const tag of documented)if(!releaseTags.includes(tag))fail(`${tag} is indexed but missing from the release-tag set`);

console.log(`Verified ${entries.length} contiguous, monotonic release tags against docs/SITE-VERSIONS.md (${entries.length-legacyLightweightTags.size} annotated; ${legacyLightweightTags.size} frozen legacy lightweight).`);
