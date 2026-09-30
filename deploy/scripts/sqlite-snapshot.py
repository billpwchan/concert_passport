#!/usr/bin/env python3
"""Consistent online SQLite backup + private-data fingerprints; emits no row values."""
import argparse, hashlib, json, os, pathlib, sqlite3
p=argparse.ArgumentParser()
p.add_argument('database'); p.add_argument('--backup'); p.add_argument('--baseline')
a=p.parse_args()
source=pathlib.Path(a.database).resolve()
db=sqlite3.connect(source.as_uri()+'?mode=ro',uri=True)
if a.backup:
    target=pathlib.Path(a.backup)
    target.parent.mkdir(parents=True,exist_ok=True)
    fd=os.open(target,os.O_CREAT|os.O_EXCL|os.O_WRONLY,0o600); os.close(fd)
    out=sqlite3.connect(target); db.backup(out); db.close(); db=out
baseline=json.load(open(a.baseline)) if a.baseline else None
report={'integrity':db.execute('PRAGMA integrity_check').fetchone()[0], 'foreignKeyErrors':len(db.execute('PRAGMA foreign_key_check').fetchall()),'tables':{}}
for table in ['profiles','accounts','auth_sessions','saved_events','artist_follows','attendance_records','plan_milestone_states']:
    columns=[r[1] for r in db.execute('PRAGMA table_info("'+table+'")')]
    if baseline: columns=baseline['tables'][table]['columns']
    if not columns: continue
    sql='SELECT '+','.join('"'+c+'"' for c in columns)+' FROM "'+table+'"'
    rows=sorted(json.dumps(list(row),ensure_ascii=False,separators=(',',':')) for row in db.execute(sql))
    report['tables'][table]={'columns':columns,'count':len(rows),'sha256':hashlib.sha256('\n'.join(rows).encode()).hexdigest()}
if baseline: report['userDataUnchanged']=report['tables']==baseline['tables']
print(json.dumps(report,indent=2))
if report['integrity']!='ok' or report['foreignKeyErrors'] or (baseline and not report['userDataUnchanged']): raise SystemExit(1)
