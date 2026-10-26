
const $=id=>document.getElementById(id);
const money=n=>'$'+Math.round(n).toLocaleString('ru-RU').replace(/[,\u00A0]/g,' ');

// маршрутная полоса и схема салона — статичная разметка, скрипт не нужен

// карта штатов в терминале: подсветка по кругу + наведение
(function(){
  const pins=[...document.querySelectorAll('#hmPins .hm-pin')];
  const chips=[...document.querySelectorAll('#hmStates li')];
  const ring=document.getElementById('hmRing');
  if(!pins.length||!ring) return;
  const byCode=c=>({pin:pins.find(p=>p.dataset.st===c),chip:chips.find(x=>x.dataset.st===c)});
  let cur=null,timer=null;
  function light(c){
    if(cur){const o=byCode(cur);o.pin&&o.pin.classList.remove('on');o.chip&&o.chip.classList.remove('on');}
    cur=c;
    const t=byCode(c); if(!t.pin) return;
    t.pin.classList.add('on'); t.chip&&t.chip.classList.add('on');
    ring.setAttribute('cx',t.pin.getAttribute('cx'));
    ring.setAttribute('cy',t.pin.getAttribute('cy'));
    ring.classList.add('on');
  }
  let k=0;
  const codes=pins.map(p=>p.dataset.st);
  function tick(){light(codes[k]);k=(k+1)%codes.length;}
  tick();
  // Таймеры молчат в фоновой вкладке (02.09.2026): перебирать точки и крутить табло,
  // когда страницу никто не видит, — это работа процессора и расход батареи на телефоне
  // без единого пикселя пользы. Возвращаемся к работе, как только вкладка снова активна.
  if(!matchMedia('(prefers-reduced-motion:reduce)').matches) timer=setInterval(function(){ if(!document.hidden) tick(); },2600);
  chips.forEach(ch=>{
    const pick=()=>{clearInterval(timer);light(ch.dataset.st);};
    ch.addEventListener('mouseenter',pick);
    ch.addEventListener('click',pick);
  });
})();

// прогресс, шапка, лента этапов, док
const stages=[...document.querySelectorAll('.stage')];

// ПОКАЗ СОДЕРЖИМОГО — первым делом (31.08.2026).
// Раньше эта строка стояла ПОСЛЕ onScroll(); любая ошибка там (нет элемента, старый
// браузер) оставляла страницу навсегда пустой. Теперь показ идёт первым, а всё
// остальное — оформление, которое может отвалиться без последствий для читаемости.
// ПОЧЕМУ НЕ threshold (02.09.2026). Здесь стояло {threshold:.18} — «показать этап, когда
// видно 18 % его площади». Доля считается от высоты САМОГО этапа, а не экрана, поэтому
// у высокого этапа она упирается в потолок: экран 460 px против блока «Прибытие» в
// 2800 px — это максимум 16 %, порог недостижим, и блок оставался невидимым навсегда.
// Так и вышло, когда лента превратилась в стену из двенадцати кадров: на невысоком окне
// человек видел пустое место. Теперь условие не зависит от высоты блока — этап оживает,
// когда попадает в средние 76 % экрана.
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting) e.target.classList.add('live');}),{threshold:0, rootMargin:'-12% 0px -12% 0px'});
stages.forEach(s=>io.observe(s));
// Сторож: наблюдатель мог не сработать (старый браузер, встроенный вебвью). Через 2,5
// секунды проверяем — если не ожил НИ ОДИН этап, показываем всё принудительно. Условие
// важно: без него сторож показывал бы разом всю страницу и убивал постепенное появление.
setTimeout(()=>{ if(!document.querySelector('.stage.live')) stages.forEach(s=>s.classList.add('live')); },2500);

const railLinks=[...document.querySelectorAll('.rail a')];
const hd=$('hd'),dock=$('dock'),prog=$('progress'),mpCount=$('mpCount');
function onScroll(){
  const h=document.body.scrollHeight-innerHeight;
  prog.style.width=(scrollY/h*100)+'%';
  let cur=0;
  stages.forEach((s,i)=>{const r=s.getBoundingClientRect(); if(r.top<=innerHeight*.45) cur=i;});
  railLinks.forEach((a,i)=>{a.classList.toggle('on',i===cur);a.classList.toggle('done',i<cur);});
  if(mpCount) mpCount.textContent=Math.min(cur+1,railLinks.length-1)+' / '+(railLinks.length-1);
  const dark=stages[cur].classList.contains('dark');
  hd.classList.toggle('on-dark',dark);
  document.body.classList.toggle('dark-zone',dark);
  const last=stages[stages.length-1].getBoundingClientRect().top;
  dock.classList.toggle('on',scrollY>innerHeight*.8&&last>innerHeight*.7);
}
addEventListener('scroll',onScroll,{passive:true});
try{ onScroll(); }catch(e){ console.warn('onScroll:', e); }


// табло вылетов
const DEST=['MYRTLE BEACH  SC','OCEAN CITY  MD','VIRGINIA BEACH VA','NIAGARA FALLS  NY','GRAND CANYON  AZ'];
const CH='ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
const LEN=Math.max(...DEST.map(d=>d.length));
const fbd=$('fbd');
const cells=Array.from({length:LEN},()=>{const d=document.createElement('div');d.className='flap';d.textContent=' ';fbd.appendChild(d);return d;});
let di=0;
function setBoard(text){
  cells.forEach((c,i)=>{
    const target=(text[i]||' ').toUpperCase();
    if(c.textContent===target) return;
    let steps=4+Math.floor(Math.random()*4),n=0;
    const tick=setInterval(()=>{
      n++;
      c.textContent=n>=steps?target:CH[Math.floor(Math.random()*CH.length)];
      c.classList.remove('turn'); void c.offsetWidth; c.classList.add('turn');
      if(n>=steps) clearInterval(tick);
    },70+i*6);
  });
}
setBoard(DEST[0]);
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)
  setInterval(()=>{ if(document.hidden) return; di=(di+1)%DEST.length; setBoard(DEST[di]); },4600);

