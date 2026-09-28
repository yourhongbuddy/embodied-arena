"""Build an evidence-only IROS directory; never sends, enrolls, trains or scores.
Input is public program HTML and reviewed seed metadata. No remote code executes.
"""
from __future__ import annotations
import argparse,csv,hashlib,json,re,unicodedata
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
DIR=ROOT/'data/conferences/iros-2026'
MIRROR='https://gisbi-kim.github.io/iros2026-explorer/output/iros2026_explorer.html'
EXPECTED_PAPERS=1933
SOURCE_SHA256='fd4332aa9f4d4ba44173ba198809fc997c491d619148958660889f9c9da7a573'

class ProgramParser(HTMLParser):
    def __init__(self):super().__init__();self.inside=False;self.parts=[];self.matches=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if tag=='script' and a.get('id')=='papers-data' and a.get('type')=='application/json':self.inside=True;self.matches+=1
    def handle_endtag(self,tag):
        if tag=='script':self.inside=False
    def handle_data(self,text):
        if self.inside:self.parts.append(text)

def scalar(value:Any,limit:int=500)->str:
    if not isinstance(value,str):raise ValueError('Text required')
    value=re.sub(r'\s+',' ',unicodedata.normalize('NFC',value)).strip()
    if not value or len(value)>limit or '@' in value or '[email-' in value or re.search(r'[<>\x00-\x08]',value):raise ValueError('Invalid public metadata')
    return value

def safe_affiliation(value:Any)->str:
    if isinstance(value,str) and ('@' in value or '[email-' in value):return 'Unknown affiliation (contact detail omitted)'
    return scalar(value,1500)

def parse_program(text:str)->list[dict[str,Any]]:
    p=ProgramParser();p.feed(text)
    if p.matches!=1:raise ValueError('One explicit papers-data JSON block required')
    data=json.loads(''.join(p.parts))
    if not isinstance(data,list) or len(data)!=EXPECTED_PAPERS:raise ValueError('Program count changed; review snapshot')
    seen=set()
    for paper in data:
        pn=paper.get('paper_number')
        if not isinstance(pn,str) or not pn.isdigit() or pn in seen:raise ValueError('Invalid or duplicate paper number')
        seen.add(pn)
        if not isinstance(paper.get('authors'),list) or not paper['authors']:raise ValueError('Missing authors')
        scalar(paper.get('title',''),500)
        for a in paper['authors']:scalar(a.get('name',''),200);safe_affiliation(a.get('aff',''))
        for keyword in paper.get('keywords',[]):scalar(keyword,200)
    return data

def expand_seed(seed:dict)->dict:
    seed=dict(seed)
    if 'people_groups' in seed:
        seed['people_assertions']=[{'name':r[0],'affiliation':r[1],'role':g['role'],'source_id':g['source_id'],'detail':r[2] if len(r)>2 else None} for g in seed.pop('people_groups') for r in g['rows']]
    return seed

def key(value:str)->str:return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',value)).strip().casefold()
def name_key(value:str)->str:
    if value.count(',')==1:
        family,given=value.split(',');value=given.strip()+' '+family.strip()
    return key(value)
def ident(prefix:str,parts:list[str])->str:return prefix+'-'+hashlib.sha256(json.dumps(parts,ensure_ascii=False,separators=(',',':')).encode()).hexdigest()[:20]
def csv_cell(x:Any)->str:
    if isinstance(x,list):x=' | '.join(str(t) for t in x)
    x=str(x) if x is not None else ''
    return "'"+x if x.lstrip().startswith(('=','+','-','@')) else x

def write_csv(path:Path,rows:list[dict],columns:list[str])->None:
    with path.open('w',newline='',encoding='utf-8-sig') as f:
        w=csv.DictWriter(f,fieldnames=columns);w.writeheader();w.writerows({k:csv_cell(row.get(k)) for k in columns} for row in rows)

