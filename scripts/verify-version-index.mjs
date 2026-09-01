import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const index=readFileSync(new URL("../docs/SITE-VERSIONS.md",import.meta.url),"utf8");
const row=/^\|\s*(\d+)\s*\|\s*`((sites|digitalocean)-v(\d{2}))`\s*\|\s*`([0-9a-f]{7})`\s*\|/gm;
const entries=[...index.matchAll(row)].map(match=>({version:Number(match[1]),tag:match[2],family:match[3],tagVersion:Number(match[4]),commit:match[5]}));
const fail=message=>{throw new Error(`Version index integrity failure: ${message}`)};
const git=(...args)=>execFileSync("git",args,{encoding:"utf8"}).trim();

if(!entries.length)fail("no version rows were found");
const documented=new Set();
for(const entry of entries){
  if(entry.version!==entry.tagVersion)fail(`${entry.tag} does not match table version ${entry.version}`);
  if(documented.has(entry.tag))fail(`${entry.tag} is documented more than once`);
  documented.add(entry.tag);
  let resolved;
  try{resolved=git("rev-parse","--verify",`${entry.tag}^{commit}`)}catch{fail(`${entry.tag} does not resolve to a commit`)}
  if(resolved.slice(0,7)!==entry.commit)fail(`${entry.tag} resolves to ${resolved.slice(0,7)}, not ${entry.commit}`);
}

for(const family of ["sites","digitalocean"]){
  const versions=entries.filter(entry=>entry.family===family).map(entry=>entry.version).sort((a,b)=>a-b);
  if(!versions.length)fail(`${family} has no documented versions`);
  versions.forEach((version,index)=>{if(version!==index+1)fail(`${family} versions are not contiguous at ${version}`)});
}

const releaseTags=git("tag","--list").split(/\r?\n/).filter(tag=>/^(sites|digitalocean)-v\d{2}$/.test(tag));
for(const tag of releaseTags)if(!documented.has(tag))fail(`${tag} exists in Git but is missing from the index`);
for(const tag of documented)if(!releaseTags.includes(tag))fail(`${tag} is indexed but missing from the release-tag set`);

console.log(`Verified ${entries.length} immutable release tags against docs/SITE-VERSIONS.md.`);
