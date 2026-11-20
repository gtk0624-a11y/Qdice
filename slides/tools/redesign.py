#!/usr/bin/env python3
"""PPT에서 변환한 장면을 '기본 틀'(파스텔 + 꿈송이)로 다시 꾸밉니다.
사용: python3 redesign.py in.json out.json
- 단원별 파스텔 색(01 보라 / 02 민트 / 03 살구)
- 어두운 장(표지·장 시작·마무리)은 파스텔 장면으로 새로 구성, 꿈송이 크게
- 내용 장면: 머리줄에 꿈송이 + 말풍선, 배경에 부드러운 동그라미
"""
import json, sys, re, random, string

src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf8'))
N = [0]


def rid(p='e'):
    N[0] += 1
    return '%s%s%d' % (p, ''.join(random.choice(string.ascii_lowercase) for _ in range(3)), N[0])


def text_of(e):
    if not e.get('tx'):
        return ''
    return '\n'.join(''.join(r['t'] for r in p['runs']) for p in e['tx']['paras']).strip()


def lines_of(e):
    return [''.join(r['t'] for r in p['runs']).strip() for p in e['tx']['paras'] if ''.join(r['t'] for r in p['runs']).strip()]


INK, MUTE = '2B2350', '6E6890'
U = {  # 단원별 색: 배경, 진한 배경(장 시작), 칩, 강조
    1: dict(bg='F4F0FF', deep='EDE6FF', chip='E4DBFB', acc='6A4BC4', ball='D9CCFA'),
    2: dict(bg='EEF9F4', deep='DDF5EA', chip='CDEFE0', acc='1F8F75', ball='BFE9D6'),
    3: dict(bg='FFF4ED', deep='FFE9DD', chip='FFE0D0', acc='D9603B', ball='FFD2BC'),
}
PROMPT = {1: '북한, 얼마나 알고 있나요?', 2: '분단은 우리에게 어떤 의미일까요?', 3: '우리가 바라는 남북 관계는 어떤 모습일까요?'}


def para(t, sz, c=INK, b=0, algn='l', lh=1.2, aft=0):
    return {'algn': algn, 'lh': lh, 'aft': aft, 'bullet': False, 'marL': 0, 'indent': 0, 'runs': [{'t': t, 'sz': sz, 'b': b, 'c': c}]}


def T(x, y, w, h, paras, anchor='t'):
    if isinstance(paras, str):
        paras = [paras]
    return {'id': rid(), 't': 'shape', 'geom': 'rect', 'x': x, 'y': y, 'w': w, 'h': h, 'tx': {'anchor': anchor, 'ins': [0, 0, 0, 0], 'paras': paras}}


def R(x, y, w, h, fill, geom='roundRect', r=16, fa=None, shadow=False, paras=None, anchor='m', ins=None):
    e = {'id': rid(), 't': 'shape', 'geom': geom, 'x': x, 'y': y, 'w': w, 'h': h, 'fill': fill}
    if geom == 'roundRect':
        e['r'] = r
    if fa is not None:
        e['fa'] = fa
    if shadow:
        e['sh'] = {'dist': 3, 'blur': 10, 'c': '6A4BC4', 'a': 0.16}
    if paras:
        e['tx'] = {'anchor': anchor, 'ins': ins or [10, 4, 10, 4], 'paras': paras}
    return e


def MASCOT(x, y, w):
    return {'id': rid(), 't': 'img', 'x': x, 'y': y, 'w': w, 'h': round(w * 342 / 360), 'src': 'media/ggumsong.png'}


def blobs(u, deep=False):
    c = U[u]
    return [
        R(560, -70, 520, 520, 'FFFFFF', 'ellipse', fa=0.6 if deep else 0.0),
        R(-90, 400, 260, 260, 'FFD3E4', 'ellipse', fa=0.55),
        R(800, 390, 190, 190, 'FFF0A8', 'ellipse', fa=0.7),
        R(-60, -80, 190, 190, c['ball'], 'ellipse', fa=0.55),
    ]


def thought(x, y, w, text, sz=16):
    """생각 말풍선(꿈송이 머리 위): 둥근 상자 + 작은 점 두 개"""
    h = 52
    return [R(x, y, w, h, 'FFFFFF', 'roundRect', 26, shadow=True, paras=[para(text, sz, INK, 1, 'c')], ins=[14, 4, 14, 4]),
            R(x + w * 0.62, y + h + 4, 16, 16, 'FFFFFF', 'ellipse', shadow=True), R(x + w * 0.62 + 14, y + h + 22, 9, 9, 'FFFFFF', 'ellipse')]


