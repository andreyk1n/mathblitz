
// ========== STATE ==========
const S = {
  mode:'add', digits:'1', time:60, ansType:'input',
  sound:true, beep:true, theme:'light',
  score:0, correct:0, wrong:0, combo:1,
  timer:null, timeLeft:0, totalTime:0,
  beeping:false, gameActive:false
};

// ========== AUDIO ==========
const AC = new (window.AudioContext||window.webkitAudioContext)();
function beep(freq=880,dur=.08,vol=.18){
  if(!S.sound) return;
  const o=AC.createOscillator(), g=AC.createGain();
  o.connect(g); g.connect(AC.destination);
  o.frequency.value=freq; g.gain.setValueAtTime(vol,AC.currentTime);
  g.gain.exponentialRampToValueAtTime(.001,AC.currentTime+dur);
  o.start(); o.stop(AC.currentTime+dur);
}
function correctSound(){beep(523,.12,.2);setTimeout(()=>beep(659,.12,.15),80)}
function wrongSound(){beep(180,.25,.3)}
function tickBeep(){beep(880,.05,.12)}

// ========== THEME ==========
const themeBtn=document.getElementById('btn-theme');
function applyTheme(t){
  S.theme=t; document.documentElement.setAttribute('data-theme',t);
  themeBtn.textContent=t==='dark'?'☀️':'🌙';
  themeBtn.setAttribute('aria-label',t==='dark'?'Увімкнути світлу тему':'Увімкнути темну тему');
  localStorage.setItem('mb-theme',t);
}
themeBtn.onclick=()=>applyTheme(S.theme==='dark'?'light':'dark');
applyTheme(localStorage.getItem('mb-theme')||'light');

// ========== SOUND BTN ==========
const soundBtn=document.getElementById('btn-sound');
function applySoundBtn(){
  soundBtn.textContent=S.sound?'🔔':'🔕';
  soundBtn.setAttribute('aria-label',S.sound?'Звук увімкнено':'Звук вимкнено');
  soundBtn.classList.toggle('active',!S.sound);
}
soundBtn.onclick=()=>{S.sound=!S.sound;applySoundBtn()};

// ========== PILL GROUPS ==========
function initPillGroup(id,key){
  document.getElementById(id).querySelectorAll('.pill').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.getElementById(id).querySelectorAll('.pill').forEach(b=>b.classList.remove('selected'));
      btn.classList.add('selected');
      S[key]=btn.dataset.val;
    });
  });
}
initPillGroup('mode-group','mode');
initPillGroup('digits-group','digits');
initPillGroup('time-group','time');
initPillGroup('anstype-group','ansType');

document.getElementById('beep-toggle').addEventListener('change',e=>{S.beep=e.target.checked});

// ========== SCREENS ==========
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('visible'));
  document.getElementById('screen-'+id).classList.add('visible');
}

// ========== MATH GEN ==========
function rnd(min,max){return Math.floor(Math.random()*(max-min+1))+min}
function getRange(){
  const d=S.digits==='hard'?rnd(1,3):parseInt(S.digits);
  const lo=Math.pow(10,d-1), hi=Math.pow(10,d)-1;
  return {lo,hi};
}
function genQuestion(){
  const ops=S.mode==='mix'?['+','-','×','÷']:[{add:'+',sub:'-',mul:'×',div:'÷'}[S.mode]];
  const op=ops[rnd(0,ops.length-1)];
  const {lo,hi}=getRange();
  let a,b,ans;
  if(op==='÷'){
    ans=rnd(Math.max(lo,1),Math.min(hi,12));
    b=rnd(1,12);
    a=ans*b;
  } else if(op==='×'){
    a=rnd(lo,Math.min(hi,12)); b=rnd(1,12);
    ans=a*b;
  } else if(op==='+'){
    a=rnd(lo,hi); b=rnd(lo,hi); ans=a+b;
  } else {
    a=rnd(lo,hi); b=rnd(lo,a); ans=a-b;
  }
  return {expr:`${a} ${op} ${b} =`,ans,op};
}

function genChoices(correct){
  const set=new Set([correct]);
  while(set.size<3){
    const d=rnd(1,Math.max(2,Math.abs(Math.round(correct*.3))||3));
    set.add(correct+(Math.random()<.5?d:-d));
  }
  return [...set].sort(()=>Math.random()-.5);
}

// ========== GAME ==========
let curQ=null;

function startGame(){
  S.score=0; S.correct=0; S.wrong=0; S.combo=1;
  S.timeLeft=S.time==='error'?9999:parseInt(S.time);
  S.totalTime=S.timeLeft; S.beeping=false; S.gameActive=true;
  updateStats(); show('game');
  nextQuestion();
  if(S.time!=='error') startTimer();
}

function startTimer(){
  clearInterval(S.timer);
  updateArc();
  S.timer=setInterval(()=>{
    S.timeLeft--;
    updateArc();
    if(S.beep && S.sound && S.timeLeft<=10 && S.timeLeft>0) tickBeep();
    if(S.timeLeft<=0){clearInterval(S.timer);endGame();}
  },1000);
}

