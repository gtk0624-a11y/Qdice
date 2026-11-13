#!/bin/sh
# src.html → index.html (도디쌤 그림 넣기). 반드시 이 스크립트로 만드세요.
cd "$(dirname "$0")" && python3 -c "
s=open('src.html').read();b=open('dodi.b64').read().strip();open('index.html','w').write(s.replace('__DODI__','data:image/jpeg;base64,'+b))" && echo "built: $(grep -c 'data:image/jpeg;base64' index.html) image line(s)"
