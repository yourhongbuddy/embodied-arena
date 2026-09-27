"""One-time, branch-scoped navigation isolation. No network or production changes."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]

def edit(path, old, new):
    p=ROOT/path; text=p.read_text()
    if text.count(old)!=1: raise ValueError('Expected one pinned replacement: '+path)
    p.write_text(text.replace(old,new))

nav=ROOT/'app/components/SiteNav.tsx'
text=nav.read_text()
assert hashlib.sha256(text.encode()).hexdigest()=='b4641a8ffd424665293b4fbb8933309e964c27efc5bd2253e980a383ce912126'
new=ROOT/'app/components/EngineeringSiteNav.tsx'
assert not new.exists()
new.write_text(text.replace('export function SiteNav()', 'export function EngineeringSiteNav()'))
# Preserve the exact source identity of the counted C8 landing experience.
frozen='''"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  ["/scan","Scan"],["/wanted-10k","WANTED-10K"],["/wanted-10k/realtime","Realtime"],["/leaderboard","Leaderboard"],["/agents","Agents"],["/monitoring","Monitor"],["/watch","Watch"],["/atlas","Atlas"],["/campaigns","Campaigns"],["/analytics","Heartbeat"],
];

export function SiteNav() {
  const pathname = usePathname();
  return <nav className="nav shell" aria-label="Primary navigation">
    <Link className="brand" href="/"><span className="brandMark">EA</span><span>EMBODIED <b>ARENA</b></span></Link>
    <div className="navLinks routeLinks">{links.map(([href,label])=><a className={pathname===href||(href!=="/"&&pathname.startsWith(`${href}/`))?"current":""} href={href} key={href}>{label}</a>)}</div>
    <span className="localPill">PRIVATE BETA</span>
  </nav>;
}
'''
assert hashlib.sha256(frozen.encode()).hexdigest()=='704284f78d19efb894586e735c9299a1a505aa3ea8f0c6c4f86e6bff8dbeb067'
nav.write_text(frozen)
for path,relative in [('app/coding-for-engineers/page.tsx','../components/'),('app/wanted-10k/protocol/page.tsx','../../components/'),('app/wanted-10k/sdk/page.tsx','../../components/'),('app/scan/page.tsx','../components/')]:
    edit(path,'import { SiteNav } from "'+relative+'SiteNav";', 'import { EngineeringSiteNav as SiteNav } from "'+relative+'EngineeringSiteNav";')
edit('tests/coding-for-engineers.test.mjs',"const nav=read('app/components/SiteNav.tsx');", "const nav=read('app/components/EngineeringSiteNav.tsx');")
f=ROOT/'tests/coding-for-engineers.test.mjs'
f.write_text(f.read_text()+'''
// Frozen landing measurements must not silently inherit an engineering navigation change.
test('C8 presentation and experiment logic stay frozen while engineering entry points opt in',async()=>{
  const {createHash}=await import('node:crypto');
  assert.equal(createHash('sha256').update(read('app/components/SiteNav.tsx')).digest('hex'),'704284f78d19efb894586e735c9299a1a505aa3ea8f0c6c4f86e6bff8dbeb067');
  const {EXPERIMENT_PRESENTATION_SOURCES}=await import('../app/experiments/presentation-integrity.ts');
  for(const source of EXPERIMENT_PRESENTATION_SOURCES){assert.equal(createHash('sha256').update(read(source.path).replace(/\\r\\n?/g,'\\n')).digest('hex'),source.sha256,source.path);}
  for(const path of ['app/wanted-10k/protocol/page.tsx','app/wanted-10k/sdk/page.tsx','app/scan/page.tsx'])assert.match(read(path),/EngineeringSiteNav as SiteNav/);
  assert.doesNotMatch(read('app/wanted-10k/page.tsx'),/EngineeringSiteNav/);
});
''')
edit('scripts/verify-engineering-page.mjs', '''  assertCheck('the new tab is linked from the existing WANTED page',wanted.includes('href="/coding-for-engineers"'));''', '''  assertCheck('the counted WANTED landing page retains its frozen navigation',!wanted.includes('href="/coding-for-engineers"'));
  for(const route of ['/wanted-10k/protocol','/wanted-10k/sdk','/scan']){
    const r=await fetch(origin+route);const body=await r.text();
    assertCheck('engineering tab is reachable from '+route,r.ok&&body.includes('href="/coding-for-engineers"'));
  }''')
edit('.github/workflows/hilo-engineering.yml',"      - 'app/components/SiteNav.tsx'", "      - 'app/components/SiteNav.tsx'\n      - 'app/components/EngineeringSiteNav.tsx'\n      - 'app/wanted-10k/protocol/page.tsx'\n      - 'app/wanted-10k/sdk/page.tsx'\n      - 'app/scan/page.tsx'")
edit('.github/workflows/hilo-engineering.yml','run: node --test tests/coding-for-engineers.test.mjs','run: node --experimental-strip-types --test tests/coding-for-engineers.test.mjs')
edit('docs/HILO-CODING-FOR-ENGINEERS.md','Adds a real top-level HILO navigation entry and a server-rendered comparison', 'Adds a Coding for Engineers tab to the protocol, SDK, URDF scanner and engineering navigation, plus a server-rendered comparison')
f=ROOT/'docs/HILO-CODING-FOR-ENGINEERS.md'
f.write_text(f.read_text()+'''

## Frozen landing experiment

The existing C8 landing-page presentation binds the exact shared SiteNav source. Its protection correctly rejected the initial global-navigation edit. Instead of replacing its hash, weakening the test, mutating its cohort, or mixing measurements, the final feature restores the original SiteNav byte-for-byte and leaves all six presentation sources and all experiment contracts unchanged. A separate EngineeringSiteNav is used by the protocol, SDK, scanner and new engineering page. The main `/wanted-10k` navigation remains unchanged in this release; those existing developer destinations lead to the new tab.

A later global-navigation rollout must separately preregister/version its presentation cohort. This PR does not claim that deployment or experiment approval. Tests assert the original source hashes in addition to confirming the actual engineering links on all three entry pages.
''')
print('Applied navigation isolation to the feature branch; no experiment fingerprints changed.')