// карта: самолёт летит к выбранной вакансии
const SPOTS=[
 {x:872,y:322,city:'MARYLAND',route:'KAZ → MARYLAND · WT 115',note:'Lifeguard / Pool Operator · $16.25 в час · жильё $160 в неделю',
 },
 {x:848,y:398,city:'MYRTLE BEACH, SC',route:'KAZ → SOUTH CAROLINA · WT 240',note:'Food Lion Retail · $15.00 в час · жильё $150 в неделю',
 },
 {x:770,y:296,city:'OHIO',route:'KAZ → OHIO · WT 318',note:'Ride Operator · $14.00 в час · жильё $100 в неделю',
 },
 {x:860,y:372,city:'ATLANTIC BEACH, NC',route:'KAZ → NORTH CAROLINA · WT 402',note:'Beach Store · $13.00 в час · жильё $150 в неделю',
 }
];
let curSpot=0;
const routeEl=document.getElementById('usroute'), planeEl=document.getElementById('planeg'),
      landEl=document.getElementById('landing'), cityEl=document.getElementById('cityLabel');
let flyRaf;
function flyTo(i){
  const t=SPOTS[i]; curSpot=i;
  document.getElementById('mhRoute').textContent=t.route;
  document.getElementById('mapNote').textContent=t.note;
  const d='M20 600 C 220 470, 430 150, 640 190 C 730 208, '+(t.x-70)+' '+(t.y-60)+', '+t.x+' '+t.y;
  routeEl.setAttribute('d',d);
  const len=routeEl.getTotalLength();
  routeEl.style.transition='none';
  routeEl.style.strokeDasharray=len; routeEl.style.strokeDashoffset=len;
  landEl.setAttribute('opacity','0'); cityEl.setAttribute('opacity','0');
  cityEl.textContent=t.city;
  const right=t.x>620;
  cityEl.setAttribute('text-anchor',right?'end':'start');
  cityEl.setAttribute('x',right?t.x-18:t.x+18);
  cityEl.setAttribute('y',t.y-24);
  landEl.setAttribute('transform','translate('+t.x+','+t.y+')');
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){
    routeEl.style.strokeDashoffset=0; planeEl.setAttribute('opacity','0');
    landEl.setAttribute('opacity','1'); cityEl.setAttribute('opacity','1'); return;
  }
  requestAnimationFrame(()=>{routeEl.style.transition='stroke-dashoffset 2.6s cubic-bezier(.4,0,.3,1)';routeEl.style.strokeDashoffset=0;});
  cancelAnimationFrame(flyRaf);
  planeEl.setAttribute('opacity','1');
  const t0=performance.now(), dur=2600;
  const step=now=>{
    const p=Math.min(1,(now-t0)/dur);
    const pt=routeEl.getPointAtLength(len*p);
    const pt2=routeEl.getPointAtLength(Math.min(len,len*p+2));
    const ang=Math.atan2(pt2.y-pt.y,pt2.x-pt.x)*180/Math.PI;
    const sc=1-0.45*Math.max(0,(p-0.75)/0.25);
    planeEl.setAttribute('transform','translate('+pt.x+','+pt.y+') rotate('+ang+') scale('+sc.toFixed(3)+')');
    if(p<1){flyRaf=requestAnimationFrame(step);}
    else{
      planeEl.setAttribute('opacity','0');
      landEl.setAttribute('opacity','1');
      cityEl.setAttribute('opacity','1');
      cityEl.animate([{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],{duration:420,easing:'ease-out'});
    }
  };
  flyRaf=requestAnimationFrame(step);
}

// табло рейсов
const FL=[
 {n:'WT 115 · Lifeguard',ot:'$24.38 / час',bonus:'$500 за сезон',eng:'Средний+',where:'На воздухе, у бассейна',
  note:'самый дорогой овертайм и единственный бонус за полный сезон. Но и жильё самое дорогое — $160 в неделю, зато вернувшимся на следующий год платят больше.'},
 {n:'WT 240 · Food Lion Retail',ot:'по графику магазина',bonus:'нет',eng:'Уверенный разговорный',where:'В помещении, магазин у океана',
  note:'та же ставка $15, что и у лайфгарда, но без бонуса. Зато работа в помещении и постоянное общение с покупателями — язык прокачивается быстрее всего.'},
 {n:'WT 318 · Ride Operator',ot:'$21.00 / час',bonus:'нет',eng:'Базовый разговорный',where:'Парк развлечений, смены включая выходные',
  note:'ставка ниже, но жильё всего $100 в неделю — за сезон это экономит $600–700 против других позиций, поэтому на руки часто выходит не меньше.'},
 {n:'WT 402 · Beach Store',ot:'есть, по графику',bonus:'нет',eng:'Базовый разговорный',where:'Пляжный магазин у океана',
  note:'самая низкая ставка и спокойный темп. Берут ради локации: океан в двух шагах и меньше нагрузки, чем в парке или на бассейне.'}
];
document.querySelectorAll('.ocard').forEach(row=>row.addEventListener('click',()=>{
  document.querySelectorAll('.ocard').forEach(r=>{
    r.classList.toggle('sel',r===row);
    r.querySelector('.st').textContent=r===row?'Boarding':'On time';
  });
  const j=+row.dataset.j;
  ji=j;
  document.querySelectorAll('#jobseg button').forEach(x=>x.setAttribute('aria-pressed',+x.dataset.j===j));
  calc();
  const d=FL[j];
  flyTo(j);
  $('fpickName').textContent=d.n;
  $('fd-ot').textContent=d.ot; $('fd-bonus').textContent=d.bonus;
  $('fd-eng').textContent=d.eng; $('fd-where').textContent=d.where; $('fd-note').textContent=d.note;
  const p=$('fdetail');
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches)
    p.animate([{transform:'scale(1)'},{transform:'scale(1.02)'},{transform:'scale(1)'}],{duration:340,easing:'ease-out'});
}));

