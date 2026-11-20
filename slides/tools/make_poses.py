from PIL import Image, ImageDraw, ImageFont
import math, glob
base=Image.open('/home/claude/qdice/slides/v1/ggumsong.png').convert('RGBA')
NAVY=(2,18,57,255); WHITE=(252,251,251,255)
CW,CH=480,440; OX,OY=60,72
S=4
fp=(glob.glob('/usr/share/fonts/**/*CJK*Bold*',recursive=True)+glob.glob('/usr/share/fonts/**/*Bold*.tt*',recursive=True))[0]

def face(img, kind):
    """눈/입 편집: kind = 'happy'(^^)"""
    im=img.copy(); big=im.resize((im.width*S,im.height*S),Image.LANCZOS); d=ImageDraw.Draw(big)
    for cx,cy,r in ((127.5,162,19),(211,149.5,19)):
        d.ellipse(((cx-r)*S,(cy-r)*S,(cx+r)*S,(cy+r)*S),fill=WHITE)
    if kind=='happy':
        for cx,cy in ((127.5,162),(211,149.5)):
            d.arc(((cx-14)*S,(cy-10)*S,(cx+14)*S,(cy+16)*S),205,335,fill=NAVY,width=6*S)
    elif kind=='wink':
        cx,cy=127.5,162
        # 왼눈은 그대로 복원, 오른눈만 ^ — 간단히 happy와 동일 처리 대신 오른쪽만
        pass
    return big.resize(im.size,Image.LANCZOS)

