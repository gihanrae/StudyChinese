/* Study Chinese - app logic (one scope): glyphs, data, layout, view, dock, editor */
(function(){
var $=function(s){return document.querySelector(s)};
var root=document.documentElement,grid=$('#grid'),box=$('#box'),cw=$('#cw'),clr=$('#clr'),ti=$('#ti');
var canHover=matchMedia('(hover:hover)').matches;
var cs=getComputedStyle(root);function col(v){return cs.getPropertyValue(v).trim()}
function sget(k){try{return localStorage.getItem(k)}catch(e){return null}}
function sset(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function norm(s){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase()}
/* pinyin tone colouring */
var V='aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ',TM={'ā':1,'á':2,'ǎ':3,'à':4,'ē':1,'é':2,'ě':3,'è':4,'ī':1,'í':2,'ǐ':3,'ì':4,'ō':1,'ó':2,'ǒ':3,'ò':4,'ū':1,'ú':2,'ǔ':3,'ù':4,'ǖ':1,'ǘ':2,'ǚ':3,'ǜ':4},
 SYL=new RegExp('(?:zh|ch|sh|[bpmfdtnlgkhjqxrzcsyw])?['+V+']+(?:ng|n|r)?(?!['+V+'])','gi');
function tonify(s){var f=document.createDocumentFragment(),last=0,m;SYL.lastIndex=0;
 while((m=SYL.exec(s))){
  if(m.index>last)f.appendChild(document.createTextNode(s.slice(last,m.index)));
  var tn=5,w=m[0].toLowerCase();for(var i=0;i<w.length;i++){if(TM[w[i]]){tn=TM[w[i]];break}}
  var sp=document.createElement('span');sp.className='t'+tn;sp.textContent=m[0];f.appendChild(sp);last=m.index+m[0].length}
 if(last<s.length)f.appendChild(document.createTextNode(s.slice(last)));return f}
var tip=$('#tip'),tipFor=null,wmode=false,EM=false,GL=sget('mv_gl')==='1';
function showTip(c,lvl){var it=c._it;tipFor=c;tip.textContent='';
 var a=document.createElement('div');a.className='tp';a.appendChild(tonify(it.p));tip.appendChild(a);
 if(lvl>1){var m=document.createElement('div');m.className='tm';m.textContent=it.e;tip.appendChild(m);if(it.x){var x=document.createElement('div');x.className='tx';x.textContent=it.x;tip.appendChild(x)}}
 tip.classList.remove('on');tip.style.visibility='hidden';
 var r=c.getBoundingClientRect(),w=tip.offsetWidth,h=tip.offsetHeight,top=r.top-h-8;if(top<48)top=r.bottom+8;
 tip.style.left=Math.max(6,Math.min(innerWidth-w-6,r.left+r.width/2-w/2))+'px';tip.style.top=top+'px';tip.style.visibility='';
 requestAnimationFrame(function(){tip.classList.add('on')})}
function hideTip(){tipFor=null;tip.classList.remove('on')}

/* ---- categories (colour = category) ---- */
var CATS=[
 {k:'people',  n:'People',      h:345},
 {k:'things',  n:'Things',h:28},
 {k:'subjects',n:'Subjects',            h:268},
 {k:'verbs',   n:'Verbs',               h:212},
 {k:'adj',     n:'Adjectives',          h:140},
 {k:'pron',    n:'Pronouns',            h:48},
 {k:'other',   n:'Other',   h:0,gray:1}
];
function catIdx(k){for(var i=0;i<CATS.length;i++)if(CATS[i].k===k)return i;return -1}
function tint(el,ci){if(!CATS[ci])return;el.style.setProperty('--h',CATS[ci].h);if(CATS[ci].gray)el.style.setProperty('--sm',0)}
var ED={m:{},d:[],cx:[],cn:{},sx:[],cd:[],nw:{}};
try{var eo=JSON.parse(sget('mv_ed')||'{}');for(var ek in ED)if(eo[ek])ED[ek]=eo[ek]}catch(e){}
ED.cx.forEach(function(c){CATS.push(c)});
CATS=CATS.filter(function(c){return ED.cd.indexOf(c.k)<0});CATS.forEach(function(c){if(ED.cn[c.k])c.n=ED.cn[c.k]});
function saveEd(){sset('mv_ed',JSON.stringify(ED))}

/* ---- stroke glyph data (embedded, with online fallback for new characters) ---- */
var isHan=function(ch){return /[\u3400-\u9fff]/.test(ch)};
var memo={},pend={},failed={},defd={},NS='http://www.w3.org/2000/svg',defs=$('#defs').firstElementChild;
var SP={'…':'<svg viewBox="0 0 1024 1024" aria-hidden="true"><circle cx="190" cy="560" r="52"/><circle cx="512" cy="560" r="52"/><circle cx="834" cy="560" r="52"/></svg>'};
function def(ch,d){var id='g'+ch.codePointAt(0).toString(16);
 if(!defd[id]){defd[id]=1;var e=document.createElementNS(NS,'path');e.id=id;e.setAttribute('d',d.strokes.join(' '));e.setAttribute('transform','translate(0 900) scale(1 -1)');defs.appendChild(e)}
 return id}
function svg(d,ch){return memo[ch]||(memo[ch]='<svg viewBox="0 0 1024 1024" aria-hidden="true"><use href="#'+def(ch,d)+'"/></svg>')}
function paint(s){var ch=s.dataset.ch,d=HZD[ch];
 if(SP[ch]){s.innerHTML=SP[ch];return}
 if(d){s.innerHTML=svg(d,ch);s.classList.remove('fb','fail')}
 else{s.textContent=ch;s.classList.add('fb');if(failed[ch])s.classList.add('fail');else if(isHan(ch))need(ch)}}
var SRC=['https://cdn.jsdelivr.net/npm/hanzi-writer-data@2.0.1/','https://fastly.jsdelivr.net/npm/hanzi-writer-data@2.0.1/','https://unpkg.com/hanzi-writer-data@2.0.1/','https://cdn.jsdelivr.net/gh/chanind/hanzi-writer-data@2.0.1/data/'];
function grab(ch,i){var ac=new AbortController(),tm=setTimeout(function(){ac.abort()},6000);
 return fetch(SRC[i]+encodeURIComponent(ch)+'.json',{signal:ac.signal}).then(function(r){clearTimeout(tm);if(!r.ok)throw 0;return r.json()}).catch(function(e){clearTimeout(tm);if(i+1<SRC.length)return grab(ch,i+1);throw e})}
function load(ch){
 if(HZD[ch])return Promise.resolve(HZD[ch]);
 if(pend[ch])return pend[ch];
 var c=sget('hz_'+ch);if(c){try{HZD[ch]=JSON.parse(c);return Promise.resolve().then(function(){document.querySelectorAll('.g[data-ch="'+ch+'"]').forEach(paint);return HZD[ch]})}catch(e){}}
 return pend[ch]=grab(ch,0)
  .then(function(d){HZD[ch]=d;sset('hz_'+ch,JSON.stringify(d));document.querySelectorAll('.g[data-ch="'+ch+'"]').forEach(paint);return d})
  .catch(function(e){failed[ch]=1;delete pend[ch];document.querySelectorAll('.g[data-ch="'+ch+'"]').forEach(function(s){s.classList.add('fail')});throw e})}
function need(ch){if(failed[ch]||pend[ch])return;load(ch).catch(function(){})}
function glyphs(text,lazy){var f=document.createDocumentFragment();Array.from(text.replace(/\s/g,'')).forEach(function(ch){var s=document.createElement('i');s.className='g';s.dataset.ch=ch;if(!lazy){s.dataset.p=1;paint(s)}f.appendChild(s)});return f}
var io=('IntersectionObserver' in window)?new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);e.target.querySelectorAll('.g:not([data-p])').forEach(function(s){s.dataset.p=1;paint(s)})})},{rootMargin:'500px 0px'}):null;
function lazyPaint(c){if(io)io.observe(c);else c.querySelectorAll('.g').forEach(function(s){s.dataset.p=1;paint(s)})}

