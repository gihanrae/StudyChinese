"""Bake stroke data into index.html so it never needs the internet.
Run in this folder:  python bake-strokes.py
(Needs internet once. Add chars to bake extra ones:  python bake-strokes.py 书 本)"""
import json, re, sys, urllib.request, urllib.parse
F = 'index.html'
HAN = re.compile(r'[\u3400-\u9fff]')

def fetch(ch):
    for base in ('https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/', 'https://fastly.jsdelivr.net/npm/hanzi-writer-data@2.0.1/', 'https://unpkg.com/hanzi-writer-data@2.0.1/'):
        try:
            with urllib.request.urlopen(base + urllib.parse.quote(ch) + '.json', timeout=15) as r:
                return json.loads(r.read().decode('utf8'))
        except Exception:
            pass
    return None

def main(fetch=fetch, path=F, extra=()):
    s = open(path, encoding='utf8').read()
    a = s.index('var HZD=') + len('var HZD=')
    hzd, end = json.JSONDecoder().raw_decode(s, a)
    vocab = s[s.index('<script id="vocab"'):s.index('</script>', s.index('<script id="vocab"'))]
    want = sorted(set(HAN.findall(vocab)) | set(c for c in extra if HAN.match(c)))
    miss = [c for c in want if c not in hzd]
    if not miss:
        print('Nothing to bake - all characters already embedded.'); return
    got = 0
    for c in miss:
        d = fetch(c)
        if d and 'strokes' in d:
            hzd[c] = {'strokes': d['strokes'], 'medians': d.get('medians', [])}; got += 1; print('baked', c)
        else:
            print('FAILED', c, '(check your internet)')
    if got:
        s = s[:a] + json.dumps(hzd, ensure_ascii=False, separators=(',', ':')) + s[end:]
        open(path, 'w', encoding='utf8').write(s)
    print(f'Done: {got}/{len(miss)} baked.')

if __name__ == '__main__':
    main(extra=sys.argv[1:])
