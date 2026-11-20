#!/usr/bin/env python3
"""변환된 통일 슬라이드에 '학생 참여 위젯'을 덧붙입니다.
- 생각 쓰기 상자 → 질문 월(wall)
- 18번 장면 → 모둠 학습지(ws)
- 새 장면: 입장 QR, 생선 뼈 모둠 기록(손글씨 포함), 이해도 투표, (숨김) 영상 예시
"""
import json, sys, copy, random, string

src, dst = sys.argv[1], sys.argv[2]
d = json.load(open(src, encoding='utf8'))
n = [0]


def rid(p):
    n[0] += 1
    return '%s%s%d' % (p, ''.join(random.choice(string.ascii_lowercase) for _ in range(4)), n[0])


def text_of(e):
    if not e.get('tx'):
        return ''
    return ' / '.join(''.join(r['t'] for r in p['runs']) for p in e['tx']['paras']).strip()


def inside(e, box):
    cx, cy = e['x'] + e['w'] / 2, e['y'] + e['h'] / 2
    return box['x'] <= cx <= box['x'] + box['w'] and box['y'] <= cy <= box['y'] + box['h']


def same_box(a, b):
    return all(abs(a[k] - b[k]) < 1 for k in 'xywh')


def wall(box, q):
    return {'id': rid('w'), 't': 'wall', 'x': box['x'], 'y': box['y'], 'w': box['w'], 'h': box['h'], 'q': q, 'approve': True}


# 각 장면에서 '답 상자(예시 답안 덮개)'와 같은 자리의 흰 상자를 질문 월로 바꿈
QTEXT = {  # 장면번호 → [질문 문구…] (위에서 아래, 왼쪽에서 오른쪽 순서). 없으면 상자 안 안내 문구 사용
    3: ['북한에 대해 새롭게 알게 된 사실은?'],
    6: ['공통점', '차이점'],
    11: ['느낀 점 / 실천할 점'], 19: ['느낀 점 / 실천할 점'], 26: ['느낀 점 / 실천할 점'],
    16: ['연설에서 알 수 있는 통일의 도덕적 의미는?'],
    21: ['제가 생각하는 통일 한국은 ○○○'],
    23: ['남북한 교류·협력이 필요한 이유는?'],
}
changed = []
for si, s in enumerate(d['scenes'], 1):
    if si == 18:
        continue
    ans = [e for e in s['els'] if e.get('reveal') and e.get('fill') == 'E5F6F0' and e['geom'] == 'roundRect']
    qi = 0
    for a in sorted(ans, key=lambda e: (round(e['x'] / 100), e['y'])):
        box = next((e for e in s['els'] if e is not a and e.get('t') == 'shape' and e.get('fill') == 'FFFFFF' and e.get('geom') == 'roundRect' and same_box(e, a)), None)
        if not box:
            continue
        inner = [e for e in s['els'] if e is not a and e is not box and inside(e, box)]
        label = next((text_of(e) for e in inner if e.get('t') == 'shape' and e.get('tx')), '')
        qs = QTEXT.get(si)
        q = (qs[qi] if qs and qi < len(qs) else label) or '생각을 써 봅시다'
        qi += 1
        pos = s['els'].index(box)
        s['els'][pos] = wall(box, q)
        for e in inner:
            s['els'].remove(e)
        changed.append((si, q))

# 18번: 모둠 학습지
s18 = d['scenes'][17]
boxes = [e for e in s18['els'] if e.get('t') == 'shape' and e.get('fill') == 'FFFFFF' and e['x'] > 400]
x0 = min(b['x'] for b in boxes); y0 = min(b['y'] for b in boxes); w0 = boxes[0]['w']; y1 = max(b['y'] + b['h'] for b in boxes)
labels = ['우리 모둠이 선택한 가치', '우리 모둠이 생각한 통일의 의미', '왜냐하면 통일이 되면 …']
rm = [e for e in s18['els'] if e.get('reveal') is None and e['x'] >= x0 - 1 and e['id'] not in ()]
ws_pos = s18['els'].index(boxes[0])
for e in list(s18['els']):
    if e.get('reveal') is None and e['x'] >= x0 - 1 and e['y'] >= y0 - 1 and e['y'] < y1:
        s18['els'].remove(e)
s18['els'].insert(ws_pos, {'id': rid('ws'), 't': 'ws', 'x': x0, 'y': y0, 'w': w0, 'h': y1 - y0, 'title': '우리 모둠이 생각한 통일의 의미', 'fields': [{'id': rid('f'), 'label': l} for l in labels], 'draw': False, 'bg': ''})
changed.append((18, 'ws'))


def mk(bg, els, title, notes='', hidden=False):
    s = {'id': rid('s'), 'bg': bg, 'notes': notes, 'title': title, 'els': els}
    if hidden:
        s['hidden'] = True
    return s


def T(x, y, w, h, text, sz, c='FFFFFF', b=1, algn='l', anchor='m'):
    return {'id': rid('e'), 't': 'shape', 'geom': 'rect', 'x': x, 'y': y, 'w': w, 'h': h,
            'tx': {'anchor': anchor, 'ins': [0, 0, 0, 0], 'paras': [{'algn': algn, 'lh': 1.15, 'aft': 0, 'bullet': False, 'marL': 0, 'indent': 0, 'runs': [{'t': t, 'sz': sz, 'b': b, 'c': c}]} for t in text.split('\n')]}}