function updateArc(){
  const circ=175.9;
  const ratio=S.time==='error'?0:S.timeLeft/S.totalTime;
  const offset=circ*(1-ratio);
  document.getElementById('arc-fill').style.strokeDashoffset=offset;
  document.getElementById('timer-label').textContent=
    S.time==='error'?'∞':S.timeLeft;
  const arc=document.getElementById('timer-arc');
  arc.classList.remove('warn','danger');
  if(S.time!=='error'){
    if(S.timeLeft<=10) arc.classList.add('danger');
    else if(S.timeLeft<=S.totalTime*.3) arc.classList.add('warn');
  }
}

function updateStats(){
  document.getElementById('stat-score').textContent=S.score;
  document.getElementById('stat-combo').textContent='×'+S.combo;
}

function nextQuestion(){
  curQ=genQuestion();
  document.getElementById('question-expr').textContent=curQ.expr;
  document.getElementById('progress-bar').style.width=
    S.time==='error'?'100%': (S.timeLeft/S.totalTime*100)+'%';
  renderAnswerArea();
}

function renderAnswerArea(){
  const area=document.getElementById('answer-area');
  if(S.ansType==='choice'){
    const choices=genChoices(curQ.ans);
    area.innerHTML=`<div class="choices">${choices.map(c=>`<button class="choice">${c}</button>`).join('')}</div>`;
    area.querySelectorAll('.choice').forEach(btn=>{
      btn.addEventListener('click',()=>{
        if(!S.gameActive) return;
        const val=parseInt(btn.textContent);
        submitAnswer(val,btn,area.querySelectorAll('.choice'));
      });
    });
  } else {
    area.innerHTML=`<div class="input-row">
      <input class="answer-input" id="ans-input" type="number" placeholder="?" autocomplete="off" autofocus aria-label="Відповідь">
      <button class="btn btn--primary" id="btn-ok" aria-label="Підтвердити">OK</button>
    </div>`;
    const inp=document.getElementById('ans-input');
    inp.focus();
    const submit=()=>{
      const v=parseInt(inp.value);
      if(isNaN(v)) return;
      submitAnswer(v,inp,null);
    };
    inp.addEventListener('keydown',e=>{if(e.key==='Enter') submit()});
    document.getElementById('btn-ok').addEventListener('click',submit);
  }
}

function submitAnswer(val,el,siblings){
  if(!S.gameActive) return;
  const ok=val===curQ.ans;
  if(ok){
    S.score+=10*S.combo; S.correct++; S.combo++;
    correctSound();
    if(S.ansType==='choice'){
      el.classList.add('correct');
    } else {
      el.classList.add('correct');
    }
    showFeedback('+'+10*Math.max(1,S.combo-1),'ok');
    setTimeout(()=>{updateStats();nextQuestion()},350);
  } else {
    S.wrong++; S.combo=1;
    wrongSound();
    if(S.ansType==='choice'){
      el.classList.add('wrong');
      if(siblings) siblings.forEach(b=>{if(parseInt(b.textContent)===curQ.ans) b.classList.add('correct')});
    } else {
      el.classList.add('wrong');
    }
    showFeedback('Неправильно','bad');
    if(S.time==='error'){
      setTimeout(()=>{clearInterval(S.timer);endGame()},700);
    } else {
      setTimeout(()=>{updateStats();nextQuestion()},700);
    }
    updateStats();
  }
}

function showFeedback(msg,cls){
  const fb=document.getElementById('feedback');
  fb.textContent=msg; fb.className='feedback show '+cls;
  clearTimeout(fb._t); fb._t=setTimeout(()=>fb.className='feedback',900);
}

function endGame(){
  S.gameActive=false; clearInterval(S.timer);
  const total=S.correct+S.wrong;
  const acc=total?Math.round(S.correct/total*100):0;
  document.getElementById('res-score').textContent=S.score;
  document.getElementById('res-correct').textContent=S.correct;
  document.getElementById('res-wrong').textContent=S.wrong;
  document.getElementById('res-accuracy').textContent=acc+'%';
  const ranks=[
    [90,'🏆','Блискуче!','Ти справжній математик!'],
    [70,'🥇','Чудово!','Відмінний результат!'],
    [50,'🥈','Непогано','Є куди рости!'],
    [0,'🥉','Продовжуй','Тренуйся щодня!'],
  ];
  const r=ranks.find(([t])=>acc>=t);
  document.getElementById('result-emoji').textContent=r[1];
  document.getElementById('result-title').textContent=r[2];
  document.getElementById('result-sub').textContent=r[3]+' · '+acc+'% точності';
  show('result');
}

// ========== BUTTONS ==========
document.getElementById('btn-start').addEventListener('click',()=>{
  if(AC.state==='suspended') AC.resume();
  startGame();
});
document.getElementById('btn-quit').addEventListener('click',()=>{
  clearInterval(S.timer); S.gameActive=false; endGame();
});
document.getElementById('btn-home').addEventListener('click',()=>show('home'));
document.getElementById('btn-retry').addEventListener('click',()=>startGame());