/* ---- hover: animated stroke order (same glyph) ---- */
function setup(c){
 if(c._hz!==undefined)return c._hz;
 if(typeof HanziWriter==='undefined'){c._hz=null;return null}
 var b=c.querySelector('.gl'),wr=document.createElement('div');wr.className='wr';b.appendChild(wr);
 var ws=[];
 Array.from(c._it.h.replace(/\s/g,'')).forEach(function(x,i){
  if(!isHan(x))return;
  var d=document.createElement('div');d.className='wc';d.style.setProperty('--i',i);wr.appendChild(d);
  ws.push(HanziWriter.create(d,x,{width:100,height:100,padding:0,showCharacter:false,showOutline:true,strokeColor:col('--fg'),outlineColor:col('--gh'),strokeAnimationSpeed:1.4,delayBetweenStrokes:120,charDataLoader:function(q,ok,fail){load(q).then(ok,fail)}}))});
 c._hz=ws;c._tk=0;return ws}
function hz(c,on){
 var ws=setup(c);if(!ws||!ws.length)return;var tk=++c._tk;clearTimeout(c._lt);
 if(on){c.dataset.h=1;
  (function run(){
   if(c._tk!==tk)return;
   ws.forEach(function(w){w.hideCharacter({duration:0})});
   (function step(i){
    if(c._tk!==tk)return;
    if(i>=ws.length){c._lt=setTimeout(run,900);return}
    ws[i].animateCharacter({onComplete:function(){step(i+1)}})})(0)})()}
 else{delete c.dataset.h;setTimeout(function(){if(c._tk===tk)ws.forEach(function(w){w.hideCharacter({duration:0})})},220)}}

/* ---- data ---- */
var items=[],seq=0,added=[],byKey={},N={};
try{N=JSON.parse(sget('mv_n')||'{}')}catch(e){N={}}
function parseLine(line,cat){
 var p=line.split(/\t|\|/).map(function(x){return x.trim()});
 if(p.length<3||!p[0]||p[0]==='汉字')return null;
 return {h:p[0],p:p[1],e:p[2],x:p[3]||'',c:cat,nw:/^new$/i.test(p[4]||'')}}
function idx(it){it.s=norm(it.h+' '+it.p+' '+it.e);it.pn=norm(it.p).replace(/[^a-z0-9]/g,'');it.ew=norm(it.e).split(/[^a-z0-9]+/).filter(Boolean);it.hn=it.h.replace(/\s/g,'');it._ch=null}
function addItem(o,user){
 var ci=catIdx(o.c);if(ci<0)return null;
 var k=o.k||o.h.replace(/\s/g,'')+'|'+o.c;
 var it={h:o.h,p:o.p,e:o.e,x:o.x||'',c:ci,ck:o.c,sb:o.sb||'',k:k,id:seq++,n:N[k]||0,u:!!user,nw:!!o.nw};
 idx(it);it.el=card(it);items.push(it);byKey[k]=it;heat(it);return it}
function card(it){
 var d=document.createElement('div'),n=Array.from(it.h.replace(/\s/g,'')).length||1;
 d.className='c'+(it.nw?' nw':'');d.tabIndex=0;d.setAttribute('role','button');d._it=it;tint(d,it.c);
 d.style.setProperty('--cs',Math.min(32,48/n));d.style.setProperty('--n',n);
 var b=document.createElement('b');b.className='gl';b.style.fontWeight='400';b.appendChild(glyphs(it.h,true));d.appendChild(b);
 var nd=document.createElement('span');nd.className='nd';nd.title='New - click to clear';d.appendChild(nd);lazyPaint(d);
  return d}
function heat(it){var h=it.n>0?Math.min(1,Math.log2(it.n+1)/3.5):0;it.hv=h;it.el.style.setProperty('--heat',h.toFixed(2));it.el.classList.toggle('hot',h>=.5)}

var cat=-1,csub='';
(window.VOCAB||'').split('\n').forEach(function(l){
 l=l.trim();if(!l||l[0]==='#')return;
 var m=l.match(/^\[(\w+)(?:\/([^\]]*))?\]$/);if(m){cat=m[1];csub=(m[2]||'').trim();return}
 var o=parseLine(l,cat);if(o){o.sb=csub;var k0=o.h.replace(/\s/g,'')+'|'+o.c;if(ED.d.indexOf(k0)>=0)return;if(ED.m[k0])for(var q in ED.m[k0])o[q]=ED.m[k0][q];o.k=k0;if(ED.nw[k0]!==undefined)o.nw=!!ED.nw[k0];addItem(o,false)}});
try{added=JSON.parse(sget('mv_add')||'[]')}catch(e){added=[]}
added.forEach(function(o){addItem(o,true)});

/* ---- mind map: root > category > sub-branch > words ---- */
var map=$('#map'),world=$('#world'),lk=$('#links'),hubs=$('#hubs');
var SPC=68,V={x:0,y:0,k:1},colp={},clus=[],cross=[],hlA=null,moved=false,MXD=1,introOn=true,STOP='的了不没是有在我你他她们吗呢也很都啊这那哪';
function cmp(a,b){return a.id-b.id}
function chars(t){return t._ch||(t._ch=Array.from(t.hn).filter(function(c){return isHan(c)&&STOP.indexOf(c)<0}))}
function shares(a,b){var x=chars(a),y=chars(b);return x.some(function(c){return y.indexOf(c)>=0})}
function chainOrder(l){var r=l.slice(),o=[];if(!r.length)return o;o.push(r.shift());
 while(r.length){var last=o[o.length-1],bi=0;for(var i=0;i<r.length;i++){if(shares(last,r[i])){bi=i;break}}o.push(r.splice(bi,1)[0])}return o}