def canvas(img, rot=0, flip=False):
    if flip: img=img.transpose(Image.FLIP_LEFT_RIGHT)
    c=Image.new('RGBA',(CW,CH),(0,0,0,0))
    if rot:
        r=img.rotate(rot,resample=Image.BICUBIC,expand=True,center=(180,330))
    else: r=img
    c.alpha_composite(r,(OX-(r.width-360)//2,OY-(r.height-342)//2))
    return c

def layer(): 
    l=Image.new('RGBA',(CW*S,CH*S),(0,0,0,0)); return l,ImageDraw.Draw(l)
def fin(c,l): 
    c.alpha_composite(l.resize((CW,CH),Image.LANCZOS)); return c

def star(d,x,y,r,col):
    pts=[]
    for i in range(8):
        a=math.pi/4*i-math.pi/2; rr=r if i%2==0 else r*0.32
        pts.append(((x+rr*math.cos(a))*S,(y+rr*math.sin(a))*S))
    d.polygon(pts,fill=col)
def heart(d,x,y,r,col):
    d.ellipse(((x-r)*S,(y-r*0.9)*S,(x)*S,(y+r*0.1)*S),fill=col); d.ellipse(((x)*S,(y-r*0.9)*S,(x+r)*S,(y+r*0.1)*S),fill=col)
    d.polygon([((x-r*0.98)*S,(y-r*0.25)*S),((x+r*0.98)*S,(y-r*0.25)*S),(x*S,(y+r*1.05)*S)],fill=col)
def text(d,x,y,t,sz,col,rot=0):
    f=ImageFont.truetype(fp,sz*S); 
    tmp=Image.new('RGBA',(sz*S*2,sz*S*2),(0,0,0,0)); td=ImageDraw.Draw(tmp)
    # 외곽선(흰색)으로 가독성
    td.text((sz*S,sz*S),t,font=f,fill=col,anchor='mm',stroke_width=int(sz*S*0.14),stroke_fill=(255,255,255,255))
    td.text((sz*S,sz*S),t,font=f,fill=col,anchor='mm')
    tmp=tmp.rotate(rot,resample=Image.BICUBIC)
    return tmp,(int(x*S-sz*S),int(y*S-sz*S))

def put(l,tmp,pos): l.alpha_composite(tmp,pos)

POSES={}
def think():
    c=canvas(base,rot=-7); l,d=layer()
    for x,y,s,col,rot in ((372,64,60,(106,75,196,255),12),(412,110,40,(244,112,90,255),-10)):
        t,p=text(d,x,y,'?',s,col,rot); put(l,t,p)
    d.ellipse((330*S,118*S,342*S,130*S),fill=(255,255,255,255),outline=(200,190,230,255),width=2*S)
    return fin(c,l)
def happy():
    c=canvas(face(base,'happy')); l,d=layer()
    star(d,92,70,22,(255,212,59,255)); star(d,400,100,16,(255,160,190,255)); star(d,60,160,11,(150,220,200,255)); star(d,420,200,12,(255,212,59,255))
    heart(d,378,60,14,(244,112,140,255))
    return fin(c,l)
def surprise():
    c=canvas(base); l,d=layer()
    t,p=text(d,385,70,'!',74,(244,100,70,255),8); put(l,t,p)
    for a in (-40,-15,10):  # 놀람 선
        r1,r2=70,92; cx,cy=330,120
        d.line(((cx+r1*math.cos(math.radians(a-90)))*S,(cy+r1*math.sin(math.radians(a-90)))*S,(cx+r2*math.cos(math.radians(a-90)))*S,(cy+r2*math.sin(math.radians(a-90)))*S),fill=(244,100,70,255),width=4*S)
    # 땀방울
    d.polygon([(110*S,70*S),(100*S,96*S),(120*S,96*S)],fill=(150,205,245,255)); d.ellipse((100*S,88*S,120*S,108*S),fill=(150,205,245,255))
    return fin(c,l)
def cheer():
    c=canvas(face(base,'happy'),rot=6); l,d=layer()
    cols=[(255,212,59,255),(244,112,140,255),(106,75,196,255),(47,181,148,255),(60,123,217,255)]
    import random; random.seed(4)
    for i in range(26):
        x=random.randint(30,450); y=random.randint(8,150); col=cols[i%5]
        if i%3==0: star(d,x,y,9,col)
        elif i%3==1: d.ellipse((x*S,y*S,(x+9)*S,(y+9)*S),fill=col)
        else: d.rectangle((x*S,y*S,(x+12)*S,(y+6)*S),fill=col)
    return fin(c,l)
def idea():
    c=canvas(base,rot=3); l,d=layer()
    cx,cy=392,86
    d.ellipse(((cx-30)*S,(cy-30)*S,(cx+30)*S,(cy+30)*S),fill=(255,226,90,255),outline=(255,255,255,255),width=3*S)
    d.rounded_rectangle(((cx-14)*S,(cy+26)*S,(cx+14)*S,(cy+44)*S),radius=4*S,fill=(160,150,190,255))
    d.arc(((cx-14)*S,(cy-14)*S,(cx+14)*S,(cy+14)*S),200,300,fill=(255,255,255,255),width=4*S)
    for a in range(-80,81,40):
        ra=math.radians(a-90+ -20)
        d.line(((cx+40*math.cos(ra))*S,(cy+40*math.sin(ra))*S,(cx+56*math.cos(ra))*S,(cy+56*math.sin(ra))*S),fill=(255,190,40,255),width=4*S)
    return fin(c,l)
def read():
    c=canvas(base,rot=-3); l,d=layer()
    # 돋보기
    cx,cy=396,120
    d.ellipse(((cx-34)*S,(cy-34)*S,(cx+34)*S,(cy+34)*S),fill=(220,240,255,150),outline=(106,75,196,255),width=7*S)
    d.line(((cx+24)*S,(cy+24)*S,(cx+58)*S,(cy+60)*S),fill=(106,75,196,255),width=9*S)
    d.arc(((cx-22)*S,(cy-22)*S,(cx+22)*S,(cy+22)*S),200,260,fill=(255,255,255,255),width=4*S)
    return fin(c,l)
def base_pose(): return canvas(base)
for n,f in dict(base=base_pose,think=think,happy=happy,surprise=surprise,cheer=cheer,idea=idea,read=read).items():
    im=f(); bb=im.getbbox(); im.save(f'ggum_{n}.png'); POSES[n]=im
sheet=Image.new('RGBA',(CW*4,CH*2),(244,240,255,255))
for i,(n,im) in enumerate(POSES.items()): sheet.alpha_composite(im,((i%4)*CW,(i//4)*CH))
sheet.convert('RGB').save('poses_sheet.png')
print('ok')
