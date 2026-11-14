#!/bin/sh
# src.html → index.html (도디쌤 그림 넣기 + 버전 표시). 반드시 이 스크립트로 만드세요.
cd "$(dirname "$0")" && python3 -c "
import time,json
v=time.strftime('%Y%m%d-%H%M%S')
s=open('src.html').read();b=open('dodi.b64').read().strip()
s=s.replace('__DODI__','data:image/jpeg;base64,'+b).replace('__BUILD__',v)
open('index.html','w').write(s); json.dump({'v':v},open('version.json','w'))
print('built', v, s.count('data:image/jpeg;base64'),'image line(s)')"