def build(papers:list[dict],seed:dict)->dict:
    seed=expand_seed(seed)
    if seed.get('event_id')!='iros-2026':raise ValueError('Wrong conference')
    sources={s['id']:s for s in seed['sources']}
    if len(sources)!=len(seed['sources']):raise ValueError('Duplicate source ID')
    for s in sources.values():
        u=urlsplit(s['url'])
        if u.scheme!='https' or not u.hostname or u.username or u.password:raise ValueError('Unsafe source URL')
    people={};orgs={};affiliations=defaultdict(set);paper_rows=[];appearances=0
    def check_source(sid):
        if sid not in sources or sources[sid]['status'] in ('robots_disallowed','unavailable'):raise ValueError('Unavailable or unknown source')
    def person(name,aff,role,sid,pn=None,detail=None):
        name=scalar(name,200);aff=scalar(aff,1500);check_source(sid)
        nk,ak=name_key(name),key(aff);pid=ident('person',[nk,ak])
        if pid not in people:
            people[pid]={'id':pid,'name':name,'name_variants':set(),'affiliation_as_published':aff,'roles':set(),'source_ids':set(),'paper_numbers':set(),'notes':set(),'record_type':'public_name_affiliation_record','identity_verified':False,'attendance_verified':False,'hilo_member':False,'outreach_authorized':False,'evidence_use':'conference_discovery_only','_name_key':nk}
        p=people[pid];p['name_variants'].add(name);p['roles'].add(role);p['source_ids'].add(sid)
        if pn:p['paper_numbers'].add(pn)
        if detail:p['notes'].add(detail)
        affiliations[aff].add(pid)
    for p in papers:
        pn=p['paper_number'];authors=p['authors'];appearances+=len(authors)
        for a in authors:person(a['name'],safe_affiliation(a['aff']),'paper_author','paper-explorer',pn)
        paper_rows.append({'paper_number':pn,'title':scalar(p['title'],500),'author_count':len(authors),'keywords':p.get('keywords',[]),'source_id':'paper-explorer'})
    for a in seed['people_assertions']:person(a['name'],a['affiliation'],a['role'],a['source_id'],detail=a.get('detail'))
    namegroups=defaultdict(list)
    for p in people.values():namegroups[p['_name_key']].append(p['id'])
    for p in people.values():
        group=namegroups[p['_name_key']];p['same_name_record_count']=len(group);p['identity_review_required']=len(group)>1 or 'unknown' in key(p['affiliation_as_published'])
        p['paper_count']=len(p['paper_numbers']);p.pop('_name_key')
        for k in ['name_variants','roles','source_ids','paper_numbers','notes']:p[k]=sorted(p[k])
        p['source_urls']=[sources[s]['url'] for s in p['source_ids']];p['verification_levels']=sorted({sources[s]['source_type'] for s in p['source_ids']})
    for a in seed['organization_assertions']:
        n=scalar(a['name'],150);sid=a['source_id'];check_source(sid);oid=ident('org',[key(n)])
        if oid not in orgs:orgs[oid]={'id':oid,'name':n,'roles':set(),'booths':set(),'source_ids':set(),'assertions':[],'hilo_member':False,'outreach_authorized':False,'attendance_verified':False,'evidence_use':'conference_discovery_only'}
        o=orgs[oid];o['roles'].add(a['role']);o['source_ids'].add(sid)
        if a.get('booth'):
            if not re.fullmatch(r'[0-9]{1,4}',a['booth']):raise ValueError('Invalid booth')
            o['booths'].add(a['booth'])
        o['assertions'].append({k:v for k,v in a.items() if k!='name'})
    for o in orgs.values():
        for k in ['roles','booths','source_ids']:o[k]=sorted(o[k])
        o['source_urls']=[sources[s]['url'] for s in o['source_ids']];o['verification_levels']=sorted({sources[s]['source_type'] for s in o['source_ids']})
        o['primary_evidence_present']=any(not x.startswith(('secondary','community')) for x in o['verification_levels'])
    people=sorted(people.values(),key=lambda x:(name_key(x['name']),key(x['affiliation_as_published'])));orgs=sorted(orgs.values(),key=lambda x:key(x['name']))
    affiliation_rows=[{'affiliation_as_published':a,'public_person_record_count':len(ids),'record_type':'affiliation_label_not_verified_organization','person_ids':sorted(ids)} for a,ids in sorted(affiliations.items())]
    coverage={'event_id':'iros-2026','retrieval_date':seed['cutoff_date'],'coverage':'partial','papers':len(papers),'author_paper_appearances':appearances,'exact_program_author_name_strings':len({a['name'] for p in papers for a in p['authors']}),'public_person_records':len(people),'supplemental_role_assertions':len(seed['people_assertions']),'distinct_normalized_names':len(namegroups),'ambiguous_name_groups':sum(len(g)>1 for g in namegroups.values()),'organization_records':len(orgs),'organizations_with_booth':sum(bool(o['booths']) for o in orgs),'primary_supported_organizations':sum(o['primary_evidence_present'] for o in orgs),'affiliation_labels':len(affiliation_rows),'source_count':len(sources),'coverage_gaps':seed['coverage_gaps'],'unique_human_count':None,'messages_sent':0,'members_enrolled':0,'real_robot_hours':0,'private_contact_info_collected':False,'official_exhibitor_coverage_complete':False,'deduplication':'NFKC/case/whitespace normalization; explicitly comma-formatted names reordered for matching. Same name across different affiliation labels not merged. No fuzzy personal identity resolution.','cross_system_deduplication':'New event registry only. Existing private Gmail/CRM identities were not read or modified. Existing GrowthOps site/venue records were not converted into people.'}
    return {'coverage':coverage,'sources':list(sources.values()),'people':people,'organizations':orgs,'papers':paper_rows,'affiliations':affiliation_rows}

