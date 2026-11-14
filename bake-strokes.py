"""Embed stroke data for every character in data/vocab.js into data/strokes.js (needs internet once)."""
import json, re, urllib.request, urllib.parse
HAN = re.compile(r'[\u3400-\u9fff]')
v = open('data/vocab.js', encoding='utf8').read()
s = open('data/strokes.js', encoding='utf8').read()
a = s.index('window.HZD=') + 11
hzd, end = json.JSONDecoder().raw_decode(s, a)
BASES = ('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/', 'https://unpkg.com/hanzi-writer-data@2.0.1/')
def fetch(ch):
    for b in BASES:
        try:
            with urllib.request.urlopen(b + urllib.parse.quote(ch) + '.json', timeout=15) as r:
                d = json.loads(r.read().decode('utf8')); return {'strokes': d['strokes'], 'medians': d.get('medians', [])}
        except Exception: pass
for c in sorted(set(HAN.findall(v)) - set(hzd)):
    d = fetch(c); print('baked' if d else 'FAILED', c)
    if d: hzd[c] = d
open('data/strokes.js', 'w', encoding='utf8').write(s[:a] + json.dumps(hzd, ensure_ascii=False, separators=(',', ':')) + s[end:])
