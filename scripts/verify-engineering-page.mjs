// Local production build verification only. No deployment or model calls.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdir,writeFile,copyFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';

const out='artifacts/coding-for-engineers';
await mkdir(out,{recursive:true});
const origin='http://127.0.0.1:4176';
const report={kind:'local_production_build',production_modified:false,model_requests:0,checks:[],browser:[]};
const server=spawn(process.execPath,['dist/standalone/server.js'],{env:{...process.env,PORT:'4176',HOST:'127.0.0.1',VINEXT_TRUSTED_HOSTS:'localhost,127.0.0.1'},stdio:['ignore','pipe','pipe']});
let serverLog='';
for(const stream of [server.stdout,server.stderr])stream.on('data',b=>{serverLog=(serverLog+b.toString()).slice(-20000);});
let chrome;
const assertCheck=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);};
async function waitFor(url){for(let i=0;i<80;i++){try{const r=await fetch(url,{signal:AbortSignal.timeout(2000)});if(r.ok)return r;}catch{/* The local process may still be starting. */}await delay(250);}throw Error('Local service did not become ready: '+url);}
function cdp(url){return new Promise((resolve,reject)=>{
  const ws=new WebSocket(url);let serial=0;const pending=new Map();
  ws.addEventListener('error',()=>reject(Error('Browser debugging socket failed')),{once:true});
  ws.addEventListener('message',e=>{const m=JSON.parse(e.data);if(!m.id)return;const p=pending.get(m.id);if(!p)return;pending.delete(m.id);clearTimeout(p.timer);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);});
  ws.addEventListener('open',()=>resolve({
    call(method,params={}){return new Promise((resolve,reject)=>{const id=++serial;const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP timeout: '+method));},12000);pending.set(id,{resolve,reject,timer});ws.send(JSON.stringify({id,method,params}));});},
    close(){for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error('CDP closed'));}pending.clear();ws.close();}
  }),{once:true});
});}
try{
  await waitFor(origin+'/coding-for-engineers');
  const response=await fetch(origin+'/coding-for-engineers');const html=await response.text();
  assertCheck('native route returns HTTP 200',response.status===200);
  assertCheck('exactly one server-rendered page heading',(html.match(/<h1(?:\s|>)/g)||[]).length===1);
  assertCheck('three benchmark anchors server-render without JavaScript',['programbench','srebench','code-migration'].every(id=>html.includes('id="'+id+'"')));
  assertCheck('three submitted snapshots use native details',(html.match(/<details\b/g)||[]).length===3);
  assertCheck('source warning is present',html.includes('External benchmarks, not HILO results.'));
  assertCheck('source-checked and user-supplied labels both present',html.includes('PUBLISHER SNAPSHOT')&&html.includes('User-submitted snapshot'));
  assertCheck('canonical uses the public path',html.includes('rel="canonical" href="https://getrobotrouter.com/coding-for-engineers"'));
  assertCheck('social metadata present',html.includes('property="og:title"')&&html.includes('name="twitter:card"'));
  assertCheck('no experiment enrollment loading state',!html.includes('Assigning a stable privacy-first site version'));
  const download=await fetch(origin+'/coding-for-engineers/benchmarks.json');
  const catalog=await download.json();assertCheck('download serves the comparison dataset',download.status===200&&catalog.benchmarks.length===3&&catalog.hilo_runs===0);
  const wanted=await (await fetch(origin+'/wanted-10k')).text();
  assertCheck('the new tab is linked from the existing WANTED page',wanted.includes('href="/coding-for-engineers"'));
  const sitemap=await (await fetch(origin+'/sitemap.xml')).text();assertCheck('sitemap exposes the canonical route',sitemap.includes('https://getrobotrouter.com/coding-for-engineers'));
  const assetPaths=[...new Set([...html.matchAll(/(?:src|href)="(\/_next\/static\/[^"<>]+)"/g)].map(m=>m[1]))];
  const assets=[];const css=new Map();
  for(const path of assetPaths){const r=await fetch(origin+path);const type=r.headers.get('content-type')||'';assert.ok(r.ok&&!type.includes('text/html'),'Broken asset '+path);assets.push({path,status:r.status,type});if(type.includes('text/css'))css.set(path,await r.text());}
  report.assets=assets;assertCheck('all HTML-referenced static assets load',assets.length>0);
  let preview=html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<link\b[^>]*>/gi,tag=>{
    const href=tag.match(/href="([^"]+)"/);if(href&&css.has(href[1]))return '<style>'+css.get(href[1])+'</style>';
    if(/rel="(?:modulepreload|preload)"/.test(tag))return '';return tag;
  });
  preview=preview.replace(/href="\/(?!\/)([^"]*)"/g,(_,p)=>'href="'+(p==='coding-for-engineers/benchmarks.json'?'./benchmarks.json':'https://getrobotrouter.com/'+p)+'"');
  preview=preview.replace(/<body([^>]*)>/,'<body$1><div style="background:#233b29;color:white;padding:12px 20px;font:13px Arial">BUILD PREVIEW — not a verified public deployment</div>');
  await writeFile(out+'/preview.html',preview);
  await copyFile('public/coding-for-engineers/benchmarks.json',out+'/benchmarks.json');
  await writeFile(out+'/server-rendered.html',html);

  const binary=process.env.CHROME_BIN;
  assert.ok(binary,'An installed Chrome binary is required for visual verification');
  chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9224','--user-data-dir=/tmp/hilo-engineering-chrome','about:blank'],{stdio:'ignore'});
  await waitFor('http://127.0.0.1:9224/json/version');
  for(const viewport of [{name:'desktop',width:1440,height:1050},{name:'mobile',width:390,height:900}]){
    const target=await (await fetch('http://127.0.0.1:9224/json/new?about:blank',{method:'PUT'})).json();const browser=await cdp(target.webSocketDebuggerUrl);
    try{
      await browser.call('Page.enable');await browser.call('Emulation.setDeviceMetricsOverride',{width:viewport.width,height:viewport.height,deviceScaleFactor:1,mobile:false});
      await browser.call('Emulation.setScriptExecutionDisabled',{value:true});
      await browser.call('Page.navigate',{url:origin+'/coding-for-engineers'});
      let facts;
      for(let i=0;i<50;i++){
        const r=await browser.call('Runtime.evaluate',{expression:"JSON.stringify({ready:document.readyState,title:document.title,h1:document.querySelector('h1')?.textContent,width:document.documentElement.scrollWidth,viewport:innerWidth,articles:document.querySelectorAll('.engBenchmark').length,details:document.querySelectorAll('details').length,nav:!!document.querySelector('a[href=\"/coding-for-engineers\"]'),visibleNavLinks:[...document.querySelectorAll('.navLinks a')].filter(a=>a.getClientRects().length&&getComputedStyle(a).display!=='none').length})",returnByValue:true});
        facts=JSON.parse(r.result.value||'{}');if(facts.ready==='complete'&&facts.articles===3)break;await delay(150);
      }
      assert.ok(facts.h1?.includes('Engineers.')&&facts.articles===3,'SSR view fails without JavaScript');assert.ok(facts.width<=viewport.width,'Document overflow at '+viewport.name);assert.equal(facts.visibleNavLinks,11,'All primary navigation links must remain available');
      await browser.call('Runtime.evaluate',{expression:"document.querySelectorAll('details').forEach(d=>d.open=true)"});
      const r=await browser.call('Runtime.evaluate',{expression:"JSON.stringify({open:document.querySelectorAll('details[open]').length,width:document.documentElement.scrollWidth,submittedRows:[...document.querySelectorAll('.engSubmitted tbody tr')].length})",returnByValue:true});
      const expanded=JSON.parse(r.result.value);assert.equal(expanded.open,3);assert.equal(expanded.submittedRows,15);assert.ok(expanded.width<=viewport.width,'Expanded table overflow');
      await browser.call('Runtime.evaluate',{expression:"document.querySelectorAll('details').forEach(d=>d.open=false)"});
      const shot=await browser.call('Page.captureScreenshot',{format:'png'});await writeFile(out+'/'+viewport.name+'.png',Buffer.from(shot.data,'base64'));
      report.browser.push({...viewport,javascript_disabled:true,facts,expanded});
    }finally{browser.close();await fetch('http://127.0.0.1:9224/json/close/'+target.id);}
  }
  report.status='passed';
}catch(e){report.status='failed';report.error=String(e);throw e;
}finally{
  chrome?.kill('SIGTERM');server.kill('SIGTERM');
  report.checked_at=new Date().toISOString();
  await writeFile(out+'/report.json',JSON.stringify(report,null,2)+'\n');
  await writeFile(out+'/server.log',serverLog);
  console.log(JSON.stringify(report,null,2));
}