def save(data:dict,out:Path,viewer:Path|None=None):
    out.mkdir(parents=True,exist_ok=True)
    for name in ['people','organizations','papers','affiliations']:(out/(name+'.jsonl')).write_text(''.join(json.dumps(x,ensure_ascii=False,separators=(',',':'))+'\n' for x in data[name]),encoding='utf-8')
    for name in ['coverage','sources']:(out/(name+'.json')).write_text(json.dumps(data[name],ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    write_csv(out/'people.csv',data['people'],['id','name','affiliation_as_published','roles','paper_count','paper_numbers','same_name_record_count','identity_review_required','source_urls','verification_levels','hilo_member','outreach_authorized','attendance_verified'])
    write_csv(out/'organizations.csv',data['organizations'],['id','name','roles','booths','primary_evidence_present','source_urls','verification_levels','hilo_member','outreach_authorized'])
    write_csv(out/'affiliations.csv',data['affiliations'],['affiliation_as_published','public_person_record_count','record_type'])
    if viewer:
        tmpl=(ROOT/'tools/hilo_iros_viewer.html').read_text(encoding='utf-8')
        mini={'coverage':data['coverage'],'people':[{k:p[k] for k in ['name','affiliation_as_published','roles','paper_count','source_urls','verification_levels','identity_review_required']} for p in data['people']],'organizations':data['organizations']}
        payload=json.dumps(mini,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
        viewer.parent.mkdir(parents=True,exist_ok=True);viewer.write_text(tmpl.replace('__DIRECTORY_JSON__',payload),encoding='utf-8')
    files={p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(out.glob('*')) if p.suffix in ('.csv','.jsonl','.json') and p.name!='checksums.json'}
    (out/'checksums.json').write_text(json.dumps(files,indent=2)+'\n')

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--seed',type=Path,default=DIR/'seed.json');p.add_argument('--out',type=Path,default=DIR);p.add_argument('--verify-raw-hash',action='store_true');p.add_argument('--viewer',type=Path,default=ROOT/'public/hilo/iros-2026/index.html');a=p.parse_args();raw=a.source.read_bytes()
    if a.verify_raw_hash and hashlib.sha256(raw).hexdigest()!=SOURCE_SHA256:raise SystemExit('Source changed; review and pin a new snapshot rather than importing silently.')
    data=build(parse_program(raw.decode('utf-8')),json.loads(a.seed.read_text()));save(data,a.out,a.viewer);print(json.dumps(data['coverage'],indent=2))
if __name__=='__main__':main()
