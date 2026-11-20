"""단일 파일(index 한 장) 버전과 zip 을 만듭니다. 실행: python3 build.py"""
import re, zipfile, pathlib
r = pathlib.Path(__file__).parent
html = (r / 'index.html').read_text(encoding='utf-8')
css = (r / 'style.css').read_text(encoding='utf-8')
js = '\n'.join((r / f).read_text(encoding='utf-8') for f in ['firebase-config.js', 'js/core.js', 'js/search.js', 'js/sync.js', 'js/app.js', 'js/pages.js', 'js/stickers.js', 'js/cloud.js', 'js/files.js', 'js/mine.js', 'js/extra.js', 'js/drawer.js', 'js/inbox.js', 'js/agent.js', 'js/docs.js', 'js/order.js', 'js/memo.js', 'js/school.js'])
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
html = re.sub(r'<script src="[^"]+"></script>\s*', '', html)
html = re.sub(r'<link rel="(manifest|icon|apple-touch-icon)"[^>]*>\s*', '', html)
html = html.replace('</body>', '<script>' + js.replace('</script>', '<\\/script>') + '</script>\n</body>')
out = r / 'dist'; out.mkdir(exist_ok=True)
(out / 'travail-fatal-single.html').write_text(html, encoding='utf-8')
(out / 'demo.html').write_text(html.replace('<head>', '<head>\n<script>window.TF_DEMO=1</script>', 1).replace('<title>', '<title>[체험판] ', 1), encoding='utf-8')
with zipfile.ZipFile(out / 'travail-fatal.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for p in ['index.html', 'intro.html', 'style.css', 'firebase-config.js', 'manifest.webmanifest', 'sw.js', 'STRUCTURE.md', 'icons/icon-192.png', 'icons/icon-512.png', 'js/core.js', 'js/search.js', 'js/sync.js', 'js/app.js', 'js/pages.js', 'js/stickers.js', 'js/cloud.js', 'js/files.js', 'js/mine.js', 'js/extra.js', 'js/drawer.js', 'js/inbox.js', 'js/agent.js', 'js/docs.js', 'js/order.js', 'js/memo.js', 'js/school.js']:
        z.write(r / p, p)
print('ok')