$('fd-note').textContent=FL[0].note;
// первый полёт — когда этап появляется в кадре
const mio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){mio.disconnect();setTimeout(()=>flyTo(0),500);}}),{threshold:.25});
mio.observe(document.getElementById('mapwrap'));

// Стена талонов скрипта не требует. Раньше здесь лежал код багажной ленты: он дублировал
// разметку ради бесшовного цикла и принудительно снимал loading="lazy" со всех картинок —
// то есть блок тянул все кадры сразу. Теперь картинки грузятся сами, по мере прокрутки.

// плавный пересчёт суммы
let netRaf;
function countTo(el,val){
  cancelAnimationFrame(netRaf);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){el.textContent=money(val);el.dataset.v=val;return;}
  const from=+(el.dataset.v||val),t0=performance.now();
  const go=t=>{const p=Math.min(1,(t-t0)/450),e=1-Math.pow(1-p,3);
    el.textContent=money(from+(val-from)*e);
    if(p<1) netRaf=requestAnimationFrame(go); else el.dataset.v=val;};
  netRaf=requestAnimationFrame(go);
}

// калькулятор
let KZT_RATE=null; // курс подтягивается с открытого API; нет курса — строка в тенге не показывается
(()=>{const go=()=>fetch('https://open.er-api.com/v6/latest/USD')
  .then(r=>r.json()).then(d=>{const v=d&&d.rates&&d.rates.KZT;
    if(v>100&&v<3000){KZT_RATE=v; if(typeof calc==='function') calc();}})
  .catch(()=>{});
  ('requestIdleCallback' in window)?requestIdleCallback(go,{timeout:4000}):setTimeout(go,2500);})();
const JOBS=[
 {n:'Lifeguard / Pool Operator',rate:16.25,house:160,bonus:500},
 {n:'Food Lion — Retail Associate',rate:15,house:150,bonus:0},
 {n:'Ride Operator',rate:14,house:100,bonus:0},
 {n:'Beach Store Associate',rate:13,house:150,bonus:0},
 {n:'Официант / Server',rate:7.25,house:150,bonus:0,tips:6}
];
let ji=0;
function calc(){
  const j=JOBS[ji],h=+$('hours').value,w=+$('weeks').value;
  const isTip=j.tips!==undefined;
  const tf=$('tipFld'); if(tf) tf.hidden=!isTip;
  const tr=$('tipRow'); if(tr) tr.hidden=!isTip;
  const tipRate=isTip?Math.max(0,+$('tips').value||0):0;
  const tips=tipRate*h*w;
  if(isTip&&$('v-tips')) $('v-tips').textContent=tipRate;
  const hw=Math.max(0,+$('house').value||0);
  const base=Math.min(h,40)*j.rate*w,over=Math.max(0,h-40)*j.rate*1.5*w,house=hw*w;
  $('v-hours').textContent=h; $('v-weeks').textContent=w;
  if($('v-house')) $('v-house').textContent=hw;
  $('v-job').textContent=j.n.split(' ')[0];
  $('r-job').textContent=j.n;
  $('r-base').textContent=money(base);
  $('r-over').textContent=over?money(over):'—';
  if($('r-tips')) $('r-tips').textContent=tips?money(tips):'—';
  $('r-bonus').textContent=j.bonus?money(j.bonus):'—';
  $('r-house').textContent='−'+money(house);
  const net=base+over+tips+j.bonus-house;
  countTo($('r-net'),net);
  const kz=$('r-kzt');
  if(kz){ if(!KZT_RATE){kz.hidden=true;} else {
    const mln=net*KZT_RATE/1e6;
    kz.textContent='≈ '+(mln>=10?Math.round(mln):mln.toFixed(1)).toString().replace('.',',')+' млн ₸';
    kz.hidden=false; } }
  const lg=JOBS[0], lgNet=Math.min(h,40)*lg.rate*w+Math.max(0,h-40)*lg.rate*1.5*w+lg.bonus-hw*w;
  const cmp=$('dpCmp');
  if(cmp){const show=ji!==0&&lgNet>net; cmp.hidden=!show;
    if(show) $('r-lg').textContent=money(lgNet)+'  (+'+money(lgNet-net)+')';}
}
$('jobseg').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  ji=+b.dataset.j; if($('house')) $('house').value=JOBS[ji].house;
  $('jobseg').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',x===b));
  calc();
});
function fillRange(el){const p=(el.value-el.min)/(el.max-el.min)*100;el.style.setProperty('--p',p+'%');}
['house','tips'].forEach(k=>{const el=$(k); if(el) el.addEventListener('input',calc);});
['hours','weeks'].forEach(k=>{const el=$(k);fillRange(el);el.addEventListener('input',()=>{fillRange(el);calc();});});
calc();
(()=>{const box=$('gate5'); if(!box) return;
  const fire=()=>{if(window.ymGoal) window.ymGoal('calc');};
  box.addEventListener('input',fire,{once:true});
  box.addEventListener('click',e=>{if(e.target.closest('#jobseg button')) fire();},{once:true});
})();