# ---------------- 장면 분류 ----------------
sc = d['scenes']


def unit_of(i, s):
    for e in s['els']:
        if e.get('t') == 'shape' and e.get('tx') and e['y'] < 40 and e['h'] < 40 and e['x'] < 60:
            m = re.match(r'0([123])\b', text_of(e))
            if m:
                return int(m.group(1))
    return {3: 1, 13: 2, 22: 3}.get(i, 1)


BUBBLE = [('생각 열기', '그림을 잘 보고 떠올려 볼까요?'), ('개념', '핵심만 쏙쏙 익혀요!'), ('탐구', '친구들과 함께 탐구해요!'), ('점검', '내가 얼마나 알까? 점검해요!'), ('퀴즈', '퀴즈에 도전! 두근두근'),
          ('자료', '자료를 꼼꼼히 읽어 봐요'), ('영상', '영상을 집중해서 봐요'), ('마무리', '오늘도 수고했어요!')]

out = []
for i, s in enumerate(sc, 1):
    u = unit_of(i, s)
    c = U[u]
    dark = s['bg'].upper() == '2B2350'
    if dark and i == 1:  # 표지
        qs = []
        for k in range(3):
            num = next(e for e in s['els'] if e.get('tx') and text_of(e) == '0%d' % (k + 1))
            q = next(e for e in s['els'] if e.get('tx') and abs(e['y'] - num['y']) < 3 and e is not num)
            qs.append(text_of(q))
        sub = next(text_of(e) for e in s['els'] if e.get('tx') and e['y'] < 80)
        title = next(lines_of(e) for e in s['els'] if e.get('tx') and e['h'] > 150)
        els = blobs(1, True) + [MASCOT(575, 95, 360)] + thought(560, 30, 330, '꿈송이랑 통일을 탐구해 봐요!')
        els += [T(48, 52, 500, 24, [para(sub, 14, MUTE, 0)]),
                T(48, 92, 520, 150, [para(t, 40, INK, 1, 'l', 1.18) for t in title])]
        cols = [U[1], U[2], U[3]]
        for k, q in enumerate(qs):
            y = 270 + k * 66
            els.append(R(48, y, 500, 54, 'FFFFFF', 'roundRect', 27, shadow=True))
            els.append(R(56, y + 7, 40, 40, cols[k]['acc'], 'ellipse', paras=[para('0%d' % (k + 1), 14, 'FFFFFF', 1, 'c')], ins=[0, 0, 0, 0]))
            els.append(T(108, y + 4, 430, 46, [para(q, 14.5, INK, 1, 'l', 1.15)], 'm'))
        out.append(dict(s, bg=U[1]['deep'], els=els))
    elif dark and s.get('title') == '수업 참여 QR':
        qr = next(e for e in s['els'] if e['t'] == 'qr')
        els = blobs(1, True) + [MASCOT(440, 345, 150)]
        els += [R(48, 70, 200, 34, 'FFFFFF', 'roundRect', 17, shadow=True, paras=[para('📱 수업에 참여해요', 15, c['acc'], 1, 'c')]),
                T(48, 124, 520, 130, [para('스마트폰·태블릿으로', 38, INK, 1, 'l', 1.15), para('QR을 찍어 들어오세요', 38, INK, 1, 'l', 1.15)]),
                T(48, 290, 380, 150, [para('① QR을 찍는다', 17, INK, 0, 'l', 1.3, 6), para('② 닉네임을 쓴다', 17, INK, 0, 'l', 1.3, 6), para('③ 질문·투표·모둠 학습지에 함께 참여한다', 17, INK, 0, 'l', 1.3)]),
                R(596, 96, 330, 356, 'FFFFFF', 'roundRect', 28, shadow=True), dict(qr, x=618, y=112, w=286, h=324)]
        out.append(dict(s, bg=U[1]['deep'], els=els))
    elif dark and s.get('title', '').startswith('오늘의 세 질문'):
        els = blobs(1, True) + [MASCOT(810, 8, 96)]
        els.append(T(48, 38, 600, 52, [para('오늘의 세 질문', 34, INK, 1)], 'm'))
        cols = [U[1], U[2], U[3]]
        rows = [(e, [x for x in s['els'] if x.get('tx') and abs(x['y'] - e['y']) < 3 and x is not e and x['x'] > 100][0]) for e in s['els'] if e.get('tx') and re.fullmatch(r'0[123]', text_of(e))]
        for k, (num, body) in enumerate(rows):
            y = 112 + k * 108
            ls = lines_of(body)
            els.append(R(48, y, 860, 96, 'FFFFFF', 'roundRect', 22, shadow=True))
            els.append(R(62, y + 22, 52, 52, cols[k]['acc'], 'ellipse', paras=[para('0%d' % (k + 1), 18, 'FFFFFF', 1, 'c')], ins=[0, 0, 0, 0]))
            els.append(T(130, y + 8, 760, 80, [para(ls[0], 17, INK, 1, 'l', 1.2, 4)] + [para(x, 12.5, MUTE, 0, 'l', 1.25) for x in ls[1:]], 'm'))
        foot = next(text_of(e) for e in s['els'] if e.get('tx') and e['y'] > 440)
        els.append(T(48, 450, 860, 40, [para(foot, 13.5, MUTE, 0, 'c')], 'm'))
        out.append(dict(s, bg=U[1]['deep'], els=els))
    elif dark:  # 장 시작(3·13·22)
        sub = next(text_of(e) for e in s['els'] if e.get('tx') and e['y'] < 70)
        num = next(text_of(e) for e in s['els'] if e.get('tx') and re.fullmatch(r'0\d', text_of(e)))
        title = next(lines_of(e) for e in s['els'] if e.get('tx') and e['h'] > 90 and 150 < e['y'] < 220)
        goals = lines_of(next(e for e in s['els'] if e.get('tx') and e['y'] > 360 and e['h'] > 60))
        TL = sum(-(-(len(g) + 2) // 31) for g in goals)
        els = blobs(u, True) + [MASCOT(600, 150, 330)] + thought(585, 58, 320, PROMPT[u], 15)
        els += [T(48, 40, 520, 24, [para(sub.replace('   |   ', '  |  '), 13, MUTE, 0)]),
                T(48, 74, 300, 92, [para(num, 74, c['acc'], 1, 'l', 1.0)]),
                T(48, 172, 520, 112, [para(t, 34, INK, 1, 'l', 1.2) for t in title]),
                R(48, 296, 500, 78 + TL * 20 + 8 * len(goals), 'FFFFFF', 'roundRect', 24, shadow=True),
                R(64, 316, 108, 28, c['acc'], 'roundRect', 14, paras=[para('학습 목표', 13, 'FFFFFF', 1, 'c')], ins=[0, 0, 0, 0]),
                T(66, 356, 470, TL * 20 + 8 * len(goals), [para('• ' + g, 15, INK, 0, 'l', 1.25, 6) for g in goals])]
        out.append(dict(s, bg=c['deep'], els=els))
    else:
        # 내용 장면: 배경 단원색, 칩 색 변경, 머리줄 꿈송이+말풍선
        els = s['els']
        chip_rect = chip_txt = None
        for e in els:
            if e.get('t') == 'shape' and e['y'] < 40 and e['h'] < 40 and e['x'] < 60 and e['w'] < 200:
                if e.get('fill') == 'ECE7FA':
                    e['fill'] = c['chip']
                    chip_rect = chip_rect or e
                if e.get('tx'):
                    for p in e['tx']['paras']:
                        for r in p['runs']:
                            r['c'] = c['acc']
                    if re.match(r'0\d', text_of(e)):
                        chip_txt = e
        ref = next((e for e in els if e.get('t') == 'shape' and e.get('tx') and e['y'] < 40 and e['x'] > 300 and text_of(e).startswith('교과서')), None)
        chip_w = (chip_rect or chip_txt or {'x': 43, 'w': 133})
        if ref:
            ref['x'] = chip_w['x'] + chip_w['w'] + 12; ref['w'] = 170
            for p in ref['tx']['paras']:
                p['algn'] = 'l'
        label = text_of(chip_txt) if chip_txt else ''
        msg = next((m for k, m in BUBBLE if k in label), '꿈송이와 함께해요!')
        bw = int(len(msg) * 12.5 + 34)
        deco = blobs(u)[1:3] + [R(800, -90, 200, 200, 'FFF1B8', 'ellipse', fa=0.5)]
        add = [R(866 - bw, 25, bw, 30, 'FFFFFF', 'roundRect', 15, shadow=True, paras=[para(msg, 12, INK, 1, 'c')], ins=[8, 0, 8, 0]), MASCOT(870, 4, 62)]
        out.append(dict(s, bg=c['bg'], els=deco + els + add))
    out[-1]['id'] = s['id']

d['scenes'] = out
json.dump(d, open(dst, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print(len(out), 'scenes')