/* ---- dense grid: words flow like text, with small labels inline ---- */
var BB=null,T=58,TY=58,GG=4;/* GG: extra gap between groups. Card gap is 2px, so group gap = 2+4 = 6px (3x) */
function arrange(){
 TY=EM?68:58;
 var by=CATS.map(function(){return {}}),ord=CATS.map(function(){return []});
 items.slice().sort(cmp).forEach(function(t){var o=by[t.c];if(!o[t.sb]){o[t.sb]=[];ord[t.c].push(t.sb)}});
 ED.sx.forEach(function(p){var ci=catIdx(p[0]);if(ci>=0&&!by[ci][p[1]]){by[ci][p[1]]=[];ord[ci].push(p[1])}});
 ord.forEach(function(l){var i=l.indexOf('');if(i>=0&&l.length>1){l.splice(i,1);l.push('')}});
 items.slice().sort(cmp).forEach(function(t){by[t.c][t.sb].push(t)});
 var blocks=[],NG=0,GI=0,stride=1;
 ord.forEach(function(l){NG+=l.length});
 function gcd(p,q){return q?gcd(q,p%q):p}
 if(NG>2){stride=Math.round(NG*.382);while(gcd(stride,NG)!==1)stride++}
 /* every group gets its own hue (spread so neighbours differ) and one of 3 saturation levels */
 function groupColor(){var i=NG>0?(GI++*stride)%NG:0;return {hue:i*360/NG+10,sm:[1.5,2.1,2.7][i%3]}}
 /* candidate block shapes for n cards: near-full rectangles, not too long and thin */
 function shapes(n){var o=[],mx=Math.max(1,Math.floor(n*.2));
  for(var c=1;c<=n;c++){var r=Math.ceil(n/c),w=c*r-n,as=Math.max(c/r,r/c);if(w<=mx&&as<=3)o.push({c:c,r:r})}
  if(!o.length){var c0=Math.ceil(Math.sqrt(n));o.push({c:c0,r:Math.ceil(n/c0)})}return o}
 clus=CATS.map(function(c,ci){var n=ord[ci].length,subs=ord[ci].map(function(sb){
   var l=chainOrder(by[ci][sb].filter(function(t){return t.m!==false})),gc=groupColor();
   return {sb:sb,l:l,hue:gc.hue,sm:gc.sm,vis:EM||l.length>0,cells:[]}});
  if(!subs.length&&EM)subs.push({sb:'',l:[],hue:c.h,sm:2,vis:true,cells:[]});
  var cl={ci:ci,subs:subs,l:[],flat:n<=1};subs.forEach(function(s){cl.l=cl.l.concat(s.l)});cl.vis=EM||cl.l.length>0;
  if(cl.vis){var first=true;subs.forEach(function(s){if(!s.vis)return;s.first=first;first=false;
   blocks.push({s:s,cl:cl,sh:shapes(Math.max(1,s.l.length)),area:Math.max(1,s.l.length)})})}
  return cl});
 /* skyline packing: each group is a compact block; every block goes where it sits lowest, filling gaps beside taller blocks */
 function pack(W,order){var sk=[{x:0,w:W+GG,y:0}],pl=[],mw=0,mh=0,lim=W+GG;
  for(var oi=0;oi<order.length;oi++){var b=order[oi],bs=null;
   b.sh.forEach(function(s){var bw=s.c*T+GG,bh=s.r*TY+GG;
    for(var i=0;i<sk.length;i++){var x=sk[i].x,e=x+bw;if(e>lim)break;
     var y=0,wa=0,j;for(j=i;j<sk.length&&sk[j].x<e;j++)y=Math.max(y,sk[j].y);
     for(j=i;j<sk.length&&sk[j].x<e;j++)wa+=(y-sk[j].y)*(Math.min(e,sk[j].x+sk[j].w)-sk[j].x);
     var bot=y+bh;
     if(!bs||bot<bs.bot-.01||(bot<bs.bot+.01&&(wa<bs.wa||(wa===bs.wa&&x<bs.x))))bs={b:b,s:s,x:x,y:y,bw:bw,bh:bh,bot:bot,wa:wa}}});
   if(!bs)return null;
   var e2=bs.x+bs.bw,ns=[];
   sk.forEach(function(g){var g2=g.x+g.w;if(g2<=bs.x||g.x>=e2){ns.push(g);return}
    if(g.x<bs.x)ns.push({x:g.x,w:bs.x-g.x,y:g.y});if(g2>e2)ns.push({x:e2,w:g2-e2,y:g.y})});
   ns.push({x:bs.x,w:bs.bw,y:bs.bot});ns.sort(function(p,q){return p.x-q.x});
   sk=[];ns.forEach(function(g){var l=sk[sk.length-1];if(l&&l.y===g.y&&l.x+l.w===g.x)l.w+=g.w;else sk.push(g)});
   pl.push(bs);mw=Math.max(mw,e2-GG);mh=Math.max(mh,bs.bot-GG)}
  return {mw:mw,mh:mh,pl:pl}}
 var a=safe(),res=null,bk=0,byArea=blocks.slice().sort(function(p,q){return q.area-p.area});
 [blocks,byArea].forEach(function(order,oi){for(var wc=3;wc<=120;wc++){var r=pack(wc*T,order);if(!r)continue;
  var k=Math.min((a.R-a.L)/r.mw,(a.B-a.T)/r.mh)*(oi?1/1.04:1);if(k>bk){bk=k;res=r}}});
 MXD=(res?res.mw:8*T)*1.4;
 clus.forEach(function(c){c.bb=null;c.subs.forEach(function(s){s.bb=null})});
 function bump(o,x,y){var b=o.bb||(o.bb=[1e9,1e9,-1e9,-1e9]);b[0]=Math.min(b[0],x-T/2);b[1]=Math.min(b[1],y-(EM?39:29));b[2]=Math.max(b[2],x+T/2);b[3]=Math.max(b[3],y+29)}
 var x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
 if(res)res.pl.forEach(function(q){var b=q.b,s=b.s,cl=b.cl,l=s.l.length?s.l:[null],bx=q.x,by0=q.y;
  l.forEach(function(t,i){
   var col=i%q.s.c,row=Math.floor(i/q.s.c),x=bx+(col+.5)*T,y=by0+row*TY+(EM?39:TY/2);
   x0=Math.min(x0,x-T/2);x1=Math.max(x1,x+T/2);y0=Math.min(y0,by0+row*TY);y1=Math.max(y1,by0+row*TY+TY);
   s.cells.push({x:x,y:y,row:row});bump(cl,x,y);bump(s,x,y);
   if(t){t.gx=x;t.gy=y;t.sub=s;t.el.style.setProperty('--h',s.hue);t.el.style.setProperty('--sm',s.sm);t.el.style.left=x+'px';t.el.style.top=y+'px';
    if(introOn)t.el.style.setProperty('--d',(.3+Math.hypot(x,y)/MXD*1.2).toFixed(2)+'s');
    if(t.el.parentNode!==grid)grid.appendChild(t.el)}})});
 BB=res&&blocks.length?[x0,y0,x1,y1]:[0,0,T,TY]}
var NSV='http://www.w3.org/2000/svg';
function lkEl(x1,y1,x2,y2,cls,ci,hue){var e=document.createElementNS(NSV,'path');e.setAttribute('d','M'+x1+' '+y1+'L'+x2+' '+y2);e.setAttribute('class',cls);tint(e,ci);if(hue!=null)e.style.setProperty('--h',hue);lk.appendChild(e);return e}
function mkEl(t,c){var e=document.createElement(t);e.className=c;return e}
function hubEl(cls,name,count,ci,hue,x,y,onFocus,acts){
 var h=mkEl('div',cls);tint(h,ci);if(hue!=null)h.style.setProperty('--h',hue);h.style.left=x+'px';h.style.top=y+'px';
 if(introOn)h.style.setProperty('--d',(Math.hypot(x,y)/MXD*.9).toFixed(2)+'s');
 var b=document.createElement('b');b.textContent=name;var sm=document.createElement('small');sm.textContent=count;
 h.appendChild(b);h.appendChild(sm);h.title=name+' · '+count;h.tabIndex=0;h.setAttribute('role','button');
 if(acts){var a=mkEl('div','ea');acts.forEach(function(q){var t=document.createElement('button');t.textContent=q[0];t.title=q[1];t.setAttribute('aria-label',q[1]);
  t.addEventListener('click',function(e){e.stopPropagation();q[2](t)});t.addEventListener('pointerdown',function(e){e.stopPropagation()});a.appendChild(t)});h.appendChild(a)}
 h.addEventListener('click',onFocus);h.addEventListener('keydown',function(e){if(e.key==='Enter'){e.preventDefault();onFocus()}});
 hubs.appendChild(h);return h}