// чек-ин
const QZ=[
 {q:'Вы студент очного отделения?',a:[['Да',1],['Нет',0]]},
 {q:'Это не выпускной курс и не магистратура?',a:[['Верно',1],['Выпускной / магистратура',0]]},
 {q:'Вам есть 18 лет?',a:[['Да',1],['Пока нет',0]]},
 {q:'Сможете объясниться по-английски на работе?',a:[['Говорю уверенно',1],['Средний уровень',1],['Почти не говорю',0]]},
 {q:'Сессия заканчивается до 15 июня?',a:[['Да',1],['Позже',0],['Пока не знаю',1]]}
];
let qi=0,qs=0;
function qR(){
  $('q-count').textContent='Вопрос '+(qi+1)+' из '+QZ.length;
  $('q-fill').style.width=(qi/QZ.length*100+20)+'%';
  $('q-text').textContent=QZ[qi].q;
  const box=$('q-opts'); box.innerHTML='';
  QZ[qi].a.forEach(([l,v])=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=l;
    b.onclick=()=>{qs+=v;qi++;qi<QZ.length?qR():qF();};
    box.appendChild(b);
  });
}
function qF(){
  if(window.ymGoal) window.ymGoal('quiz');
  $('q-body').hidden=true; $('q-result').hidden=false;
  $('q-fill').style.width='100%'; $('q-count').textContent='Результат';
  const ok=qs===QZ.length;
  const st=$('q-stamp'), pg=$('ppage');
  $('vs-main').textContent=ok?'J-1 · Approved':'J-1 · Pending';
  $('vs-date').textContent=new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
  st.className='visastamp'+(ok?'':' no');
  pg.classList.remove('hit'); void pg.offsetWidth;
  requestAnimationFrame(()=>{st.classList.add('go');pg.classList.add('hit');});
  $('q-title').textContent=ok?'Вам подходит участие в сезоне 2027':'Ваш случай разберём индивидуально';
  $('q-desc').textContent=ok
   ?'По формальным требованиям всё сходится. Остаётся выбрать вакансию и занять место в квоте сезона — покажем актуальные позиции под ваши даты.'
   :'Один пункт требует уточнения — и это нормально: даты сессии часто удаётся сверить с работодателем, а английский подтянуть до интервью. Разберём вашу ситуацию и подберём вариант.';
  $('q-cta').textContent=ok?'Занять место в сезоне':'Подобрать вариант';
}
$('q-again').onclick=()=>{qi=0;qs=0;$('q-stamp').className='visastamp';$('q-body').hidden=false;$('q-result').hidden=true;qR();};
qR();

// паспортный контроль
const VIS=[
 ['Пошагово заполняем анкету DS‑160','Большинство отказов начинается не на интервью, а в анкете: опечатка в датах, неверно указанная работа, несовпадение с формой DS-2019. Заполняем её вместе с вами и проверяем перед отправкой.'],
 ['Даём список реальных вопросов на визу J-1','Не абстрактные «расскажите о себе», а формулировки, которые звучат в посольстве по программе J-1: о вузе, о работе, о планах после возвращения.'],
 ['Проводим репетиции интервью','Сначала в группе — чтобы увидеть, как отвечают другие. Потом один на один: вопросы в темпе собеседования и разбор каждого ответа.'],
 ['Разбираем стратегию поведения','Как держаться, что делать с волнением, какие документы держать в руках и как отвечать, если вопрос застал врасплох.']
];
VIS.forEach((_,i)=>{const d=document.createElement('i');if(!i)d.className='on';$('dots').appendChild(d);});
$('vsteps').addEventListener('click',e=>{
  const b=e.target.closest('.vstep'); if(!b) return;
  const i=+b.dataset.i;
  document.querySelectorAll('.vstep').forEach(x=>x.classList.toggle('on',x===b));
  document.querySelectorAll('#dots i').forEach((d,n)=>d.classList.toggle('on',n===i));
  $('v-title').textContent=VIS[i][0]; $('v-text').textContent=VIS[i][1];
});

// полосы одобрения
const bio=new IntersectionObserver(es=>es.forEach(e=>{
  if(!e.isIntersecting) return; bio.unobserve(e.target);
  e.target.querySelectorAll('.track i').forEach(i=>i.style.width=i.dataset.w+'%');
}),{threshold:.4});
bio.observe($('approve'));

// спонсоры
const SP={
 ciee:{t:'CIEE — Council on International Educational Exchange',
  d:'Некоммерческая организация из США, один из старейших операторов международных обменных программ. Основана в 1947 году, штаб-квартира — Портленд, штат Мэн.',
  l:['Официальный спонсор Work and Travel USA','Оформляет форму DS-2019 — без неё не выдают визу J-1','Медицинская страховка на весь период','Ежемесячный check-in и помощь при проблемах']},
 aag:{t:'Alliance Abroad Group',
  d:'Американская компания из Остина, штат Техас. Работает с программами культурного обмена с 1992 года, подбирает работодателей и сопровождает участников в США.',
  l:['Официальный спонсор Work and Travel USA','Проверяет работодателей и условия вакансий','Страховка и поддержка на английском','Помогает решить вопросы на месте']}
};
const spm=$('spmodal');
document.querySelectorAll('.splogos button').forEach(b=>b.addEventListener('click',()=>{
  const d=SP[b.dataset.sp];
  $('sp-logo').src=b.querySelector('img').src; $('sp-logo').alt=b.querySelector('img').alt;
  $('sp-title').textContent=d.t; $('sp-text').textContent=d.d;
  $('sp-list').innerHTML=d.l.map(x=>'<li>'+x+'</li>').join('');
  spm.classList.add('on');
}));
$('sp-close').onclick=()=>spm.classList.remove('on');
spm.addEventListener('click',e=>{if(e.target===spm)spm.classList.remove('on');});
addEventListener('keydown',e=>{if(e.key==='Escape')spm.classList.remove('on');});