def R(x, y, w, h, fill, geom='roundRect', r=16):
    e = {'id': rid('e'), 't': 'shape', 'geom': geom, 'x': x, 'y': y, 'w': w, 'h': h, 'fill': fill}
    if geom == 'roundRect':
        e['r'] = r
    return e


qr_scene = mk('2B2350', [
    R(560, 60, 420, 420, '3A2F6B', 'ellipse'),
    T(57, 90, 520, 40, '📱 수업에 참여해요', 18, '2FB594'),
    T(57, 140, 520, 150, '스마트폰·태블릿으로\nQR을 찍어 들어오세요', 38, 'FFFFFF'),
    T(57, 320, 480, 120, '① QR을 찍는다\n② 이름(닉네임)을 쓴다\n③ 선생님 화면과 함께 질문·투표·모둠 학습지에 참여한다', 17, 'D9CFFB', 0),
    {'id': rid('q'), 't': 'qr', 'x': 612, 'y': 110, 'w': 300, 'h': 320, 'label': '여기로 들어오세요'}
], '수업 참여 QR', '수업 시작 버튼을 누르면 QR이 나타납니다. 학생이 들어오면 교사 패널(🎛)에서 접속자를 볼 수 있습니다.')

fish = mk('F7F5FC', [
    R(43, 28, 150, 27, 'ECE7FA', 'roundRect', 13),
    T(43, 28, 150, 27, '02 · 탐구 활동', 12, '6A4BC4', 1, 'c'),
    T(43, 68, 871, 50, '생선 뼈 토론 — 우리 모둠 기록', 26, '2B2350'),
    T(43, 110, 871, 24, '학습지(부록 자료 6)에 쓰면서, 아래에도 모둠이 함께 정리해 보세요. 쓰는 즉시 선생님 화면에 모여요.', 13, '6E6890', 0),
    {'id': rid('ws'), 't': 'ws', 'x': 43, 'y': 142, 'w': 873, 'h': 350, 'title': '생선 뼈 토론 — 모둠 기록', 'fields': [
        {'id': rid('f'), 'label': '우리 모둠이 고른 보편적 가치 세 가지'},
        {'id': rid('f'), 'label': '분단 상태에서 가치가 훼손되는 모습'},
        {'id': rid('f'), 'label': '통일 이후 가치가 실현되는 모습'},
        {'id': rid('f'), 'label': '우리 모둠이 재구성한 통일의 의미'}], 'draw': True, 'bg': ''}
], '생선 뼈 모둠 기록', '모둠이 같은 칸을 함께 쓰고, 손글씨 칸에 생선 뼈 그림을 그려도 됩니다. 발표할 모둠 칸을 눌러 크게 보여 주세요.')

poll = mk('F7F5FC', [
    R(43, 28, 150, 27, 'ECE7FA', 'roundRect', 13),
    T(43, 28, 150, 27, '마무리 · 스스로 점검', 12, '6A4BC4', 1, 'c'),
    T(43, 68, 871, 50, '오늘 수업, 얼마나 이해했나요?', 26, '2B2350'),
    {'id': rid('p'), 't': 'poll', 'x': 43, 'y': 136, 'w': 873, 'h': 356, 'q': '오늘 배운 내용에 대한 나의 이해', 'opts': ['완전히 이해했어요', '조금 헷갈려요', '잘 모르겠어요'], 'delay': True}
], '이해도 투표', '학생이 고르면 "결과 공개 ▶"를 눌러 3·2·1 뒤에 함께 확인합니다.')

yt = mk('F7F5FC', [
    R(43, 28, 150, 27, 'ECE7FA', 'roundRect', 13),
    T(43, 28, 150, 27, '영상 보기 (예시)', 12, '6A4BC4', 1, 'c'),
    T(43, 68, 871, 50, '영상을 보고 물음에 답해 보자', 26, '2B2350'),
    {'id': rid('y'), 't': 'yt', 'x': 130, 'y': 130, 'w': 700, 'h': 380, 'url': '', 'start': 0, 'end': 0, 'pauseAt': []}
], '▶ 영상 장면(예시·숨김)', '편집(✏️) → 영상 상자를 두 번 누르고 유튜브 주소·시작/끝 시각·멈춤 질문을 넣으세요. 이 장면은 "건너뛰기"로 숨겨져 있습니다. 편집에서 "🙈 발표 때 건너뛰기"를 해제하면 발표에 나옵니다.', True)

sc = d['scenes']
sc.insert(1, qr_scene)
i17 = next(i for i, s in enumerate(sc) if s['title'].startswith('생선 뼈 토론으로'))
sc.insert(i17 + 1, fish)
sc.append(poll)
sc.append(yt)

# 장면 제목: 가장 큰 글자 요소의 모든 줄
for s in sc:
    best, bs = None, 0
    for e in s['els']:
        if e.get('reveal') or not e.get('tx'):
            continue
        r0 = e['tx']['paras'][0]['runs'][0] if e['tx']['paras'] and e['tx']['paras'][0]['runs'] else {}
        if r0.get('sz', 0) > bs and len(text_of(e)) >= 3:
            bs, best = r0['sz'], e
    if best is not None and not s['title'].startswith('▶') and s['title'] not in ('수업 참여 QR', '생선 뼈 모둠 기록', '이해도 투표'):
        s['title'] = text_of(best).replace(' / ', ' ')[:40]

d['title'] = '통일은 어떤 의미와 가치가 있을까? (30~32차시)'
d['scenes'] = sc
json.dump(d, open(dst, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
print('질문 월로 바뀐 곳:', changed)
print('장면 수', len(sc), [ (i+1, s['title']) for i, s in enumerate(sc)][:5])