function acts(c,s){var ci=c.ci,ck=CATS[ci].k,a=[];
 if(s){a.push(['+ word','Add word',function(t){addWordAt(t,ck,s.sb)}],['✎','Rename group',function(t){renameSub(t,ci,s)}],['✕','Delete group',function(){delSub(ci,s)}])}
 else{if(c.flat)a.push(['+ word','Add word',function(t){addWordAt(t,ck,c.subs[0]?c.subs[0].sb:'')}]);
  a.push(['+ group','Add group',function(t){newGroup(t,ci)}],['✎','Rename category',function(t){renameCat(t,ci)}],['✕','Delete category',function(){delCat(ci)}])}
 return a}
function lab(cls,name,count,onFocus,acts){
 var w=mkEl('span','lbw'),b=mkEl('span','lb '+cls);b.textContent=name;b.title=name+' \u00b7 '+count;b.tabIndex=0;b.setAttribute('role','button');
 b.addEventListener('click',function(){if(!EM)onFocus()});b.addEventListener('keydown',function(e){if(e.key==='Enter'&&!EM){e.preventDefault();onFocus()}});
 w.appendChild(b);
 if(acts){var a=mkEl('div','ea');acts.forEach(function(q){var t=document.createElement('button');t.textContent=q[0];t.title=q[1];t.setAttribute('aria-label',q[1]);
  t.addEventListener('click',function(e){e.stopPropagation();q[2](t)});t.addEventListener('pointerdown',function(e){e.stopPropagation()});a.appendChild(t)});w.appendChild(a)}
 return w}
/* tiny dim group text on the first card run of each group (Groups button) */
function tinyLabels(){
 clus.forEach(function(c){if(!c.vis)return;
  c.subs.forEach(function(s){if(!s.vis||!s.cells.length)return;
   var r0=s.cells[0].row,x0=1e9,x1=-1e9,y=s.cells[0].y;
   s.cells.forEach(function(q){if(q.row===r0){x0=Math.min(x0,q.x);x1=Math.max(x1,q.x)}});
   var d=mkEl('div','gt'),nm=c.flat?CATS[c.ci].n:(s.sb||'More');
   d.textContent=s.first&&!c.flat?CATS[c.ci].n+' \u00b7 '+nm:nm;
   d.style.left=(x0-T/2+4)+'px';d.style.top=(y-28+2)+'px';d.style.width=(x1-x0+T-8)+'px';
   hubs.appendChild(d)})})}
function build(){
 hubs.textContent='';
 if(!EM){if(GL)tinyLabels();return}
 clus.forEach(function(c){if(!c.vis)return;var ci=c.ci;
  c.subs.forEach(function(s){if(!s.vis||!s.cells.length)return;
   var rows={};s.cells.forEach(function(q){var r=rows[q.row]||(rows[q.row]={x0:1e9,x1:-1e9,y:q.y,r:q.row});r.x0=Math.min(r.x0,q.x);r.x1=Math.max(r.x1,q.x)});
   Object.keys(rows).map(function(k){return rows[k]}).sort(function(a,b){return a.r-b.r}).forEach(function(r,i){
    var d=mkEl('div','sg');tint(d,ci);d.style.setProperty('--h',s.hue);d.style.setProperty('--sm',s.sm);
    d.style.left=(r.x0-28)+'px';d.style.top=(r.y-39)+'px';d.style.width=(r.x1-r.x0+56)+'px';
    if(i===0){
     if(s.first)d.appendChild(lab('cn',CATS[ci].n,c.l.length,function(){fitBox.apply(null,c.bb.concat([true]))},c.flat?acts(c):acts(c).filter(function(q){return q[0]!=='+ word'})));
     if(!c.flat)d.appendChild(lab('gn',s.sb||'More',s.l.length,function(){fitBox.apply(null,s.bb.concat([true]))},acts(c,s)))}
    hubs.appendChild(d)})})})}
function hlOn(){}function hlOff(){}
function layout(){arrange();build();cullQ()}
/* view: wheel zoom, middle-drag / drag-background pan, pinch + one-finger pan on touch */
var MINK=.05,MAXK=40;
/* viewport culling: cards outside the screen are not painted */
var cq=0;function cullQ(){if(!cq)cq=requestAnimationFrame(cull)}
function cull(){cq=0;var k=V.k,l=-V.x/k-80,t=-V.y/k-80,r=(innerWidth-V.x)/k+80,b=(innerHeight-V.y)/k+80;
 for(var i=0;i<items.length;i++){var it=items[i],o=it.gx<l||it.gx>r||it.gy<t||it.gy>b;if(o!==it.oc){it.oc=o;it.el.classList.toggle('oc',o)}}}
function applyV(){cullQ();world.style.transform='translate('+V.x+'px,'+V.y+'px) scale('+V.k+')';
 world.style.setProperty('--hs',1);world.style.setProperty('--ss',1);world.classList.toggle('lod',V.k<.2);hideTip()}
function setView(x,y,k,anim){
 clearTimeout(setView.t);
 if(anim){world.style.transition='transform .55s cubic-bezier(.2,.8,.2,1)';setView.t=setTimeout(function(){world.style.transition=''},600)}
 else world.style.transition='';
 V.x=x;V.y=y;V.k=k;applyV()}
function zoomAt(px,py,nk){nk=Math.max(MINK,Math.min(MAXK,nk));var r=nk/V.k;setView(px-(px-V.x)*r,py-(py-V.y)*r,nk)}
function safe(){var bar=$('#bar').getBoundingClientRect(),dk=$('#dock').getBoundingClientRect();return{L:10,R:innerWidth-10,T:bar.bottom+10,B:dk.top-10}}
function fitBox(x0,y0,x1,y1,anim,mk){var a=safe(),k=Math.max(MINK,Math.min(mk||1.3,Math.min((a.R-a.L)/(x1-x0),(a.B-a.T)/(y1-y0))));moved=true;
 setView((a.L+a.R)/2-(x0+x1)/2*k,(a.T+a.B)/2-(y0+y1)/2*k,k,anim)}
function fit(anim){if(BB)fitBox(BB[0],BB[1],BB[2],BB[3],anim)}
var pan=null,tps={},pinch=null;
function beginPan(x,y,id){world.style.transition='';moved=true;pan={x:x,y:y,vx:V.x,vy:V.y,id:id};map.classList.add('pan')}
map.addEventListener('mousedown',function(e){if(e.button===1)e.preventDefault()});
map.addEventListener('auxclick',function(e){if(e.button===1)e.preventDefault()});
map.addEventListener('pointerdown',function(e){
 world.style.transition='';
 if(e.pointerType==='touch'){tps[e.pointerId]={x:e.clientX,y:e.clientY};var ids=Object.keys(tps);
  if(ids.length===2){var a=tps[ids[0]],b=tps[ids[1]];moved=true;
   pinch={d:Math.hypot(a.x-b.x,a.y-b.y)||1,k:V.k,cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,vx:V.x,vy:V.y};pan=null;
   if(st){clearTimeout(st.t);st=null}return}}
 if(e.button===1||(e.button===0&&!e.target.closest('.c,.lbw'))){e.preventDefault();beginPan(e.clientX,e.clientY,e.pointerId)}});
document.addEventListener('pointermove',function(e){
 if(tps[e.pointerId])tps[e.pointerId]={x:e.clientX,y:e.clientY};
 if(pinch){var ids=Object.keys(tps);if(ids.length>=2){var a=tps[ids[0]],b=tps[ids[1]],d=Math.hypot(a.x-b.x,a.y-b.y),cx=(a.x+b.x)/2,cy=(a.y+b.y)/2;
  var nk=Math.max(MINK,Math.min(MAXK,pinch.k*d/pinch.d)),r=nk/pinch.k;setView(cx-(pinch.cx-pinch.vx)*r,cy-(pinch.cy-pinch.vy)*r,nk)}return}
 if(pan&&e.pointerId===pan.id)setView(pan.vx+e.clientX-pan.x,pan.vy+e.clientY-pan.y,V.k)});