// ---------- WhatsApp: короткое приветствие во всех кнопках ----------
(()=>{
  const url='https://wa.me/77714064549?text='+encodeURIComponent(
    'Здравствуйте! Хочу получить консультацию по Work and Travel USA, сезон 2027.');
  document.querySelectorAll('a[href*="wa.me"]').forEach(a=>a.href=url);
})();

// ---------- посадочный талон картинкой ----------
const NAVY='#0B1B3A', BLUE='#1B3D8F', RED='#FF4438', GOLD='#FFB020', PAPER='#FFFDF9';
function rr(x,rx,ry,w,h,r){x.beginPath();x.moveTo(rx+r,ry);x.arcTo(rx+w,ry,rx+w,ry+h,r);
  x.arcTo(rx+w,ry+h,rx,ry+h,r);x.arcTo(rx,ry+h,rx,ry,r);x.arcTo(rx,ry,rx+w,ry,r);x.closePath();}
function loadImg(src){return new Promise(r=>{if(!src)return r(null);const i=new Image();
  i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src;});}
function grain(x,ox,oy,w,h,n,alpha){
  for(let i=0;i<n;i++){x.fillStyle='rgba(11,27,58,'+(Math.random()*alpha).toFixed(3)+')';
    x.fillRect(ox+Math.random()*w,oy+Math.random()*h,1.6,1.6);}
}
function fitText(x,text,max,start,min){let f=start;x.font='700 '+f+'px "JetBrains Mono",monospace';
  while(x.measureText(text).width>max&&f>min){f-=1;x.font='700 '+f+'px "JetBrains Mono",monospace';}return f;}

function drawCard(x,ox,oy,W,H,d,A){
  const stubX=ox+W-330, HDR=112;
  x.save();rr(x,ox,oy,W,H,38);x.clip();
  // бумага с фактурой
  const g=x.createLinearGradient(ox,oy,ox+W,oy+H);
  g.addColorStop(0,'#FFFEFC');g.addColorStop(.55,'#F7F2E7');g.addColorStop(1,'#FFFDF8');
  x.fillStyle=g;x.fillRect(ox,oy,W,H);
  grain(x,ox,oy,W,H,2600,.05);
  // водяной знак — статуя
  if(A.statue){x.save();x.globalAlpha=.10;
    const sh=H*1.15, sw=A.statue.width/A.statue.height*sh;
    x.drawImage(A.statue,ox+W-stubX+40,oy+H-sh+40,sw,sh);x.restore();}
  // шапка
  const gh=x.createLinearGradient(ox,oy,ox+W,oy+HDR);gh.addColorStop(0,NAVY);gh.addColorStop(1,BLUE);
  x.fillStyle=gh;x.fillRect(ox,oy,W,HDR);
  x.save();x.globalAlpha=.14;
  for(let i=-HDR;i<W;i+=26){x.fillStyle='#fff';x.beginPath();x.moveTo(ox+i,oy+HDR);
    x.lineTo(ox+i+HDR,oy);x.lineTo(ox+i+HDR+9,oy);x.lineTo(ox+i+9,oy+HDR);x.fill();}
  x.restore();
  // логотип на белой плашке
  if(A.logo){x.fillStyle='#fff';rr(x,ox+26,oy+20,72,72,18);x.fill();
    x.drawImage(A.logo,ox+32,oy+26,60,60);}
  x.fillStyle='#fff';x.font='800 30px Unbounded,Oswald,sans-serif';
  x.fillText('BOARDING PASS',ox+(A.logo?118:26),oy+52);
  x.font='400 17px "JetBrains Mono",monospace';x.fillStyle='rgba(255,255,255,.62)';
  x.fillText('SUMMER WORK & TRAVEL USA',ox+(A.logo?120:26),oy+80);
  x.textAlign='right';x.fillStyle=GOLD;x.font='700 19px "JetBrains Mono",monospace';
  x.fillText('SEASON 2027',ox+W-30,oy+58);x.font='400 15px "JetBrains Mono",monospace';
  x.fillStyle='rgba(255,255,255,.55)';x.fillText('GLOBUS EXCHANGE · ALMATY',ox+W-30,oy+82);x.textAlign='left';
  // флажковая полоска
  x.fillStyle=RED;x.fillRect(ox,oy+HDR,W*.34,7);
  x.fillStyle='#fff';x.fillRect(ox+W*.34,oy+HDR,W*.32,7);
  x.fillStyle=BLUE;x.fillRect(ox+W*.66,oy+HDR,W*.34,7);
  // маршрут крупно
  x.fillStyle='rgba(11,27,58,.45)';x.font='400 15px "JetBrains Mono",monospace';
  x.fillText('FROM',ox+34,oy+168);x.fillText('TO',ox+250,oy+168);
  x.fillStyle=NAVY;x.font='800 58px Unbounded,Oswald,sans-serif';
  x.fillText('KAZ',ox+34,oy+222);x.fillText('USA',ox+250,oy+222);
  // самолётик между
  x.save();x.translate(ox+186,oy+205);x.fillStyle=RED;
  x.beginPath();x.moveTo(-16,-9);x.lineTo(18,0);x.lineTo(-16,9);x.lineTo(-9,0);x.closePath();x.fill();x.restore();
  x.strokeStyle='rgba(11,27,58,.25)';x.setLineDash([5,7]);x.lineWidth=2;
  x.beginPath();x.moveTo(ox+150,oy+205);x.lineTo(ox+240,oy+205);x.stroke();x.setLineDash([]);
  // поля
  const field=(l,v,px,py,mw)=>{x.fillStyle='rgba(11,27,58,.45)';x.font='400 15px "JetBrains Mono",monospace';x.fillText(l,px,py);
    x.fillStyle=NAVY;const fs=fitText(x,v,mw||250,27,15);x.fillText(v,px,py+fs+8);return fs;};
  field('PASSENGER',(d.name||'STUDENT').toUpperCase().slice(0,20),ox+34,oy+286,420);
  field('FLIGHT','WT-2027',ox+34,oy+372,180);
  field('VISA','J-1',ox+250,oy+372,120);
  field('SEASON','08 MAY — 01 SEP',ox+404,oy+372,300);
  field('POSITION',(d.job||'—').toUpperCase(),ox+34,oy+458,620);
  // штамп
  x.save();x.translate(ox+W-560,oy+H-58);x.rotate(-.14);x.globalAlpha=.92;
  x.strokeStyle=RED;x.lineWidth=5;rr(x,-16,-52,300,84,16);x.stroke();
  x.fillStyle=RED;x.font='800 40px Unbounded,Oswald,sans-serif';x.fillText('CHECKED IN',0,-8);
  x.font='400 15px "JetBrains Mono",monospace';x.fillText('SEAT 27A · GATE A1',2,16);x.restore();
  // линия отрыва + вырубки
  x.strokeStyle='rgba(11,27,58,.35)';x.setLineDash([11,13]);x.lineWidth=2.5;
  x.beginPath();x.moveTo(stubX,oy);x.lineTo(stubX,oy+H);x.stroke();x.setLineDash([]);
  x.fillStyle=PAPER;x.beginPath();x.arc(stubX,oy,17,0,7);x.fill();
  x.beginPath();x.arc(stubX,oy+H,17,0,7);x.fill();
  // корешок
  x.fillStyle='rgba(11,27,58,.45)';x.font='400 15px "JetBrains Mono",monospace';x.fillText('SEAT',stubX+40,oy+168);
  x.fillStyle=NAVY;x.font='800 86px Unbounded,Oswald,sans-serif';x.fillText('27A',stubX+40,oy+240);
  let bx=stubX+40;
  for(let i=0;i<32;i++){const w=2+Math.random()*5;x.fillStyle=NAVY;x.fillRect(bx,oy+286,w,96);bx+=w+4;}
  x.fillStyle='rgba(11,27,58,.5)';x.font='400 14px "JetBrains Mono",monospace';
  x.fillText('WT2027 '+Math.random().toString().slice(2,10),stubX+40,oy+400);
  x.fillStyle=NAVY;x.font='700 16px "JetBrains Mono",monospace';
  x.fillText('@globus_exchange_',stubX+40,oy+H-58);
  x.fillStyle='rgba(11,27,58,.55)';x.font='400 15px "JetBrains Mono",monospace';
  x.fillText('+7 771 406-45-49',stubX+40,oy+H-32);
  x.restore();
  // тень карточки
  x.save();x.shadowColor='rgba(11,27,58,.35)';x.shadowBlur=40;x.shadowOffsetY=18;
  x.strokeStyle='rgba(11,27,58,.08)';x.lineWidth=2;rr(x,ox,oy,W,H,38);x.stroke();x.restore();
}

