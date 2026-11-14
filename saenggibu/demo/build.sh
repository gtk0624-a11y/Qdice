#!/bin/sh
# 체험판 빌드: 실제 사이트(src.html)의 맞춤법·바이트 규칙과 칭찬 문구를 그대로 가져와 끼워 넣음
cd "$(dirname "$0")"
python3 - <<'PY'
import base64,re
src=open('../src.html').read().split('\n')
a=next(i for i,l in enumerate(src) if l.startswith('function byteLen('))
b=next(i for i,l in enumerate(src) if l.startswith('// 기재요령 점검'))
core='\n'.join(src[a:b])
praise=next(l for l in src if l.startswith('const PRAISE='))
dodi='data:image/jpeg;base64,'+open('../dodi.b64').read().strip()
ggs='data:image/png;base64,'+base64.b64encode(open('../ggumsong.png','rb').read()).decode()
s=open('src.html').read().replace('/*CORE*/',core).replace('/*PRAISE*/',praise).replace('__DODI__',dodi).replace('__GGS__',ggs)
bad=[w for w in ['localStorage','indexedDB','sessionStorage','document.cookie','fetch(','XMLHttpRequest','script.google','sendBeacon','WebSocket'] if w in s]
assert not bad, bad
open('index.html','w').write(s); print('ok', len(s))
PY