function endP(e){delete tps[e.pointerId];if(Object.keys(tps).length<2)pinch=null;if(pan&&e.pointerId===pan.id){pan=null;map.classList.remove('pan')}}
document.addEventListener('pointerup',endP);document.addEventListener('pointercancel',endP);
map.addEventListener('wheel',function(e){e.preventDefault();moved=true;var d=e.deltaMode===1?e.deltaY*18:e.deltaY;zoomAt(e.clientX,e.clientY,V.k*Math.exp(-d*(e.ctrlKey?.012:.0016)))},{passive:false});
map.addEventListener('dblclick',function(e){var c=e.target.closest('.c');
 if(c&&c._it&&c._it.gx!=null){var t=c._it,a=safe(),kc=Math.min((a.R-a.L)/56,(a.B-a.T)/56,MAXK);
  if(Math.abs(V.k-kc)/kc<.15)fit(true);else fitBox(t.gx-28,t.gy-28,t.gx+28,t.gy+28,true,MAXK);return}
 if(!e.target.closest('.lbw'))fit(true)});
var nc=$('#nc');if(nc)nc.addEventListener('click',function(){newCat(nc)});
$('#fit').addEventListener('click',function(){fit(true)});
var rz;addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(function(){layout();fit(false)},120)});
world.classList.add('intro');
layout();
setTimeout(function(){introOn=false;world.classList.remove('intro')},3000);

/* ---- search + lesson filter ---- */
var qi=$('#q');
var lastQ='';
function filt(doFit){var q=norm(qi.value.trim());
 items.forEach(function(i){i.m=!q||(q==='new'?i.nw:i.s.indexOf(q)>=0);i.el.classList.toggle('x',!i.m)});
 layout();if(doFit===true||q!==lastQ){lastQ=q;fit(true)}}
qi.addEventListener('input',filt);

/* ---- tap = pinyin (+ strokes on touch), hold = meaning, auto-hide ---- */
var AUTO=4000,sup=false,sortT=null;
function saveN(){var o={};items.forEach(function(i){if(i.n>0)o[i.k]=i.n});N=o;sset('mv_n',JSON.stringify(o))}
function revealed(){return grid.querySelector('.c[data-s="1"],.c[data-s="2"]')}
function trySort(){}
function hide(c){c.dataset.s=0;clearTimeout(c._ah);if(tipFor===c)hideTip();if(!canHover)hz(c,false)}
function setS(c,s){c.dataset.s=s;showTip(c,s);c.classList.remove('pop');void c.offsetWidth;c.classList.add('pop');clearTimeout(c._ah);c._ah=setTimeout(function(){hide(c);trySort()},AUTO)}
function setNew(it,v){it.nw=!!v;it.el.classList.toggle('nw',it.nw);
 if(it.u){added.forEach(function(r){if(kOf(r)===it.k)r.nw=it.nw});sset('mv_add',JSON.stringify(added))}else{ED.nw[it.k]=it.nw?1:0;saveEd()}}
function count(c){var t=c._it;t.n++;saveN();heat(t)}
function tap(c){
 if(EM){editWord(c);return}
 if(wmode){openWrite(c._it);return}
 if(+c.dataset.s){hide(c);trySort();return}
 setS(c,1);if(!canHover)hz(c,true);count(c)}
grid.addEventListener('click',function(e){if(sup)return;var c=e.target.closest('.c');if(!c)return;
 if(e.target.classList.contains('nd')){setNew(c._it,false);return}tap(c)});
grid.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){var c=e.target.closest('.c');if(c){e.preventDefault();tap(c)}}});
/* hover: one delegated listener instead of two per card */
var hov=null;
if(canHover){grid.addEventListener('pointerover',function(e){var c=e.target.closest('.c');if(c===hov)return;if(hov){hlOff();hz(hov,false)}hov=c;if(c&&!gh){hlOn(c._it);hz(c,true)}});
grid.addEventListener('pointerleave',function(){if(hov){hlOff();hz(hov,false);hov=null}})}
grid.addEventListener('animationend',function(e){if(e.animationName==='cin')e.target.classList.remove('in')});

/* ---- attention: counts are remembered, most-checked words grow and glow ---- */
function hideAll(){items.forEach(function(i){hide(i.el)})}
$('#rc').addEventListener('click',function(){if(!confirm('Reset all checked counters?'))return;items.forEach(function(i){i.n=0;heat(i)});saveN();hideAll()});

/* ---- sentence dock ---- */
var dock=[],saved=[];
try{saved=JSON.parse(sget('mv_sv')||'[]')}catch(e){saved=[]}
function chip(it){var d=document.createElement('div');d.className='chip';d._it=it;tint(d,it.c);
 var r=document.createElement('div');r.className='gr';r.appendChild(glyphs(it.h));d.appendChild(r);
 var p=document.createElement('span');p.className='cp';p.appendChild(tonify(it.p));d.appendChild(p);return d}
function phEl(){var d=document.createElement('div');d.className='ph';return d}
function renderDock(ph,ni,nn){
 cw.textContent='';
 dock.forEach(function(it,i){if(ph===i)cw.appendChild(phEl());var c=chip(it);if(ni!=null&&i>=ni&&i<ni+nn)c.classList.add('new');cw.appendChild(c)});
 if(ph===dock.length)cw.appendChild(phEl());
 box.classList.toggle('empty',!dock.length&&ph==null);clr.disabled=!dock.length;$('#sa').disabled=!dock.length}
clr.addEventListener('click',function(){dock=[];renderDock()});
cw.addEventListener('click',function(e){if(sup)return;var c=e.target.closest('.chip');if(!c)return;var i=Array.prototype.indexOf.call(cw.querySelectorAll('.chip'),c);if(i>=0){dock.splice(i,1);renderDock()}});
renderDock();
function addWords(list){var s=dock.length;list.forEach(function(it){dock.push(it)});renderDock(undefined,s,list.length);box.scrollLeft=box.scrollWidth}

/* type to add words: hanzi (IME), pinyin without tones, or English */
var sg=$('#sg'),sgl=[],sgi=-1,sgStrip=0,HANRE=/[\u3400-\u9fff]/;
function find(q){
 var qn=norm(q).replace(/[^a-z0-9]/g,'');if(!qn)return [];
 var out=[];
 items.forEach(function(i,idx){var sc=-1;
  if(i.pn===qn)sc=0;
  else if(i.ew.indexOf(qn)>=0)sc=1;
  else if(i.pn.indexOf(qn)===0)sc=2;
  else if(i.ew.some(function(w){return w.indexOf(qn)===0}))sc=3;
  else if(i.pn.indexOf(qn)>=0)sc=5;
  else if(norm(i.e).indexOf(qn)>=0)sc=6;
  if(sc>=0)out.push([sc,i.pn.length,idx,i])});
 out.sort(function(a,b){return a[0]-b[0]||a[1]-b[1]||a[2]-b[2]});
 return out.map(function(x){return x[3]})}