async function makePass(mode,name,job){
  const [logo,statue,photo]=await Promise.all([
    loadImg((document.querySelector('.logo img')||{}).src),
    loadImg((document.querySelector('.usdeco.statue')||{}).src),
    loadImg((document.querySelector('.snap img')||document.querySelector('.g-pics img')||{}).src)
  ]);
  const A={logo,statue,photo}, d={name,job};
  const c=document.createElement('canvas'), x=c.getContext('2d');
  const S=2;
  if(mode==='wide'){
    c.width=1280*S;c.height=620*S;x.scale(S,S);
    const bg=x.createLinearGradient(0,0,1280,620);bg.addColorStop(0,'#EEF1F8');bg.addColorStop(1,'#DCE3F2');
    x.fillStyle=bg;x.fillRect(0,0,1280,620);
    drawCard(x,40,50,1200,520,d,A);
  }else{
    c.width=1080*S;c.height=1920*S;x.scale(S,S);
    const bg=x.createLinearGradient(0,0,1080,1920);bg.addColorStop(0,'#16307A');bg.addColorStop(.55,NAVY);bg.addColorStop(1,'#07132A');
    x.fillStyle=bg;x.fillRect(0,0,1080,1920);
    for(let i=0;i<120;i++){x.fillStyle='rgba(255,255,255,'+(0.08+Math.random()*0.5).toFixed(2)+')';
      x.beginPath();x.arc(Math.random()*1080,Math.random()*1920,Math.random()*2.6,0,7);x.fill();}
    // фото сверху
    if(photo){x.save();rr(x,0,0,1080,760,0);x.clip();
      const r=Math.max(1080/photo.width,760/photo.height);
      x.drawImage(photo,(1080-photo.width*r)/2,(760-photo.height*r)/2,photo.width*r,photo.height*r);
      const gr=x.createLinearGradient(0,300,0,760);gr.addColorStop(0,'rgba(11,27,58,0)');gr.addColorStop(1,NAVY);
      x.fillStyle=gr;x.fillRect(0,300,1080,460);x.restore();}
    x.fillStyle=GOLD;x.font='400 26px "JetBrains Mono",monospace';
    x.fillText('GLOBUS EXCHANGE · WORK & TRAVEL USA',72,700);
    x.fillStyle='#fff';x.font='800 104px Unbounded,Oswald,sans-serif';x.fillText('ЛЕТО В США',72,820);
    x.fillStyle=RED;x.font='800 104px Unbounded,Oswald,sans-serif';x.fillText('2027',72,930);
    x.save();x.translate(60,1030);x.scale(.8,.8);drawCard(x,0,0,1200,520,d,A);x.restore();
    x.fillStyle='#fff';x.font='700 40px Unbounded,Oswald,sans-serif';
    x.fillText('Я в списке на рейс WT-2027',72,1560);
    x.fillStyle='rgba(255,255,255,.6)';x.font='400 26px "JetBrains Mono",monospace';
    x.fillText('@globus_exchange_ · Алматы и Астана',72,1610);
    x.fillStyle=GOLD;x.fillRect(72,1650,120,6);
  }
  return c.toDataURL('image/jpeg',0.94);
}
document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-pass]'); if(!btn) return;
  const old=btn.textContent; btn.textContent='Рисуем талон…';
  const name=(document.getElementById('n-name')||{}).value||'STUDENT';
  const job=(document.getElementById('n-vac')||{}).value||JOBS[ji].n;
  const url=await makePass(btn.dataset.pass,name,job);
  const a=document.createElement('a');
  a.href=url;a.download='boarding-pass-wt2027-'+btn.dataset.pass+'.jpg';a.click();
  btn.textContent=old;
});

