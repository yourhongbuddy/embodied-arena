"""Public conference metadata only. No access if either general or OpenAI crawler rules deny it."""
import datetime,hashlib,html,json,pathlib,re,time,urllib.request,urllib.parse,urllib.robotparser
OUT=pathlib.Path('artifacts/iros-primary');OUT.mkdir(parents=True,exist_ok=True)
ROOT='https://2026.ieee-iros.org'
report={'retrieved_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'sources':[]}
try:
    with urllib.request.urlopen(ROOT+'/robots.txt',timeout=20) as r: policy=r.read(200000).decode('utf-8','replace')
    (OUT/'robots.txt').write_text(policy)
    rp=urllib.robotparser.RobotFileParser();rp.parse(policy.splitlines())
    pending=[ROOT+'/',ROOT+'/program/paper_index/'];seen=set()
    while pending and len(seen)<24:
        url=pending.pop(0)
        if url in seen:continue
        seen.add(url)
        checks={a:rp.can_fetch(a,url) for a in ['*','GPTBot','ChatGPT-User','HILO-Conference-Directory/0.1']}
        item={'url':url,'crawl_permission':checks}
        if not all(checks.values()):
            item['status']='robots_disallowed';report['sources'].append(item);continue
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'HILO-Conference-Directory/0.1','Accept-Encoding':'identity'}),timeout=20) as r:
                raw=r.read(16000001)
                if len(raw)>16000000:raise ValueError('size_limit')
                text=raw.decode('utf-8','replace')
                file='page-'+hashlib.sha256(url.encode()).hexdigest()[:12]+'.html'
                item.update(status=r.status,file=file,sha256=hashlib.sha256(raw).hexdigest(),retrieved_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
                text=re.sub(r'[\w.!#$%&\'*+/=?^_`{|}~-]+@[\w.-]+\.[A-Za-z]{2,}','[email-redacted]',text)
                (OUT/file).write_text(text,encoding='utf-8')
                if url==ROOT+'/':
                    for href in re.findall(r'href=[\"\']([^\"\']+)',text):
                        dest=urllib.parse.urljoin(url,html.unescape(href));parts=urllib.parse.urlsplit(dest)
                        if parts.netloc=='2026.ieee-iros.org' and not parts.query and re.search('exhibit|sponsor|committee|organizi|keynote|plenary|workshop',parts.path,re.I):
                            pending.append(urllib.parse.urlunsplit((parts.scheme,parts.netloc,parts.path,'','')))
            time.sleep(1)
        except Exception as e:item.update(status='unavailable',error_type=type(e).__name__)
        report['sources'].append(item)
except Exception as e:report.update(status='policy_unavailable_no_collection',error_type=type(e).__name__)
(OUT/'report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