function hanIndex(){var m={},mx=1;items.forEach(function(i){if(!m[i.hn])m[i.hn]=i;if(i.hn.length>mx)mx=i.hn.length});return {m:m,mx:mx}}
function sgShow(list){
 sgl=list.slice(0,6);sgi=-1;sg.textContent='';
 if(!sgl.length){sg.hidden=true;return}
 sgl.forEach(function(it){var r=document.createElement('div');r.className='sgi';
  var a=document.createElement('b');a.className='zh';a.textContent=it.h;
  var p=document.createElement('span');p.textContent=it.p;
  var e=document.createElement('em');e.textContent=it.e;
  r.appendChild(a);r.appendChild(p);r.appendChild(e);
  r.addEventListener('mousedown',function(ev){ev.preventDefault()});
  r.addEventListener('click',function(){pick(it)});
  sg.appendChild(r)});
 sg.hidden=false}
function sgMark(){Array.prototype.forEach.call(sg.children,function(c,i){c.classList.toggle('on',i===sgi)})}
function suggest(){
 var v=ti.value,m=v.match(/(\S+)$/),t=m?m[1]:'';
 if(!t){sgShow([]);return}
 if(HANRE.test(t)){var r=t.match(/[\u3400-\u9fff…]+$/),run=r?r[0]:'';sgStrip=run.length;
  sgShow(run?items.filter(function(i){return i.hn.indexOf(run)===0}).sort(function(a,b){return a.hn.length-b.hn.length}):[])}
 else{sgStrip=t.length;sgShow(find(t))}}
function pick(it){ti.value=ti.value.slice(0,ti.value.length-sgStrip).replace(/\s+$/,'');addWords([it]);sgShow([]);ti.focus()}
function commit(){
 var v=ti.value.trim();if(!v)return;
 var H=hanIndex(),got=[],left=[];
 v.split(/\s+/).forEach(function(tok){
  if(HANRE.test(tok)){
   var i=0,rest='';
   while(i<tok.length){var hit=null,j=Math.min(tok.length,i+H.mx);
    for(;j>i;j--){hit=H.m[tok.slice(i,j)];if(hit)break}
    if(hit){got.push(hit);i=j}else{if(HANRE.test(tok[i]))rest+=tok[i];i++}}
   if(rest)left.push(rest)}
  else{var b=find(tok)[0];if(b)got.push(b);else left.push(tok)}});
 if(got.length)addWords(got);
 ti.value=left.join(' ');sgShow([]);
 if(left.length){ti.classList.remove('bad');void ti.offsetWidth;ti.classList.add('bad')}}
ti.addEventListener('keydown',function(e){
 if(e.isComposing||e.keyCode===229)return;
 if(e.key==='ArrowDown'&&!sg.hidden){e.preventDefault();sgi=(sgi+1)%sgl.length;sgMark()}
 else if(e.key==='ArrowUp'&&!sg.hidden){e.preventDefault();sgi=(sgi-1+sgl.length)%sgl.length;sgMark()}
 else if(e.key==='Enter'){e.preventDefault();if(!sg.hidden&&sgi>=0)pick(sgl[sgi]);else commit()}
 else if(e.key==='Backspace'&&!ti.value&&dock.length){dock.pop();renderDock()}});
ti.addEventListener('input',suggest);
ti.addEventListener('blur',function(){setTimeout(function(){sgShow([])},120)});
/* pinyin under dock words */
var dp=$('#dp');
function setDp(v){document.body.classList.toggle('dpy',v);dp.setAttribute('aria-pressed',v?'true':'false');sset('mv_dpy',v?'1':'0')}
dp.addEventListener('click',function(){setDp(!document.body.classList.contains('dpy'))});
setDp(sget('mv_dpy')==='1');
/* saved sentences */
var sv=$('#sv'),sl=$('#sl'),sa=$('#sa');
function svUpdate(){sl.hidden=!saved.length;sl.textContent='Saved '+saved.length;if(!saved.length)sv.hidden=true;sset('mv_sv',JSON.stringify(saved))}
function svRender(){
 sv.textContent='';
 saved.forEach(function(ks,idx){
  var its=ks.map(function(k){return byKey[k]}).filter(Boolean);if(!its.length)return;
  var r=document.createElement('div');r.className='sr';
  var t=document.createElement('div');t.className='t';
  var a=document.createElement('div');a.className='sh';a.textContent=its.map(function(i){return i.h}).join('');
  var b=document.createElement('div');b.className='sp2';b.textContent=its.map(function(i){return i.p}).join(' ');
  t.appendChild(a);t.appendChild(b);r.appendChild(t);
  var x=document.createElement('button');x.textContent='×';x.title='Delete';x.setAttribute('aria-label','Delete sentence');
  x.addEventListener('click',function(e){e.stopPropagation();saved.splice(idx,1);svUpdate();svRender()});
  r.addEventListener('click',function(){dock=its.slice();renderDock();sv.hidden=true});
  r.appendChild(x);sv.appendChild(r)})}
sa.addEventListener('click',function(){
 if(!dock.length)return;
 var ks=dock.map(function(i){return i.k}),key=ks.join(',');
 if(!saved.some(function(s){return s.join(',')===key})){saved.unshift(ks);svUpdate()}
 sa.textContent='✓';setTimeout(function(){sa.textContent='Save'},900)});
sl.addEventListener('click',function(){sv.hidden=!sv.hidden;if(!sv.hidden)svRender()});
svUpdate();

/* ---- drag (mouse: move; touch: hold, then move) ---- */
var st=null,gh=null,src=null,dragIt=null,fromIdx=-1,cx=0,cy=0,ox=0,oy=0,lastPh=-2,raf=0;
function overDock(){var r=$('#dock').getBoundingClientRect();return cy>=r.top&&cy<=r.bottom&&cx>=r.left&&cx<=r.right}
function insIndex(){var l=cw.querySelectorAll('.chip'),k=0;for(;k<l.length;k++){var r=l[k].getBoundingClientRect();if(cx<r.left+r.width/2)break}return k}
function put(){gh.style.transform='translate3d('+(cx-ox)+'px,'+(cy-oy)+'px,0) scale(1.06)'}
function place(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;if(gh)put()})}
function onHold(){
 if(!st||gh||wmode||EM)return;var el=st.el;st.held=true;setS(el,2);if(!canHover)hz(el,true)}
function begin(){
 var el=st.el;clearTimeout(st.t);
 if(el.classList.contains('c'))hide(el);
 var r=el.getBoundingClientRect(),sc=el.classList.contains('c')?V.k:1;ox=(cx-r.left)/sc;oy=(cy-r.top)/sc;
 gh=el.cloneNode(true);gh.classList.add('ghost');gh.classList.remove('pop','lift','in','new');gh.removeAttribute('title');gh.removeAttribute('data-h');gh.removeAttribute('data-s');
 var w=gh.querySelector('.wr');if(w)w.remove();
 gh.style.width=(r.width/sc)+'px';gh.style.height=(r.height/sc)+'px';gh.style.left='0';gh.style.top='0';document.body.appendChild(gh);
 dragIt=el._it;src=el;
 if(el.classList.contains('chip')){fromIdx=Array.prototype.indexOf.call(cw.querySelectorAll('.chip'),el);dock.splice(fromIdx,1);renderDock(fromIdx);lastPh=fromIdx;src=null}
 else{fromIdx=-1;hz(el,false);el.classList.add('lift')}
 put()}
function finish(drop){
 if(!gh)return;
 cancelAnimationFrame(raf);raf=0;
 var idx=drop&&overDock()?insIndex():-1;
 if(idx>=0)dock.splice(idx,0,dragIt);
 else if(!drop&&fromIdx>=0)dock.splice(fromIdx,0,dragIt);
 gh.remove();gh=null;if(src)src.classList.remove('lift');src=null;lastPh=-2;
 renderDock(undefined,idx>=0?idx:null,1);if(idx>=0&&idx===dock.length-1)box.scrollLeft=box.scrollWidth;
 sup=true;setTimeout(function(){sup=false},60)}