// переключатель языка: казахская версия ещё готовится
// ---------- переключатель языка RU / KZ / EN ----------
// ЗАЧЕМ ПЕРЕПИСАНО (31.08.2026). Здесь стоял обработчик, который показывал плашку
// «Қазақша · скоро». Он не работал НИ РАЗУ: начинался с проверки на элемент #langtip,
// а такого элемента в разметке нет — обработчик молча выходил на первой строке, и
// нажатия на KZ и EN не делали вообще ничего. Ошибки в консоли при этом не было,
// поэтому дефект и не замечали. При этом переводы давно готовы и лежат рядом:
// i18n-kz.js и i18n-en.js, по 438 строк каждый, но подключение к странице потерялось.
//
// КАК УСТРОЕНО. Словарь — плоские пары «русская строка → перевод». Проходим по текстовым
// узлам, у совпавших подменяем текст. Оригинал каждого узла запоминаем, поэтому возврат
// на русский точный, а не «перевод перевода». Числа и цены в словаре отсутствуют — они
// остаются как есть, и правка цен на сайте не ломает переводы.
(()=>{
  const box=$('lang'); if(!box) return;
  const V='20261026a';
  const SRC={kz:'i18n-kz.js?v='+V, en:'i18n-en.js?v='+V};
  const оригиналы=new Map();   // узел -> исходный русский текст
  const атрибуты=[['title'],['alt'],['placeholder'],['aria-label']];
  let текущий='ru', занят=false;

  // Собираем текстовые узлы один раз. Пропускаем служебные теги и динамику
  // (табло вылетов, счётчики) — их содержимое переводить нечего и опасно.
  function узлы(){
    const пропустить=new Set(['SCRIPT','STYLE','NOSCRIPT','svg','SVG']);
    const w=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT,{
      acceptNode(n){
        if(!n.nodeValue||!n.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const p=n.parentElement; if(!p) return NodeFilter.FILTER_REJECT;
        if(пропустить.has(p.tagName)) return NodeFilter.FILTER_REJECT;
        if(p.closest('#fbd,.flap,.dotmap')) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }});
    const out=[]; let n; while((n=w.nextNode())) out.push(n); return out;
  }

  function применить(словарь){
    for(const n of узлы()){
      if(!оригиналы.has(n)) оригиналы.set(n,n.nodeValue);
      const исходный=оригиналы.get(n);
      const ключ=исходный.trim();
      if(!словарь){ n.nodeValue=исходный; continue; }
      const перевод=словарь[ключ];
      if(перевод) n.nodeValue=исходный.replace(ключ,перевод);
      else n.nodeValue=исходный;
    }
    for(const [имя] of атрибуты){
      document.querySelectorAll('['+имя+']').forEach(el=>{
        const key='__i18n_'+имя;
        if(el[key]===undefined) el[key]=el.getAttribute(имя);
        const исходный=el[key];
        el.setAttribute(имя, (словарь && словарь[исходный]) || исходный);
      });
    }
    const заголовок=document.querySelector('title');
    if(заголовок){
      if(заголовок.__i18n===undefined) заголовок.__i18n=document.title;
      document.title=(словарь && словарь[заголовок.__i18n]) || заголовок.__i18n;
    }
  }

  function загрузить(код){
    if(window.__I18N && window.__I18N[код]) return Promise.resolve(window.__I18N[код]);
    return new Promise((ok,fail)=>{
      const sc=document.createElement('script');
      sc.src=SRC[код]; sc.async=true;
      sc.onload=()=>ok(window.__I18N && window.__I18N[код]);
      sc.onerror=()=>fail(new Error('словарь не загрузился'));
      document.head.appendChild(sc);
    });
  }

  function отметить(код){
    box.querySelectorAll('button').forEach(b=>b.classList.toggle('on', b.dataset.l===код));
    document.documentElement.lang = code2lang(код);
  }
  function code2lang(к){ return к==='kz' ? 'kk' : (к==='en' ? 'en' : 'ru'); }

  box.addEventListener('click', async e=>{
    const b=e.target.closest('button'); if(!b||занят) return;
    const код=b.dataset.l; if(!код||код===текущий) return;
    занят=true;
    try{
      if(код==='ru'){ применить(null); текущий='ru'; отметить('ru'); }
      else{
        b.classList.add('loading');
        const словарь=await загрузить(код);
        if(!словарь) throw new Error('пустой словарь');
        применить(словарь); текущий=код; отметить(код);
      }
    }catch(err){
      // Перевод не подгрузился — молча остаёмся на русском. Ломать страницу из-за
      // словаря нельзя: человек пришёл читать про программу, а не менять язык.
      console.warn('Перевод не загрузился:', err.message);
      отметить(текущий);
    }finally{
      b.classList.remove('loading'); занят=false;
    }
  });
})();

