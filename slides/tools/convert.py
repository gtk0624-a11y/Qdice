#!/usr/bin/env python3
"""PPTX(pptxgenjs 형식) -> 슬라이드 엔진 deck.json + media/ 변환기.
사용: python3 -I convert.py 입력.pptx 출력폴더 덱ID "제목"
좌표는 960x540(pt) 설계 공간. 글자 크기(pt)는 그대로 저장.
"""
import sys, os, json, re, zipfile, shutil
from lxml import etree
from PIL import Image

NS = {'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
EMU_PT = 12700.0


def q(tag):
    pre, name = tag.split(':')
    return '{%s}%s' % (NS[pre], name)


def r1(v):
    return round(v, 1)


def parse_fill(sppr):
    sf = sppr.find(q('a:solidFill'))
    if sf is None:
        return None, None
    c = sf.find(q('a:srgbClr'))
    if c is None:
        return None, None
    al = c.find(q('a:alpha'))
    return c.get('val'), (int(al.get('val')) / 100000.0 if al is not None else None)


def parse_ln(sppr):
    ln = sppr.find(q('a:ln'))
    if ln is None:
        return None
    sf = ln.find(q('a:solidFill'))
    if sf is None:
        return None
    c = sf.find(q('a:srgbClr'))
    if c is None:
        return None
    w = int(ln.get('w', '12700')) / EMU_PT
    d = ln.find(q('a:prstDash'))
    return {'c': c.get('val'), 'w': r1(w), 'dash': d.get('val') if d is not None else None}


def parse_shadow(sppr):
    ef = sppr.find(q('a:effectLst'))
    if ef is None:
        return None
    sh = ef.find(q('a:outerShdw'))
    if sh is None:
        return None
    c = sh.find(q('a:srgbClr'))
    al = c.find(q('a:alpha')) if c is not None else None
    return {'c': c.get('val') if c is not None else '000000',
            'a': (int(al.get('val')) / 100000.0 if al is not None else 0.2),
            'blur': r1(int(sh.get('blurRad', '0')) / EMU_PT),
            'dist': r1(int(sh.get('dist', '0')) / EMU_PT)}


def parse_text(sp):
    tb = sp.find(q('p:txBody'))
    if tb is None:
        return None
    bp = tb.find(q('a:bodyPr'))
    anchor = bp.get('anchor', 't') if bp is not None else 't'
    ins = [0, 0, 0, 0]
    if bp is not None:
        ins = [r1(int(bp.get(k, '0')) / EMU_PT) for k in ('lIns', 'tIns', 'rIns', 'bIns')]
    paras = []
    for p in tb.findall(q('a:p')):
        ppr = p.find(q('a:pPr'))
        para = {'algn': 'l', 'lh': None, 'aft': 0, 'bullet': False, 'marL': 0, 'indent': 0, 'runs': []}
        if ppr is not None:
            para['algn'] = {'ctr': 'c', 'r': 'r', 'l': 'l', 'just': 'l'}.get(ppr.get('algn', 'l'), 'l')
            para['marL'] = r1(int(ppr.get('marL', '0')) / EMU_PT)
            para['indent'] = r1(int(ppr.get('indent', '0')) / EMU_PT)
            ls = ppr.find(q('a:lnSpc'))
            if ls is not None and ls.find(q('a:spcPct')) is not None:
                para['lh'] = int(ls.find(q('a:spcPct')).get('val')) / 100000.0
            sa = ppr.find(q('a:spcAft'))
            if sa is not None and sa.find(q('a:spcPts')) is not None:
                para['aft'] = int(sa.find(q('a:spcPts')).get('val')) / 100.0
            para['bullet'] = ppr.find(q('a:buChar')) is not None
        for r in p.findall(q('a:r')):
            t = r.find(q('a:t'))
            rp = r.find(q('a:rPr'))
            run = {'t': t.text or ''}
            if rp is not None:
                if rp.get('sz'):
                    run['sz'] = int(rp.get('sz')) / 100.0
                if rp.get('b') == '1':
                    run['b'] = 1
                if rp.get('i') == '1':
                    run['i'] = 1
                sf = rp.find(q('a:solidFill'))
                if sf is not None and sf.find(q('a:srgbClr')) is not None:
                    run['c'] = sf.find(q('a:srgbClr')).get('val')
            para['runs'].append(run)
        # <a:br/> 은 줄바꿈 run 으로
        if p.find(q('a:br')) is not None and not para['runs']:
            para['runs'].append({'t': ''})
        if p.find(q('a:fld')) is not None and not para['runs']:
            continue  # 슬라이드 번호 자리표시자는 버림
        paras.append(para)
    if not any(r['t'].strip() for pa in paras for r in pa['runs']):
        return None
    return {'anchor': {'ctr': 'm', 'b': 'b', 't': 't'}.get(anchor, 't'), 'ins': ins, 'paras': paras}


def convert(src, out, deck_id, title):
    work = out + '/_x'
    if os.path.exists(work):
        shutil.rmtree(work)
    with zipfile.ZipFile(src) as z:
        z.extractall(work)
    media_out = out + '/media'
    os.makedirs(media_out, exist_ok=True)

    pres = etree.parse(work + '/ppt/presentation.xml')
    sldIds = pres.findall('.//' + q('p:sldId'))
    prels = etree.parse(work + '/ppt/_rels/presentation.xml.rels')
    rid2target = {r.get('Id'): r.get('Target') for r in prels.getroot()}
    order = [rid2target[s.get(q('r:id'))] for s in sldIds]

    # 레이아웃 배경색
    def layout_bg(slide_rels):
        for r in slide_rels.getroot():
            if r.get('Type', '').endswith('/slideLayout'):
                lp = os.path.normpath(os.path.join(work, 'ppt/slides', r.get('Target')))
                lx = etree.parse(lp)
                c = lx.find('.//' + q('p:bg') + '//' + q('a:srgbClr'))
                return c.get('val') if c is not None else 'FFFFFF'
        return 'FFFFFF'

    scenes = []
    media_cache = {}
    total_img = 0
    for si, target in enumerate(order, 1):
        sp_path = os.path.join(work, 'ppt', target)
        sx = etree.parse(sp_path)
        rels = etree.parse(os.path.join(work, 'ppt/slides/_rels', os.path.basename(target) + '.rels'))
        relmap = {r.get('Id'): r.get('Target') for r in rels.getroot()}
        bg = layout_bg(rels)
        tree = sx.find('.//' + q('p:spTree'))
        els = []
        eid = 0
        for node in tree:
            tag = etree.QName(node).localname
            if tag not in ('sp', 'pic'):
                continue
            cnv = node.find('.//' + q('p:cNvPr'))
            name = cnv.get('name', '')
            sppr = node.find(q('p:spPr'))
            xf = sppr.find(q('a:xfrm')) if sppr is not None else None
            if xf is None:
                continue
            off, ext = xf.find(q('a:off')), xf.find(q('a:ext'))
            x, y = int(off.get('x')) / EMU_PT, int(off.get('y')) / EMU_PT
            w, h = int(ext.get('cx')) / EMU_PT, int(ext.get('cy')) / EMU_PT
            if node.find('.//' + q('p:ph')) is not None:
                continue  # 슬라이드 번호 등 자리표시자 제외
            eid += 1
            el = {'id': 'e%d' % eid, 'x': r1(x), 'y': r1(y), 'w': r1(w), 'h': r1(h)}
            m = re.match(r'ANS_(\d+)', name)
            if m:
                el['reveal'] = int(m.group(1))
            if tag == 'pic':
                rid = node.find('.//' + q('a:blip')).get(q('r:embed'))
                mp = os.path.normpath(os.path.join(work, 'ppt/slides', relmap[rid]))
                if mp not in media_cache:
                    base = os.path.splitext(os.path.basename(mp))[0]
                    im = Image.open(mp)
                    has_alpha = im.mode in ('RGBA', 'LA', 'P')
                    fn = base + '.webp'
                    im.save(os.path.join(media_out, fn), 'WEBP', quality=86, lossless=False, method=6)
                    media_cache[mp] = fn
                el['t'] = 'img'
                el['src'] = 'media/' + media_cache[mp]
                els.append(el)
                continue
            prst = sppr.find(q('a:prstGeom'))
            geom = prst.get('prst') if prst is not None else 'rect'
            el['t'] = 'shape'
            el['geom'] = geom
            if geom == 'roundRect':
                gd = prst.find('.//' + q('a:gd'))
                adj = int(re.search(r'val (\d+)', gd.get('fmla')).group(1)) if gd is not None else 16667
                el['r'] = r1(min(w, h) * adj / 100000.0)
            fill, fa = parse_fill(sppr)
            if fill:
                el['fill'] = fill
                if fa is not None:
                    el['fa'] = fa
            ln = parse_ln(sppr)
            if ln:
                el['ln'] = ln
            sh = parse_shadow(sppr)
            if sh:
                el['sh'] = sh
            tx = parse_text(node)
            if tx:
                el['tx'] = tx
            if not fill and not ln and not tx:
                eid -= 1
                continue
            els.append(el)
        notes = ''
        nrel = [r for r in rels.getroot() if r.get('Type', '').endswith('/notesSlide')]
        if nrel:
            nx = etree.parse(os.path.normpath(os.path.join(work, 'ppt/slides', nrel[0].get('Target'))))
            ts = [t.text for t in nx.iter(q('a:t')) if t.text]
            notes = ' '.join(ts).strip()
            notes = re.sub(r'\s*\b\d+$', '', notes) if not notes.isdigit() else ''  # 끝의 슬라이드 번호 제거
        # 장면 제목: 가장 큰 글자의 텍스트
        best, bsz = '', 0
        for e in els:
            for pa in (e.get('tx') or {}).get('paras', []):
                for ru in pa['runs']:
                    if ru.get('sz', 0) > bsz and len(ru['t'].strip()) >= 3 and not e.get('reveal'):
                        bsz, best = ru['sz'], ' '.join(r['t'] for r in pa['runs']).strip()
        scenes.append({'id': 's%d' % si, 'bg': bg, 'notes': notes, 'title': best[:40], 'els': els})
    shutil.rmtree(work)
    deck = {'v': 1, 'id': deck_id, 'title': title, 'W': 960, 'H': 540, 'theme': 'lavender', 'scenes': scenes}
    with open(out + '/deck.json', 'w', encoding='utf8') as f:
        json.dump(deck, f, ensure_ascii=False, separators=(',', ':'))
    sz = sum(os.path.getsize(os.path.join(media_out, f)) for f in os.listdir(media_out))
    print('장면', len(scenes), '/ 이미지', len(media_cache), '/ 이미지 합계 %.1fMB' % (sz / 1e6),
          '/ deck.json %.0fKB' % (os.path.getsize(out + '/deck.json') / 1e3))


if __name__ == '__main__':
    convert(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