document.addEventListener('pointerdown',function(e){
 if(e.button>0||gh)return;
 var el=e.target.closest('.c,.chip');if(!el||e.target.classList.contains('nd'))return;
 cx=e.clientX;cy=e.clientY;
 st={el:el,x:cx,y:cy,touch:e.pointerType==='touch',t:null,held:false};
 if(el.classList.contains('c'))st.t=setTimeout(onHold,350);
 else if(st.touch)st.t=setTimeout(function(){if(st&&!gh)begin()},260);
 if(!st.touch)e.preventDefault()});
document.addEventListener('pointermove',function(e){
 cx=e.clientX;cy=e.clientY;
 if(!st&&!gh)return;
 if(!gh){var dx=cx-st.x,dy=cy-st.y,d2=dx*dx+dy*dy;
  if(st.touch){if(st.held){if(d2>64)begin()}else if(d2>100){clearTimeout(st.t);beginPan(st.x,st.y,e.pointerId);st=null}}
  else if(d2>25)begin();
  return}
 place();
 var ph=overDock()?insIndex():null;
 if(ph!==lastPh){lastPh=ph;renderDock(ph)}});
document.addEventListener('pointerup',function(){
 if(st){clearTimeout(st.t);if(st.held&&!gh){sup=true;setTimeout(function(){sup=false},60);count(st.el)}}
 finish(true);st=null});
document.addEventListener('pointercancel',function(){
 if(st){clearTimeout(st.t);if(st.held&&!gh)hide(st.el)}
 finish(false);st=null});
document.addEventListener('touchmove',function(e){if(gh)e.preventDefault()},{passive:false});
document.addEventListener('contextmenu',function(e){if(e.target.closest('.c,.chip'))e.preventDefault()});

/* ---- tones / write / edit ---- */
var tn=$('#tn'),am=$('#am');
var glb=$('#gl');
function setGl(v){GL=v;sset('mv_gl',v?'1':'0');document.body.classList.toggle('gp',v);glb.setAttribute('aria-pressed',v?'true':'false');build()}
glb.addEventListener('click',function(){setGl(!GL)});
document.body.classList.toggle('gp',GL);glb.setAttribute('aria-pressed',GL?'true':'false');
function setTc(v){document.body.classList.toggle('tc',v);tn.setAttribute('aria-pressed',v?'true':'false');sset('mv_tc',v?'1':'0')}
tn.addEventListener('click',function(){setTc(!document.body.classList.contains('tc'))});
setTc(sget('mv_tc')==='1');
function setW(v){wmode=v;$('#wr').setAttribute('aria-pressed',v?'true':'false');if(v&&EM)setEm(false)}
$('#wr').addEventListener('click',function(){setW(!wmode)});
function setEm(v){EM=v;document.body.classList.toggle('em',v);var b=$('#ed2');b.setAttribute('aria-pressed',v?'true':'false');b.textContent=v?'Done':'Edit';closeEd();if(v)setW(false);hideAll();am.textContent='';filt()}
$('#ed2').addEventListener('click',function(){setEm(!EM)});

/* small popover form anchored to the thing being edited */
function edOpen(el,title,fs,onSave,onDel,keep,nwOpt){
 closeEd();var d=$('#ed');d.textContent='';var h=mkEl('div','eh');h.textContent=title;d.appendChild(h);
 var ins=fs.map(function(f){var i=document.createElement('input');i.placeholder=f[0];i.value=f[1]||'';i.setAttribute('aria-label',f[0]);i.autocomplete='off';i.spellcheck=false;if(f[2])i.className='zh';d.appendChild(i);return i});
 var r=mkEl('div','er'),sb=document.createElement('button');sb.textContent='Save';r.appendChild(sb);
 if(onDel){var x=document.createElement('button');x.textContent='Delete';x.className='dg';x.addEventListener('click',function(){closeEd();onDel()});r.appendChild(x)}
 var nb=null;if(nwOpt){nb=document.createElement('button');nb.setAttribute('aria-pressed',nwOpt.v?'true':'false');nb.textContent='New';nb.title='Show the new dot';nb.addEventListener('click',function(){nwOpt.v=!nwOpt.v;nb.setAttribute('aria-pressed',nwOpt.v?'true':'false')});r.appendChild(nb)}
 var m=mkEl('span','em2');r.appendChild(m);d.appendChild(r);
 function go(){var res=onSave(ins.map(function(i){return i.value.trim()}));if(typeof res==='string'){m.textContent=res;return}
  if(keep){ins.forEach(function(i){i.value=''});ins[0].focus();m.textContent='Added ✓'}else closeEd()}
 sb.addEventListener('click',go);
 ins.forEach(function(i){i.addEventListener('keydown',function(e){if(e.isComposing||e.keyCode===229)return;if(e.key==='Enter'){e.preventDefault();go()}})});
 d.hidden=false;var q=el.getBoundingClientRect(),w=d.offsetWidth,hh=d.offsetHeight,t=q.bottom+8;if(t+hh>innerHeight-70)t=Math.max(50,q.top-hh-8);
 d.style.left=Math.max(6,Math.min(innerWidth-w-6,q.left+q.width/2-w/2))+'px';d.style.top=t+'px';ins[0].focus();return ins}
function closeEd(){$('#ed').hidden=true}
function kOf(r){return r.k||r.h.replace(/\s/g,'')+'|'+r.c}
function persist(it){var o={h:it.h,p:it.p,e:it.e,x:it.x,c:it.ck,sb:it.sb,nw:it.nw};
 if(it.u){added.forEach(function(r){if(kOf(r)===it.k)for(var q in o)r[q]=o[q]});sset('mv_add',JSON.stringify(added))}else{ED.m[it.k]=o;ED.nw[it.k]=it.nw?1:0;saveEd()}}
function mk(o){var k=o.h.replace(/\s/g,'')+'|'+o.c;if(byKey[k])return null;o.nw=true;var it=addItem(o,true);if(!it)return null;
 added.push({h:o.h,p:o.p,e:o.e,x:o.x||'',c:o.c,sb:o.sb||'',k:k,nw:true});sset('mv_add',JSON.stringify(added));it.el.classList.add('in');return it}
function rm(it){items.splice(items.indexOf(it),1);it.el.remove();delete byKey[it.k];dock=dock.filter(function(d){return d!==it});renderDock();
 if(it.u){added=added.filter(function(r){return kOf(r)!==it.k});sset('mv_add',JSON.stringify(added))}else{ED.d.push(it.k);delete ED.m[it.k];saveEd()}}
function addWordAt(t,ck,sb){
 var ins=edOpen(t,'New word',[['汉字','',1],['pinyin'],['meaning'],['example (optional)','',1]],function(v){
  if(!v[0]||!v[1]||!v[2])return '汉字, pinyin, meaning needed';
  var it=mk({h:v[0],p:v[1],e:v[2],x:v[3],c:ck,sb:sb});if(!it)return 'Already there';layout();filt()},null,true);
 ins[0].addEventListener('paste',function(e){var tx=(e.clipboardData||window.clipboardData).getData('text');if(!/[|\t\n]/.test(tx))return;e.preventDefault();
  var n=0;tx.split('\n').forEach(function(l){var o=parseLine(l,ck);if(o){o.sb=sb;if(mk(o))n++}});if(n){layout();filt()}ins[0].value='';am.textContent='Added '+n})}