// форма: при тарифе Self поле вакансии не нужно — её ищет сам участник
(()=>{const pl=$('n-plan'), vf=$('n-vac'); if(!pl||!vf) return;
  const box=vf.closest('.f');
  const sync=()=>{const self=/Self/i.test(pl.value); if(box) box.style.display=self?'none':''; if(self) vf.value='';};
  pl.addEventListener('change',sync); sync();
})();

$('lead').addEventListener('submit',e=>{
  e.preventDefault();
  const form=e.target, n=$('formnote');
  const val=id=>{const el=document.getElementById(id); return el?el.value.trim():'';};
  const warn=t=>{n.innerHTML=t; n.style.color='#FF4438';};
  const name=val('n-name'), age=val('n-age'), uni=val('n-uni');
  if(!name){ warn('Напишите имя — как к вам обращаться.'); return; }
  if(age && (+age<14||+age>60)){ warn('Проверьте возраст — кажется, в поле опечатка.'); return; }

  const plan=val('n-plan'), course=val('n-course');
  const isSelf=/Self/i.test(plan), noPlan=/не знаю/i.test(plan);
  const vac=isSelf?'':val('n-vac');
  const yrs=v=>{const n=+v,a=n%100,b=n%10;return n+' '+(a>=11&&a<=14?'лет':b===1?'год':b>=2&&b<=4?'года':'лет');};
  const study=[uni,course].filter(Boolean).join(', ');

  const txt='Здравствуйте! Хочу получить консультацию по Work and Travel USA, сезон 2027.'+
    '\n\n'+name+(age?', '+yrs(age):'')+
    (study?'\n'+study:'')+
    (plan&&!noPlan?'\nТариф: '+(isSelf?'Self':'Full'):'')+
    (vac?'\nВакансия: '+vac:'');
  window.open('https://wa.me/77714064549?text='+encodeURIComponent(txt),'_blank','noopener');
  if(window.ymGoal) window.ymGoal('lead');

  $('sentWho').textContent=name+', сообщение уже готово в WhatsApp — осталось нажать «Отправить». '+
    'Менеджер ответит в рабочее время: Пн–Пт 11:30–18:00.';
  const done=()=>{form.hidden=true;$('sent').hidden=false;};
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){done();return;}
  const fly=document.createElement('div');
  fly.className='flyover';
  fly.innerHTML='<div class="trail"></div><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M30 16c0 1.4-1.2 2.4-2.6 2.4H15.6l-8 8H4.4l4.2-8.6H0L-3.2 22h-2.6L-4.4 16-5.8 10h2.6L0 13.4h8.6L4.4 5.4h3.2l8 8h11.8C28.8 13.4 30 14.6 30 16z" fill="#FF4438"/></svg>';
  document.body.appendChild(fly);
  setTimeout(()=>fly.remove(),2200);
  form.classList.add('takeoff');
  setTimeout(done,760);
});

// ---------- анонс презентации: сам появляется и сам исчезает ----------
(()=>{
  // дата и время окончания показа: вечер 18 сентября 2026
  const EVENT_UNTIL = '2026-09-18T21:00:00';
  const box=$('evwrap'), tab=$('evtab'), btn=$('evBtn');
  if(!box) return;
  const end=new Date(EVENT_UNTIL);
  if(isNaN(end) || end<new Date()) return;          // прошло — не показываем вовсе
  if(btn){
    btn.href='https://wa.me/77714064549?text='+encodeURIComponent(
      'Здравствуйте! Хочу записаться на презентацию Work and Travel USA 18 сентября.');
    btn.addEventListener('click',()=>{ if(window.ymGoal) window.ymGoal('event'); });
  }
  box.hidden=false; box.classList.add('on');
  const strip=$('evstrip');
  if(strip){
    strip.hidden=false;
    document.body.classList.add('evstrip-on');
    strip.addEventListener('click',()=>{
      document.getElementById('event')?.scrollIntoView({behavior:'smooth',block:'center'});
    });
  }
  if(tab){
    tab.hidden=false;
    setTimeout(()=>tab.classList.add('on'), 1200);
    tab.addEventListener('click',()=>{
      document.getElementById('event')?.scrollIntoView({behavior:'smooth',block:'center'});
    });
    // прячем вкладку, когда сам блок на экране
    if('IntersectionObserver' in window){
      new IntersectionObserver(es=>{
        es.forEach(e=>tab.classList.toggle('on', !e.isIntersecting));
      },{threshold:.2}).observe(document.getElementById('event'));
    }
  }
})();

// ---------- «Отправить другу» ----------
(()=>{
  const msg='Смотри: Work and Travel USA — легально поработать лето в США и месяц попутешествовать. workandtravelus.kz';
  document.querySelectorAll('[data-share]').forEach(b=>b.addEventListener('click',()=>{
    if(window.ymGoal) window.ymGoal('share');
    if(navigator.share){ navigator.share({text:msg}).catch(()=>{}); return; }
    window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank','noopener');
  }));
})();