function editWord(c){var it=c._it,no={v:it.nw};
 edOpen(c,'Edit word',[['汉字',it.h,1],['pinyin',it.p],['meaning',it.e],['example',it.x,1]],function(v){
  if(!v[0]||!v[1]||!v[2])return '汉字, pinyin, meaning needed';
  it.h=v[0];it.p=v[1];it.e=v[2];it.x=v[3];it.nw=no.v;idx(it);persist(it);it.el.remove();it.el=card(it);heat(it);layout();filt()},
  function(){rm(it);layout();filt()},false,no)}
function newCat(t){edOpen(t,'New category',[['Category name']],function(v){if(!v[0])return 'Name it';
 var c={k:'c'+Date.now().toString(36),n:v[0],h:Math.round(CATS.length*137.5+10)%360};CATS.push(c);ED.cx.push(c);saveEd();layout();filt(true)})}
function newGroup(t,ci){edOpen(t,'New group in '+CATS[ci].n,[['Group name']],function(v){if(!v[0])return 'Name it';ED.sx.push([CATS[ci].k,v[0]]);saveEd();layout();filt()})}
function renameCat(t,ci){var c=CATS[ci];edOpen(t,'Rename category',[['Name',c.n]],function(v){if(!v[0])return 'Name it';c.n=v[0];ED.cn[c.k]=v[0];saveEd();layout();filt()})}
function renameSub(t,ci,s){var ck=CATS[ci].k,old=s.sb;edOpen(t,'Rename group',[['Name',old]],function(v){if(!v[0])return 'Name it';
 items.forEach(function(i){if(i.c===ci&&i.sb===old){i.sb=v[0];persist(i)}});ED.sx.forEach(function(p){if(p[0]===ck&&p[1]===old)p[1]=v[0]});saveEd();layout();filt()})}
function delSub(ci,s){var ck=CATS[ci].k;if(!confirm('Delete group "'+(s.sb||'More')+'" and its '+s.l.length+' words?'))return;
 s.l.slice().forEach(rm);ED.sx=ED.sx.filter(function(p){return !(p[0]===ck&&p[1]===s.sb)});saveEd();layout();filt(true)}
function delCat(ci){var c=CATS[ci],l=items.filter(function(i){return i.c===ci});if(!confirm('Delete "'+c.n+'" and its '+l.length+' words?'))return;
 l.forEach(rm);if(ED.cx.some(function(x){return x.k===c.k}))ED.cx=ED.cx.filter(function(x){return x.k!==c.k});else ED.cd.push(c.k);
 ED.sx=ED.sx.filter(function(p){return p[0]!==c.k});CATS.splice(ci,1);items.forEach(function(i){i.c=catIdx(i.ck);tint(i.el,i.c)});saveEd();layout();filt(true)}
$('#ex').addEventListener('click',function(){var out=[];
 CATS.forEach(function(c,ci){var m={},o=[];items.filter(function(i){return i.c===ci}).forEach(function(i){if(!m[i.sb]){m[i.sb]=[];o.push(i.sb)}m[i.sb].push(i)});
  o.forEach(function(sb){out.push('['+c.k+(sb?'/'+sb:'')+']');m[sb].forEach(function(i){var a=[i.h,i.p,i.e,i.x,'new'];if(!i.nw)a.pop();if(!a[3]&&!i.nw)a.pop();out.push(a.join(' | '))});out.push('')})});
 var u=URL.createObjectURL(new Blob([out.join('\n')],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');
 a.href=u;a.download='vocab.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000);am.textContent='Saved vocab.txt'});
$('#nn').addEventListener('click',function(){items.forEach(function(i){if(i.nw)setNew(i,false)});am.textContent='Cleared'});
$('#xr').addEventListener('click',function(){if(!confirm('Discard every word, group and category you added or edited?'))return;sset('mv_add','[]');sset('mv_ed','{}');location.reload()});
document.addEventListener('pointerdown',function(e){if(!sv.hidden&&!e.target.closest('#sv,#sl'))sv.hidden=true;if(!$('#ed').hidden&&!e.target.closest('#ed,.ea,.c'))closeEd()},true);

/* ---- writing practice ---- */
var wm=$('#wm'),wq=$('#wq'),wws=[],wcur=null;
function closeWrite(){wm.hidden=true;wws.forEach(function(w){try{w.cancelQuiz()}catch(e){}});wws=[];wq.textContent=''}
function startQuiz(i){if(i>=wws.length){$('#wp').textContent='✓ '+wcur.p;return}
 wws[i]._i=i;wws[i].quiz({onComplete:function(){setTimeout(function(){startQuiz(i+1)},400)}})}
function openWrite(it){
 if(typeof HanziWriter==='undefined'){am.textContent='Writing needs the stroke library (connect once)';return}
 wcur=it;wq.textContent='';wws=[];$('#wp').textContent=it.p;$('#we').textContent=it.e;
 var cs2=Array.from(it.hn).filter(isHan),size=Math.max(70,Math.min(150,Math.floor((Math.min(innerWidth,520)-70)/Math.max(1,cs2.length))));
 cs2.forEach(function(ch){var d=document.createElement('div');d.style.width=d.style.height=size+'px';wq.appendChild(d);
  wws.push(HanziWriter.create(d,ch,{width:size,height:size,padding:6,showOutline:false,showCharacter:false,strokeColor:col('--fg'),drawingColor:col('--fg'),outlineColor:col('--gh'),highlightColor:'#3b82f6',showHintAfterMisses:2,highlightOnComplete:true,charDataLoader:function(q,ok,fail){load(q).then(ok,fail)}}))});
 wm.hidden=false;startQuiz(0)}
$('#wx').addEventListener('click',closeWrite);
wm.addEventListener('pointerdown',function(e){if(e.target===wm)closeWrite()});
$('#wa').addEventListener('click',function(){if(wcur)openWrite(wcur)});
$('#wh').addEventListener('click',function(){var i=0;wws.forEach(function(w,k){if(w._i!=null)i=k});var w=wws[i];if(!w)return;w.showOutline({duration:200});setTimeout(function(){w.hideOutline({duration:400})},1600)});

/* ---- backup / restore (progress, sentences, added words, lessons, settings) ---- */
var BK=['mv_n','mv_sv','mv_add','mv_ed','mv_dpy','mv_tc'];
$('#bk').addEventListener('click',function(){
 var d={};BK.forEach(function(k){var v=sget(k);if(v!=null)d[k]=v});
 var u=URL.createObjectURL(new Blob([JSON.stringify({v:1,d:d})],{type:'application/json'})),a=document.createElement('a');
 a.href=u;a.download='study-chinese-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},1000);am.textContent='Backup downloaded'});
$('#rt').addEventListener('click',function(){$('#rf').click()});
$('#rf').addEventListener('change',function(){
 var f=this.files[0];if(!f)return;var rd=new FileReader();
 rd.onload=function(){try{var o=JSON.parse(rd.result);if(!o||!o.d)throw 0;BK.forEach(function(k){if(typeof o.d[k]==='string')sset(k,o.d[k])});location.reload()}catch(e){am.textContent='Not a valid backup'}};
 rd.readAsText(f);this.value=''});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeWrite();closeEd();sv.hidden=true}});




fit(false);addEventListener('load',function(){if(!moved)fit(false)});
/* ---- offline (installable) ---- */
if('serviceWorker' in navigator&&/^https?:/.test(location.protocol))navigator.serviceWorker.register('sw.js').catch(function(){});
})();
